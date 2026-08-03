import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { buildConsentUrl, driveRedirectUri } from "@/lib/googleDrive/oauth";

// Kicks off the Drive OAuth flow. The browser navigates here (a top-level GET,
// not a fetch), we set a short-lived CSRF `state` cookie, and 302 to Google's
// consent screen. The matching callback verifies the state and stores the token.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cookie name for the OAuth CSRF state. SameSite=Lax so it rides the top-level
// GET redirect back from accounts.google.com.
export const STATE_COOKIE = "gdrive_oauth_state";

export async function GET(request: NextRequest) {
  const { origin, protocol } = request.nextUrl;

  // Must be signed in to attach the connection to an agency.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const state = crypto.randomUUID();
  const url = buildConsentUrl(driveRedirectUri(origin), state);

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: protocol === "https:",
    path: "/",
    maxAge: 600, // 10 minutes to complete consent
  });
  return res;
}
