// Server-only Google Drive resource operations over fetch (no SDK). Imported
// only from server-side action handlers — the access token is passed in and
// never reaches the browser. Kept separate from oauth.ts, which owns the token
// lifecycle (connect/refresh/revoke); this file owns Drive files/folders.

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type CreateFolderResult =
  | { ok: true; id: string; webViewLink: string | null }
  | { ok: false; error: string };

// Create a Drive folder. Under the drive.file scope the app can only touch what
// it creates and cannot set an arbitrary parent it doesn't own, so the folder
// lands in the root of My Drive (a known, accepted constraint — no parent
// picker without the Google Picker API). Returns the new folder id + its
// shareable webViewLink.
export async function createDriveFolder(
  accessToken: string,
  name: string,
): Promise<CreateFolderResult> {
  try {
    const res = await fetch(`${DRIVE_FILES}?fields=id,webViewLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME }),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      // The access token was just minted, so this is a scope/permission issue,
      // not an expiry — point at reconnect rather than a bare status code.
      return {
        ok: false,
        error:
          "Google rejected the Drive request — reconnect Google Drive in Integrations.",
      };
    }
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      return {
        ok: false,
        error: `Google Drive couldn’t create the folder (HTTP ${res.status}${
          detail?.error?.message ? `: ${detail.error.message}` : ""
        }).`,
      };
    }

    const data = (await res.json()) as { id?: string; webViewLink?: string };
    if (!data.id) {
      return { ok: false, error: "Google Drive didn’t return a folder id." };
    }
    return { ok: true, id: data.id, webViewLink: data.webViewLink ?? null };
  } catch {
    return { ok: false, error: "Couldn’t reach Google Drive. Please try again." };
  }
}

export type UploadFileResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// Upload one file's bytes INTO a folder the app created (drive.file allows
// setting a parent we own). Uses a multipart/related upload so metadata + media
// go in one request. Returns the new file id.
export async function uploadFileToFolder(
  accessToken: string,
  folderId: string,
  name: string,
  mimeType: string,
  bytes: Buffer,
): Promise<UploadFileResult> {
  const boundary = `onboardly-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name, parents: [folderId] });
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const body = Buffer.concat([head, bytes, tail]);

  try {
    const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart&fields=id`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: "Google rejected the Drive upload — reconnect Google Drive in Integrations.",
      };
    }
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      return {
        ok: false,
        error: `Google Drive couldn’t store the file (HTTP ${res.status}${
          detail?.error?.message ? `: ${detail.error.message}` : ""
        }).`,
      };
    }

    const data = (await res.json()) as { id?: string };
    if (!data.id) return { ok: false, error: "Google Drive didn’t return a file id." };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, error: "Couldn’t reach Google Drive. Please try again." };
  }
}
