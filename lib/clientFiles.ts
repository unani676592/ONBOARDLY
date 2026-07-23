import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { displayFileName, type ClientFile } from "@/lib/uploads";

// Server-only: lists an agency's files for one client and mints signed download
// URLs. Imports next/headers (via supabaseServer), so NEVER import this from a
// client component.
//
// SECURITY MODEL: everything runs through the RLS-scoped anon server client
// (the signed-in agency's cookie session) — no service_role here. The
// `client-files` bucket is private with owner-scoped policies (folder[1] =
// auth.uid()), so:
//   - the clients row only resolves if the client belongs to this agency
//     (ownership check + source of the storage prefix), and
//   - storage list/sign only ever see objects under the caller's own uid.
// Files are stored by the intake route at `${user_id}/${client_id}/${object}`.

const BUCKET = "client-files";

// Signed URLs are minted when the drawer opens; an hour comfortably covers a
// browsing session without leaving links valid indefinitely.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ListClientFilesResult =
  | { ok: true; files: ClientFile[] }
  | { ok: false; status: 401 | 404 | 500 };

export async function listClientFiles(
  clientId: string,
): Promise<ListClientFilesResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  // RLS scopes this to the signed-in agency's own clients (policy:
  // user_id = auth.uid()), so a hit both confirms ownership and hands us the
  // storage prefix. We never trust a client-supplied user_id.
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) {
    console.error("listClientFiles client:", clientErr.message);
    return { ok: false, status: 500 };
  }
  if (!client) return { ok: false, status: 404 };

  const prefix = `${client.user_id}/${clientId}`;

  const { data: objects, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(prefix, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
  if (listErr) {
    console.error("listClientFiles list:", listErr.message);
    return { ok: false, status: 500 };
  }

  const files: ClientFile[] = [];
  for (const obj of objects ?? []) {
    // Supabase returns folder-placeholder rows with no id/metadata — skip them.
    if (!obj.id || !obj.metadata) continue;

    const path = `${prefix}/${obj.name}`;
    const display = displayFileName(obj.name);

    // `download` sets Content-Disposition: attachment with the friendly name,
    // so the browser saves it as e.g. "logo.png" rather than the prefixed
    // storage key.
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: display });
    if (signErr || !signed) {
      // Drop just this file rather than failing the whole list.
      console.error("listClientFiles sign:", signErr?.message);
      continue;
    }

    files.push({
      name: display,
      size: typeof obj.metadata.size === "number" ? obj.metadata.size : 0,
      uploadedAt: obj.created_at ?? obj.updated_at ?? "",
      url: signed.signedUrl,
    });
  }

  return { ok: true, files };
}
