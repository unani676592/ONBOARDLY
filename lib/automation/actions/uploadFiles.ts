import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { refreshAccessToken } from "@/lib/googleDrive/oauth";
import { uploadFileToFolder } from "@/lib/googleDrive/drive";
import { EXT_CONTENT_TYPE, displayFileName, fileExt } from "@/lib/uploads";
import type { ActionContext, ActionResult, WorkflowAction } from "@/lib/automation/types";

const BUCKET = "client-files";

// The "upload-files" action: copy the client's uploaded intake files into their
// Google Drive folder (created by the create-folder action on invite).
//
// This fires from the `files-uploaded` trigger, which happens on the PUBLIC
// intake route — there's NO agency session. So it resolves the owning agency
// from ctx.userId (set by runTriggerActions) and uses the service_role admin
// client, scoping EVERY query explicitly by user_id (RLS is bypassed). If ever
// wired under a session path (client-invited), it falls back to auth.getUser().
//
// Idempotent + resumable: it records each uploaded file's Drive id in
// client_drive_files and skips only files it has a recorded id for, so an edited
// re-upload (a new storage object) is uploaded, and a partial/interrupted batch
// resumes next fire instead of duplicating. Partial failure is reported as
// `failed` with counts — never a clean run.
export const uploadFilesAction: WorkflowAction = {
  id: "upload-files",
  async run({ clientId, userId }: ActionContext): Promise<ActionResult> {
    // Resolve the owning agency: session-less trigger path sets ctx.userId;
    // otherwise fall back to the signed-in agency.
    let agencyId = userId ?? null;
    if (!agencyId) {
      const server = await createSupabaseServerClient();
      const {
        data: { user },
      } = await server.auth.getUser();
      agencyId = user?.id ?? null;
    }
    if (!agencyId) return { status: "failed", reason: "No agency context for the upload." };

    // service_role — the trigger fires session-less, so we scope by user_id.
    const admin = createSupabaseAdminClient();

    const { data: conn } = await admin
      .from("google_drive_connections")
      .select("refresh_token")
      .eq("user_id", agencyId)
      .maybeSingle();
    if (!conn) return { status: "skipped", reason: "Google Drive not connected" };

    const { data: client } = await admin
      .from("clients")
      .select("drive_folder_id")
      .eq("id", clientId)
      .eq("user_id", agencyId)
      .maybeSingle();
    if (!client) return { status: "failed", reason: "Client not found." };
    if (!client.drive_folder_id) {
      // create-folder hasn't run for this client (not wired / not connected then).
      return { status: "skipped", reason: "No Drive folder for this client yet" };
    }
    const folderId = client.drive_folder_id;

    // The client's uploaded intake objects (path convention: {user}/{client}/…).
    const prefix = `${agencyId}/${clientId}`;
    const { data: objects, error: listErr } = await admin.storage
      .from(BUCKET)
      .list(prefix, { limit: 100, sortBy: { column: "created_at", order: "asc" } });
    if (listErr) return { status: "failed", reason: "Couldn’t list the client’s files." };
    const files = (objects ?? []).filter((o) => o.id && o.metadata);
    if (files.length === 0) return { status: "skipped", reason: "No files to upload yet" };

    // Which object paths are already in Drive (skip only these).
    const { data: existing } = await admin
      .from("client_drive_files")
      .select("object_path")
      .eq("user_id", agencyId)
      .eq("client_id", clientId);
    const done = new Set((existing ?? []).map((r) => r.object_path as string));
    const pending = files.filter((o) => !done.has(`${prefix}/${o.name}`));
    if (pending.length === 0) return { status: "skipped", reason: "All files already in Drive" };

    // Mint a Drive access token. invalid_grant → the same needs-attention state.
    const refreshed = await refreshAccessToken(conn.refresh_token);
    if (!refreshed.ok) {
      if (refreshed.kind === "invalid") {
        return {
          status: "failed",
          reason:
            "Google Drive authorization expired — reconnect Google Drive in Integrations to keep uploading files.",
        };
      }
      return {
        status: "failed",
        reason: "Couldn’t reach Google to authorize the Drive upload. Please try again.",
      };
    }

    let uploaded = 0;
    const failed: string[] = [];
    for (const obj of pending) {
      const objectPath = `${prefix}/${obj.name}`;
      const display = displayFileName(obj.name);
      const contentType = EXT_CONTENT_TYPE[fileExt(obj.name)] ?? "application/octet-stream";

      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(objectPath);
      if (dlErr || !blob) {
        failed.push(display);
        continue;
      }
      const bytes = Buffer.from(await blob.arrayBuffer());

      const up = await uploadFileToFolder(refreshed.accessToken, folderId, display, contentType, bytes);
      if (!up.ok) {
        failed.push(display);
        continue;
      }

      // Record BEFORE counting success — the recorded id is what makes the batch
      // resumable and non-duplicating. If we uploaded but couldn't record it, a
      // re-run would duplicate, so count it as a failure rather than over-report.
      const { error: recErr } = await admin.from("client_drive_files").insert({
        user_id: agencyId,
        client_id: clientId,
        object_path: objectPath,
        drive_file_id: up.id,
      });
      if (recErr) {
        console.error("upload-files record:", recErr.message);
        failed.push(display);
        continue;
      }
      uploaded += 1;
    }

    const total = pending.length;
    if (failed.length === 0) {
      return { status: "ran", detail: String(uploaded) };
    }
    // Partial or total failure → honest `failed` with counts + the files that
    // didn't make it (Change 1: a partial batch is never a clean run).
    return {
      status: "failed",
      reason: `Uploaded ${uploaded} of ${total} file(s) to Drive; ${failed.length} failed: ${failed.join(", ")}.`,
    };
  },
};
