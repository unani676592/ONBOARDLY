import type {
  PersistedNode,
  WorkflowRow,
} from "@/components/app/automations/workflow-persistence";
import { getAction } from "@/lib/automation/registry";
import { logActionRun } from "@/lib/automation/activityLog";
import type {
  ActionResult,
  EngineActionOutcome,
  EngineResult,
  WorkflowTriggerContext,
} from "@/lib/automation/types";

// Order the action nodes the way the workflow runs them: breadth-first from the
// trigger(s), following edge direction. This visits nodes in execution order for
// a linear chain and, more generally, only includes action nodes actually
// reachable from a trigger — a disconnected/orphan action never runs. Triggers
// themselves aren't actions, so they're walked through but not emitted.
function orderedActionNodes(workflow: WorkflowRow): PersistedNode[] {
  const byId = new Map(workflow.nodes.map((n) => [n.id, n]));

  const outgoing = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }

  const triggerIds = workflow.nodes
    .filter((n) => n.data.kind === "trigger")
    .map((n) => n.id);

  const visited = new Set<string>(triggerIds);
  const queue = [...triggerIds];
  const ordered: PersistedNode[] = [];

  while (queue.length) {
    const id = queue.shift()!;
    for (const nextId of outgoing.get(id) ?? []) {
      if (visited.has(nextId)) continue;
      visited.add(nextId);
      const node = byId.get(nextId);
      if (!node) continue;
      if (node.data.kind === "action") ordered.push(node);
      queue.push(nextId);
    }
  }

  return ordered;
}

// Run a workflow for one triggering client.
//
// The engine is action-agnostic: it walks the reachable action nodes in order
// and, for each, asks the registry for a handler by the node's subtype. A
// registered action runs; an unregistered subtype (create-folder, add-crm-record,
// condition, delay, …) is skipped with reason "not implemented" — no error, no
// fake success. Actions run one at a time, inline (synchronous — no queue, no
// cron). Adding a new action never touches this function.
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

  for (const node of orderedActionNodes(workflow)) {
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

// The reason to log for an outcome: the failure/skip reason, or null for a plain
// successful run (the `detail` message id isn't activity-worthy). ActionResult's
// status union ("ran" | "failed" | "skipped") is exactly the log's vocabulary.
function reasonOf(result: ActionResult): string | null {
  return result.status === "ran" ? null : result.reason;
}
