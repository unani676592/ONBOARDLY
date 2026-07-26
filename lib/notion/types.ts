// Client-safe Notion types. No server-only imports and — critically — never the
// access token: only the non-secret fields the browser is allowed to see.

export type NotionConnectionStatus = {
  connected: boolean;
  databaseId?: string;
  databaseTitle?: string | null;
  workspaceName?: string | null;
  connectedAt?: string;
};
