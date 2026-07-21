import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  EXT_CONTENT_TYPE,
  fileExt,
  safeObjectName,
  validateFile,
} from "@/lib/uploads";

// Server-only helpers for the public intake file-upload route. Imports the
// service_role admin client, so NEVER import this from a client component.
//
// SECURITY MODEL: the intake visitor has no account. The route validates the
// per-client token here (resolveUploadTarget) BEFORE any write, then stores
// each file under the step-1 path convention {user_id}/{client_id}/{filename}
// so the agency-owner RLS policies (folder[1] = auth.uid()) scope reads/deletes.

export const BUCKET = "client-files";

export type UploadTarget = { clientId: string; userId: string };

/**
 * Resolve an intake token to its owning agency + client ids. Returns null for
 * any unknown/invalid token so the caller can render a generic 404 with no
 * information leak. Uses the service_role client because the intake visitor is
 * anonymous and the clients table has no anon RLS policy.
 */
export async function resolveUploadTarget(
  token: string,
): Promise<UploadTarget | null> {
  if (!token || typeof token !== "string") return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("clients")
    .select("id, user_id")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    // Log the message only — never the token or any client data.
    console.error("resolveUploadTarget:", error.message);
    return null;
  }
  if (!data) return null;

  return { clientId: data.id, userId: data.user_id };
}

export type StoreResult = { name: string; ok: boolean; error?: string };

/**
 * Validate (authoritatively) and store one file for a resolved client. Never
 * throws — returns a per-file result so the caller can report partial failure.
 */
export async function storeClientFile(
  target: UploadTarget,
  file: File,
): Promise<StoreResult> {
  const displayName = file.name;

  // Re-validate on the server — the browser's checks are not trustworthy.
  const invalid = validateFile({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (invalid) return { name: displayName, ok: false, error: invalid };

  const safe = safeObjectName(file.name);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const path = `${target.userId}/${target.clientId}/${unique}`;
  // Content-Type from the validated extension, not the spoofable file.type.
  const contentType = EXT_CONTENT_TYPE[fileExt(safe)] ?? "application/octet-stream";

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType, upsert: false });

    if (error) {
      console.error("storeClientFile:", error.message);
      return { name: displayName, ok: false, error: "Upload failed." };
    }
    return { name: displayName, ok: true };
  } catch (err) {
    console.error("storeClientFile:", (err as Error).message);
    return { name: displayName, ok: false, error: "Upload failed." };
  }
}
