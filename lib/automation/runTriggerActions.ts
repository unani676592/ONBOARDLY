import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkflowRow } from "@/components/app/automations/workflow-persistence";
import type { RunTrigger } from "@/lib/automationRuns";
import { getAction } from "@/lib/automation/registry";
import { actionNodesForTrigger } from "@/lib/automation/reachability";
import { finishActionRun, startActionRun } from "@/lib/automation/activityLog";
import type { ActionResult } from "@/lib/automation/types";

// Trigger-scoped action runner — a SEPARATE caller from the engine's
// runWorkflow, which it never touches.
//
// runWorkflow walks every action reachable from ANY trigger (it's only invoked
// on the invite path). This runs only the actions reachable from ONE specific
// trigger subtype (e.g. "files-uploaded"), so an event fires exactly its own
// downstream actions and nothing else. It's used for events that happen with no
// agency session (the public intake route), so it takes an explicit
// service_role client + the owning agency's userId, and every DB op the actions
// do is scoped by that userId.
//
// Each action gets a `running` row up front and a terminal update on completion
// (write-then-update) so a killed request leaves a visible in-progress row.

// Currently only the files-uploaded trigger is wired here.
type SupportedTrigger = Extract<RunTrigger, "files-uploaded">;

type TriggerCtx = {
  clientId: string;
  userId: string;
  baseUrl: string;
};

// Same rule the engine uses: a successful run's note (or null) or the skip/fail
// reason.
function reasonOf(result: ActionResult): string | null {
  return result.status === "ran" ? (result.note ?? null) : result.reason;
}

export async function runTriggerActions(
  admin: SupabaseClient,
  workflow: WorkflowRow,
  trigger: SupportedTrigger,
  ctx: TriggerCtx,
): Promise<void> {
  // Same gate as the engine: only enabled workflows run anything.
  if (workflow.status !== "enabled") return;

  const nodes = actionNodesForTrigger(workflow, trigger);
  if (nodes.length === 0) return;

  // Client label for the run rows (scoped explicitly by user_id — RLS bypassed).
  const { data: client } = await admin
    .from("clients")
    .select("name, email")
    .eq("id", ctx.clientId)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  const clientName = (client?.name as string) ?? "";
  const clientEmail = (client?.email as string) ?? "";

  for (const node of nodes) {
    // Write the in-progress row up front; a killed request leaves it visible.
    const runId = await startActionRun(admin, {
      userId: ctx.userId,
      clientId: ctx.clientId,
      clientName,
      clientEmail,
      workflowId: workflow.id,
      actionSubtype: node.data.subtype,
      trigger,
    });

    const action = getAction(node.data.subtype);
    const result: ActionResult = action
      ? await action.run({
          clientId: ctx.clientId,
          baseUrl: ctx.baseUrl,
          trigger,
          workflow,
          node,
          userId: ctx.userId,
        })
      : { status: "skipped", reason: "not implemented" };

    if (runId) await finishActionRun(admin, runId, result.status, reasonOf(result));
  }
}
