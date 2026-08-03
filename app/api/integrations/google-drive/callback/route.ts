import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  driveRedirectUri,
  exchangeCode,
  fetchDriveUser,
} from "@/lib/googleDrive/oauth";
import { STATE_COOKIE } from "../connect/route";

// Google redirects the browser back here with `?code=` (or `?error=`) after the
// consent round-trip. We verify the CSRF state, exchange the code for a refresh
// token, do a real Drive check, store it server-side per agency, then forward
// back to Integrations. All error paths return a real, specific reason.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Redirect back to Integrations, clearing the state cookie. With no message =
  // success; with a message = a real failure the card will surface.
  const back = (errorMsg?: string) => {
    const url = new URL("/integrations", origin);
    if (errorMsg) url.searchParams.set("drive_error", errorMsg);
    else url.searchParams.set("drive", "connected");
    const res = NextResponse.redirect(url);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  // User declined, or Google returned an error on the consent screen.
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return back(
      oauthError === "access_denied"
        ? "You cancelled Google Drive access. Nothing was connected."
        : "Google returned an error during consent. Please try again.",
    );
  }

  // Verify the CSRF state before trusting the code.
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return back(
      "Couldn’t verify the Google sign-in (session/state mismatch). Please try connecting again.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Session was lost mid-flow — send to login rather than a Drive error.
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Exchange the code (must use the same redirect URI that started the flow).
  const exchanged = await exchangeCode(code, driveRedirectUri(origin));
  if (!exchanged.ok) return back(exchanged.error);
  if (!exchanged.refreshToken) {
    // With prompt=consent this shouldn't happen; be honest if it ever does.
    return back(
      "Google didn’t return a refresh token. In your Google Account → Security → Third-party access, remove Onboardly, then reconnect.",
    );
  }

  // Lightweight real check: prove the token reaches Drive and read the account.
  const who = await fetchDriveUser(exchanged.accessToken);
  if (!who.ok) return back(who.error);

  const now = new Date().toISOString();
  const { error } = await supabase.from("google_drive_connections").upsert(
    {
      user_id: user.id,
      refresh_token: exchanged.refreshToken,
      account_email: who.email,
      account_name: who.name,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("google drive connect save:", error.message);
    return back("Couldn’t save the connection. Please try again.");
  }

  return back(); // success
}
