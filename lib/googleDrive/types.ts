// Client-safe Google Drive types. No server-only imports and — critically —
// never the refresh token: only the non-secret fields the browser may see.

export type GoogleDriveConnectionStatus = {
  connected: boolean;
  // The Google account the folders will be created under (display only).
  accountEmail?: string | null;
  accountName?: string | null;
  connectedAt?: string;
  // Set when a stored connection was re-verified and is currently failing
  // (Google expires refresh tokens ~weekly while the app is in testing, or the
  // user revoked access). `connected` stays true (a row exists), but this
  // carries the specific reason so the UI can tell the truth.
  problem?: string | null;
};
