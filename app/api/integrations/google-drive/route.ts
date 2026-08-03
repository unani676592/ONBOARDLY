import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { revokeToken } from "@/lib/googleDrive/oauth";
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

  // Read the token first so we can revoke the grant at Google before deleting
  // our copy. Revoking hits only this (Drive) client id — login is untouched.
  const { data: conn } = await supabase
    .from("google_drive_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (conn?.refresh_token) {
    await revokeToken(conn.refresh_token);
  }

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
  return NextResponse.json({ ok: true });
}
