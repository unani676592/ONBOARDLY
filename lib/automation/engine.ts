import type { WorkflowRow } from "@/components/app/automations/workflow-persistence";
import type { Subtype } from "@/components/app/automations/workflow-data";
import { getAction } from "@/lib/automation/registry";
import { actionNodesForTrigger } from "@/lib/automation/reachability";
import { logActionRun } from "@/lib/automation/activityLog";
import type {
  ActionResult,
  EngineActionOutcome,
  EngineResult,
  WorkflowTriggerContext,
} from "@/lib/automation/types";

// Run a workflow for one triggering client.
//
// The engine is action-agnostic: it walks the action nodes reachable from the
// trigger that fired (ctx.trigger) — NOT every trigger in the workflow — so a
// `files-uploaded` branch never runs on a `client-invited` invite. For each, it
// asks the registry for a handler by the node's subtype. A registered action
// runs; an unregistered subtype (condition, delay, …) is skipped with reason
// "not implemented" — no error, no fake success. Actions run one at a time,
// inline (synchronous — no queue, no cron). Adding a new action never touches
// this function.
//
// Every executed action's outcome is logged to automation_runs (best-effort;
// logging never changes the action's real result). Draft/non-enabled workflows
// are gated here: they execute nothing and return ran: false — the same "only
// enabled workflows send" rule as before.
export async function runWorkflow(
  workflow: WorkflowRow,
  ctx: WorkflowTriggerContext,
): Promise<EngineResult> {
  if (workflow.status !== "enabled") {
    return { ran: false, actions: [] };
  }

  // Fetch the client's label once (RLS-scoped) so every logged row — including
  // skipped ones, which never touch an action — is attributed to a client.
  const { data: client } = await ctx.supabase
    .from("clients")
    .select("name, email")
    .eq("id", ctx.clientId)
    .maybeSingle();
  const clientName = client?.name ?? "";
  const clientEmail = client?.email ?? "";

  const actions: EngineActionOutcome[] = [];

  // Scope to the trigger that fired. In practice runWorkflow is only ever
  // called with "client-invited" (manual-resend bypasses the engine entirely;
  // files-uploaded goes through runTriggerActions), and if some other value
  // ever reached here no trigger node would match, so nothing would run — never
  // "run everything". The cast is safe: RunTrigger ∩ Subtype covers the real
  // trigger subtypes; "manual-resend" isn't a node subtype and yields no match.
  for (const node of actionNodesForTrigger(workflow, ctx.trigger as Subtype)) {
    const outcome: EngineActionOutcome = {
      nodeId: node.id,
      subtype: node.data.subtype,
      title: node.data.title,
      result: { status: "skipped", reason: "not implemented" },
    };

    const action = getAction(node.data.subtype);
    if (action) {
      outcome.result = await action.run({
        clientId: ctx.clientId,
        baseUrl: ctx.baseUrl,
        trigger: ctx.trigger,
        workflow,
        node,
      });
    }

    await logActionRun(ctx.supabase, {
      userId: ctx.userId,
      clientId: ctx.clientId,
      clientName,
      clientEmail,
      workflowId: workflow.id,
      actionSubtype: node.data.subtype,
      trigger: ctx.trigger,
      status: outcome.result.status,
      reason: reasonOf(outcome.result),
    });

    actions.push(outcome);
  }

  return { ran: true, actions };
}

// The reason to log for an outcome: the failure/skip reason, a self-correction
// note on a successful run (the `detail` message id isn't activity-worthy), or
// null. ActionResult's status union ("ran" | "failed" | "skipped") is exactly
// the log's vocabulary.
function reasonOf(result: ActionResult): string | null {
  return result.status === "ran" ? (result.note ?? null) : result.reason;
}
