// Server-only helpers for talking to the Notion REST API over fetch (no SDK, no
// new dependency). Only ever imported from server route handlers — the token
// never touches the browser.

const NOTION_BASE = "https://api.notion.com";
// Pinned stable API version. Notion requires this header on every request.
const NOTION_VERSION = "2022-06-28";

function notionFetch(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${NOTION_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

// Pull a database id out of whatever the user pasted: a raw id (dashed or not)
// or a full Notion URL. Notion ids are 32 hex chars; dashes are cosmetic. A
// database URL is `…/<slug>-<32hex>?v=<32hex>` — stripping dashes and taking the
// first 32-hex run yields the database id (the `?v=` view id comes later).
export function parseDatabaseId(input: string): string | null {
  const match = input.replace(/-/g, "").match(/[0-9a-fA-F]{32}/);
  return match ? match[0].toLowerCase() : null;
}

function plainTitle(title: unknown): string {
  if (!Array.isArray(title)) return "";
  return title
    .map((t) => (t && typeof t.plain_text === "string" ? t.plain_text : ""))
    .join("")
    .trim();
}

// One Notion database property from the schema (properties keyed by name; each
// value repeats its name + type).
type NotionProp = { name: string; type: string };

export type CreateRecordResult =
  | { ok: true; pageId: string }
  | { ok: false; error: string };

// Create one row in the agency's Notion database from a client's details.
//
// Maps by property TYPE (names vary between databases): title ← name, first
// email/select|status/date property ← email/status/invited. Retrieving the
// schema first doubles as a live token + shared-database check. If the database
// can't hold a field, we fail with a specific message rather than dropping it.
export async function createClientRecord(
  token: string,
  databaseId: string,
  record: { name: string; email: string; statusLabel: string; invitedAt: string },
): Promise<CreateRecordResult> {
  let props: Record<string, NotionProp>;
  try {
    const dbRes = await notionFetch(token, `/v1/databases/${databaseId}`);
    if (dbRes.status === 401) {
      return {
        ok: false,
        error: "Notion rejected the saved token — reconnect Notion in Integrations.",
      };
    }
    if (dbRes.status === 404) {
      return {
        ok: false,
        error:
          "Notion can’t open the saved database — make sure it’s still shared with your integration.",
      };
    }
    if (!dbRes.ok) {
      return { ok: false, error: `Notion couldn’t read the database (HTTP ${dbRes.status}).` };
    }
    const db = (await dbRes.json()) as { properties?: Record<string, NotionProp> };
    props = db.properties ?? {};
  } catch {
    return { ok: false, error: "Couldn’t reach Notion. Please try again." };
  }

  const list = Object.values(props);
  const titleProp = list.find((p) => p.type === "title");
  const emailProp = list.find((p) => p.type === "email");
  const statusProp = list.find((p) => p.type === "select" || p.type === "status");
  const dateProp = list.find((p) => p.type === "date");

  if (!titleProp) {
    return {
      ok: false,
      error: "Your Notion database has no title column to hold the client name.",
    };
  }

  // Don't silently drop fields the database can't store — say what's missing.
  const missing: string[] = [];
  if (!emailProp) missing.push("an Email property");
  if (!statusProp) missing.push("a Status (Select) property");
  if (!dateProp) missing.push("a Date property");
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Your Notion database is missing ${missing.join(", ")}. Add ${
        missing.length > 1 ? "them" : "it"
      } and try again.`,
    };
  }

  const properties: Record<string, unknown> = {
    [titleProp.name]: { title: [{ text: { content: record.name || "Unnamed client" } }] },
    [emailProp!.name]: { email: record.email || null },
    [dateProp!.name]: { date: { start: record.invitedAt } },
    [statusProp!.name]:
      statusProp!.type === "status"
        ? { status: { name: record.statusLabel } }
        : { select: { name: record.statusLabel } },
  };

  try {
    const res = await notionFetch(token, "/v1/pages", {
      method: "POST",
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      return {
        ok: false,
        error: err?.message
          ? `Notion: ${err.message}`
          : `Notion couldn’t create the record (HTTP ${res.status}).`,
      };
    }
    const page = (await res.json()) as { id?: string };
    return { ok: true, pageId: page.id ?? "" };
  } catch {
    return { ok: false, error: "Couldn’t reach Notion. Please try again." };
  }
}

// Re-verify a stored connection's liveness (used to keep the Integrations page
// truthful — a revoked token or un-shared database shouldn't keep reading as
// "Connected"). Distinguishes a definitive credential/permission failure from a
// transient network blip so we never cry wolf on an unreachable Notion.
export type ConnectionCheck =
  | { state: "ok" }
  | { state: "invalid"; reason: string }
  | { state: "unreachable" };

export async function checkConnection(
  token: string,
  databaseId: string,
): Promise<ConnectionCheck> {
  try {
    const res = await notionFetch(token, `/v1/databases/${databaseId}`);
    if (res.ok) return { state: "ok" };
    if (res.status === 401) {
      return {
        state: "invalid",
        reason:
          "Notion no longer accepts the saved token — reconnect to keep writing client records.",
      };
    }
    if (res.status === 404) {
      return {
        state: "invalid",
        reason:
          "The saved database is no longer shared with your integration — re-share it or reconnect.",
      };
    }
    // Unexpected status — treat as transient, don't flag the connection broken.
    return { state: "unreachable" };
  } catch {
    return { state: "unreachable" };
  }
}

export type NotionValidation =
  | { ok: true; databaseTitle: string; workspaceName: string | null }
  | { ok: false; error: string };

// Confirm the token works AND the database is reachable/shared with it. Returns
// a real, specific error for the two common failure modes (bad token, database
// not shared) so the UI can surface the truth.
export async function validateNotion(
  token: string,
  databaseId: string,
): Promise<NotionValidation> {
  // 1) Token check (and grab the workspace name for display).
  let workspaceName: string | null = null;
  try {
    const meRes = await notionFetch(token, "/v1/users/me");
    if (meRes.status === 401) {
      return {
        ok: false,
        error:
          "That integration token isn’t valid. Copy the Internal Integration Secret from your Notion integration and try again.",
      };
    }
    if (!meRes.ok) {
      return { ok: false, error: `Notion rejected the token (HTTP ${meRes.status}).` };
    }
    const me = (await meRes.json()) as { bot?: { workspace_name?: string } };
    workspaceName = me?.bot?.workspace_name ?? null;
  } catch {
    return {
      ok: false,
      error: "Couldn’t reach Notion. Check your connection and try again.",
    };
  }

  // 2) Database check — the token must be able to open this specific database.
  try {
    const dbRes = await notionFetch(token, `/v1/databases/${databaseId}`);
    if (dbRes.status === 404) {
      return {
        ok: false,
        error:
          "That database wasn’t found. In Notion, open the database → ••• → Connections, add your integration, then try again.",
      };
    }
    if (dbRes.status === 400) {
      return { ok: false, error: "That doesn’t look like a valid Notion database ID." };
    }
    if (!dbRes.ok) {
      return {
        ok: false,
        error: `Notion couldn’t open that database (HTTP ${dbRes.status}).`,
      };
    }
    const db = (await dbRes.json()) as { title?: unknown };
    return {
      ok: true,
      databaseTitle: plainTitle(db?.title) || "Untitled database",
      workspaceName,
    };
  } catch {
    return {
      ok: false,
      error: "Couldn’t reach Notion. Check your connection and try again.",
    };
  }
}
