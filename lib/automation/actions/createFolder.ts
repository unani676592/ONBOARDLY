import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { refreshAccessToken } from "@/lib/googleDrive/oauth";
import { createDriveFolder } from "@/lib/googleDrive/drive";
import type { ActionContext, ActionResult, WorkflowAction } from "@/lib/automation/types";

// The "create-folder" action: create a Google Drive folder for the triggering
// client, using the agency's stored per-agency refresh token.
//
// Self-contained like the Notion action: it opens its own RLS-scoped server
// client, reads the stored Drive credential (server-side only — never sent to
// the browser), refreshes a short-lived access token, and creates the folder.
//
// Honest by construction:
//   - Drive not connected            → skipped, real reason (like Notion).
//   - Client already has a folder     → skipped (idempotent — no duplicate).
//   - Refresh token expired/revoked   → failed with the SAME "needs attention"
//                                       cause the Integrations page surfaces.
//   - Real Drive failure              → failed with the real reason.
// A failure here never blocks the invite — the engine logs it and moves on.
export const createFolderAction: WorkflowAction = {
  id: "create-folder",
  async run({ clientId }: ActionContext): Promise<ActionResult> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "failed", reason: "Not signed in." };

    // This agency's Drive credential (RLS-scoped). No row → not connected.
    const { data: conn } = await supabase
      .from("google_drive_connections")
      .select("refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conn) return { status: "skipped", reason: "Google Drive not connected" };

    // The client's name + any folder already recorded against them.
    const { data: client, error } = await supabase
      .from("clients")
      .select("name, drive_folder_id")
      .eq("id", clientId)
      .maybeSingle();
    if (error) return { status: "failed", reason: "Couldn’t load the client." };
    if (!client) return { status: "failed", reason: "Client not found." };

    // Idempotent: never create a second folder for a client that already has one.
    if (client.drive_folder_id) {
      return { status: "skipped", reason: "Folder already exists for this client" };
    }

    // Mint an access token. invalid_grant → the same "needs attention" state
    // step 1 built (Google drops Drive access ~weekly in testing, or it was
    // revoked) — a specific, actionable reason, not a generic failure.
    const refreshed = await refreshAccessToken(conn.refresh_token);
    if (!refreshed.ok) {
      if (refreshed.kind === "invalid") {
        return {
          status: "failed",
          reason:
            "Google Drive authorization expired — reconnect Google Drive in Integrations to keep creating folders.",
        };
      }
      return {
        status: "failed",
        reason: "Couldn’t reach Google to authorize the Drive request. Please try again.",
      };
    }

    // drive.file → the folder lands in the root of My Drive (known constraint).
    const folderName = client.name?.trim() || "Client";
    const result = await createDriveFolder(refreshed.accessToken, folderName);
    if (!result.ok) return { status: "failed", reason: result.error };

    // Persist the folder against the client so the drawer can link to it and a
    // re-invite skips instead of duplicating.
    const url =
      result.webViewLink ?? `https://drive.google.com/drive/folders/${result.id}`;
    // Verify the write with .select(): a DB error OR a zero-row update (nothing
    // written — e.g. the row vanished, or RLS matched nothing) both mean the
    // link wasn't saved. `.update()` alone returns no error on a 0-row match, so
    // without this the action would log a clean "Ran" for an unverified write.
    const { data: saved, error: saveErr } = await supabase
      .from("clients")
      .update({ drive_folder_id: result.id, drive_folder_url: url })
      .eq("id", clientId)
      .select("id")
      .maybeSingle();

    if (saveErr || !saved) {
      // The folder exists in Drive, but we couldn't record it. Don't claim a
      // clean run — say what happened (a re-invite could then duplicate it).
      if (saveErr) console.error("create-folder save:", saveErr.message);
      return {
        status: "ran",
        detail: result.id,
        note: "Folder created in Drive, but its link couldn’t be saved to the client.",
      };
    }

    return { status: "ran", detail: result.id };
  },
};
