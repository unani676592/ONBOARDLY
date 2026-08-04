import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revokeToken, type RevokeResult } from "@/lib/googleDrive/oauth";
import type { GoogleDriveConnectionStatus } from "@/lib/googleDrive/types";

// Per-agency Google Drive connection: status (GET) and disconnect (DELETE).
// (Connecting happens over the OAuth redirect in ./connect + ./callback.)
//
// The refresh token lives only in this table and is only touched server-side.
// No response ever includes it — the browser gets non-secret status only. RLS
// scopes every query to the signed-in agency (user_id = auth.uid()).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("google_drive_connections")
    .select("account_email, account_name, connected_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const status: GoogleDriveConnectionStatus = data
    ? {
        connected: true,
        accountEmail: data.account_email,
        accountName: data.account_name,
        connectedAt: data.connected_at,
      }
    : { connected: false };
  return NextResponse.json(status);
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  // Read the token first so we can revoke the grant at Google BEFORE deleting
  // our copy — a delete-then-revoke ordering would leave nothing to revoke.
  // Revoking hits only this (Drive) client id — login is a separate client.
  const { data: conn } = await supabase
    .from("google_drive_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();

  let revoke: RevokeResult | null = null;
  if (conn?.refresh_token) {
    revoke = await revokeToken(conn.refresh_token);
  }

  // Always clear our stored copy — we never keep a token we can't stand behind,
  // even when the revoke couldn't be confirmed.
  const { error } = await supabase
    .from("google_drive_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("google drive disconnect:", error.message);
    return NextResponse.json(
      { ok: false, error: "Couldn’t disconnect. Please try again." },
      { status: 500 },
    );
  }

  // Honest outcome: we never report a clean disconnect for an unverified revoke.
  // The row is gone locally, but if Google didn't confirm, the authorization may
  // still be live there — say so (the card points the user to remove it).
  if (revoke && !revoke.ok) {
    return NextResponse.json({
      ok: false,
      cleared: true,
      error:
        "Removed from Onboardly, but Google didn’t confirm the revoke — the authorization may still be live at Google.",
    });
  }
  return NextResponse.json({ ok: true });
}
