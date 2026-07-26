import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { parseDatabaseId, validateNotion } from "@/lib/notion/api";
import type { NotionConnectionStatus } from "@/lib/notion/types";

// Per-agency Notion connection: status (GET), connect (POST), disconnect (DELETE).
//
// The access token lives only in this table and is only touched here, server-
// side. No response ever includes it — the browser gets non-secret status only.
// RLS scopes every query to the signed-in agency (user_id = auth.uid()).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape the browser-safe status from a row (never selects/returns access_token).
function statusOf(row: {
  database_id: string;
  database_title: string | null;
  workspace_name: string | null;
  connected_at: string;
} | null): NotionConnectionStatus {
  if (!row) return { connected: false };
  return {
    connected: true,
    databaseId: row.database_id,
    databaseTitle: row.database_title,
    workspaceName: row.workspace_name,
    connectedAt: row.connected_at,
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("notion_connections")
    .select("database_id, database_title, workspace_name, connected_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(statusOf(data));
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const token = String((body as { token?: unknown })?.token ?? "").trim();
  const rawDatabase = String((body as { database?: unknown })?.database ?? "").trim();

  if (!token) {
    return NextResponse.json({ ok: false, error: "Paste your integration token." });
  }
  if (!rawDatabase) {
    return NextResponse.json({ ok: false, error: "Enter the database ID or URL." });
  }

  const databaseId = parseDatabaseId(rawDatabase);
  if (!databaseId) {
    return NextResponse.json({
      ok: false,
      error: "That doesn’t look like a Notion database ID or URL.",
    });
  }

  // Validate against the real Notion API before storing anything.
  const result = await validateNotion(token, databaseId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("notion_connections").upsert(
    {
      user_id: user.id,
      access_token: token,
      database_id: databaseId,
      database_title: result.databaseTitle,
      workspace_name: result.workspaceName,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("notion connect save:", error.message);
    return NextResponse.json(
      { ok: false, error: "Couldn’t save the connection. Please try again." },
      { status: 500 },
    );
  }

  const connection: NotionConnectionStatus = {
    connected: true,
    databaseId,
    databaseTitle: result.databaseTitle,
    workspaceName: result.workspaceName,
    connectedAt: now,
  };
  return NextResponse.json({ ok: true, connection });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const { error } = await supabase
    .from("notion_connections")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("notion disconnect:", error.message);
    return NextResponse.json(
      { ok: false, error: "Couldn’t disconnect. Please try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
