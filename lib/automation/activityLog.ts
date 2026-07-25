import type { SupabaseServerClient } from "@/lib/supabaseServer";
import type { RunTrigger } from "@/lib/automationRuns";

// Server-only: record one action's outcome to public.automation_runs.
//
// Shared by the engine (per-action logging) and the manual-resend route (which
// sends outside the engine). Best-effort — a logging failure is swallowed and
// never changes the real action outcome the caller reports. RLS scopes the
// insert to the owning agency via user_id.
export type ActionLogStatus = "ran" | "failed" | "skipped";

export type ActionLogInput = {
  userId: string;
  clientId: string | null;
  clientName: string;
  clientEmail: string;
  workflowId: string | null;
  actionSubtype: string;
  trigger: RunTrigger;
  status: ActionLogStatus;
  reason: string | null;
};

export async function logActionRun(
  supabase: SupabaseServerClient,
  input: ActionLogInput,
): Promise<void> {
  const { error } = await supabase.from("automation_runs").insert({
    user_id: input.userId,
    client_id: input.clientId,
    client_name: input.clientName,
    client_email: input.clientEmail,
    workflow_id: input.workflowId,
    action_subtype: input.actionSubtype,
    trigger: input.trigger,
    status: input.status,
    error: input.reason,
  });
  if (error) console.error("logActionRun:", error.message);
}
