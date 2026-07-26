// Client-safe Notion types. No server-only imports and — critically — never the
// access token: only the non-secret fields the browser is allowed to see.

export type NotionConnectionStatus = {
  connected: boolean;
  databaseId?: string;
  databaseTitle?: string | null;
  workspaceName?: string | null;
  connectedAt?: string;
  // Set when a stored connection was re-verified and is currently failing (e.g.
  // token revoked, database un-shared). `connected` stays true (a row exists),
  // but this carries the specific reason so the UI can tell the truth.
  problem?: string | null;
};
