import type { SupabaseClient } from "@supabase/supabase-js";
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

// Write-then-update logging for long actions (Drive uploads). `startActionRun`
// inserts a `running` row up front and returns its id; `finishActionRun` sets
// the terminal outcome. A killed request between them leaves a visible
// in-progress row rather than nothing. Best-effort — a logging failure never
// changes the real action outcome. Accepts any Supabase client so the
// session-less caller can pass a service_role client (scoped explicitly).
export type StartRunInput = Omit<ActionLogInput, "status" | "reason">;

export async function startActionRun(
  supabase: SupabaseClient,
  input: StartRunInput,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("automation_runs")
    .insert({
      user_id: input.userId,
      client_id: input.clientId,
      client_name: input.clientName,
      client_email: input.clientEmail,
      workflow_id: input.workflowId,
      action_subtype: input.actionSubtype,
      trigger: input.trigger,
      status: "running",
      error: null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("startActionRun:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}

export async function finishActionRun(
  supabase: SupabaseClient,
  runId: string,
  status: ActionLogStatus,
  reason: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("automation_runs")
    .update({ status, error: reason })
    .eq("id", runId);
  if (error) console.error("finishActionRun:", error.message);
}
