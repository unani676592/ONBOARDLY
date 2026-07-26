import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createClientRecord } from "@/lib/notion/api";
import type { ActionContext, ActionResult, WorkflowAction } from "@/lib/automation/types";

// Human labels for the client's lifecycle status, written into Notion.
const STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  form_completed: "Form completed",
  files_pending: "Files pending",
  onboarded: "Onboarded",
};

// The "add-crm-record" action: create a row in the agency's connected Notion
// database for the triggering client.
//
// Self-contained like the email action: it opens its own RLS-scoped server
// client, reads the stored Notion credential (server-side only — never sent to
// the browser), and writes via the Notion API. If Notion isn't connected it
// skips honestly; real Notion failures surface their real reason.
export const addToNotionAction: WorkflowAction = {
  id: "add-crm-record",
  async run({ clientId }: ActionContext): Promise<ActionResult> {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: "failed", reason: "Not signed in." };

    // Read this agency's Notion credential + target database (RLS-scoped).
    const { data: conn } = await supabase
      .from("notion_connections")
      .select("access_token, database_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!conn) return { status: "skipped", reason: "Notion not connected" };

    // Load the client's details to write.
    const { data: client, error } = await supabase
      .from("clients")
      .select("name, email, status, created_at")
      .eq("id", clientId)
      .maybeSingle();
    if (error) return { status: "failed", reason: "Couldn’t load the client." };
    if (!client) return { status: "failed", reason: "Client not found." };

    const result = await createClientRecord(conn.access_token, conn.database_id, {
      name: client.name ?? "",
      email: client.email ?? "",
      statusLabel: STATUS_LABELS[client.status] ?? client.status,
      invitedAt: client.created_at,
    });

    if (!result.ok) return { status: "failed", reason: result.error };
    return { status: "ran", detail: result.pageId };
  },
};
