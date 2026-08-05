import type {
  PersistedNode,
  WorkflowRow,
} from "@/components/app/automations/workflow-persistence";
import type { Subtype } from "@/components/app/automations/workflow-data";

// The action nodes reachable from the trigger node(s) of ONE subtype, in
// breadth-first run order. The single source of truth for "which actions run
// for this trigger" — shared by the engine (runWorkflow, the invite path) and
// the trigger-scoped caller (runTriggerActions, the files-uploaded path) so the
// two can never drift.
//
// Only trigger nodes whose subtype === `trigger` seed the walk, so a workflow
// with multiple triggers runs only the branch of the trigger that actually
// fired — a `files-uploaded` action never runs on `client-invited`, and vice
// versa. Actions are emitted in visit order; triggers are walked through but
// never emitted; an action not reachable from this trigger never runs.
export function actionNodesForTrigger(
  workflow: WorkflowRow,
  trigger: Subtype,
): PersistedNode[] {
  const byId = new Map(workflow.nodes.map((n) => [n.id, n]));

  const outgoing = new Map<string, string[]>();
  for (const edge of workflow.edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }

  // Seed ONLY from trigger nodes matching the fired trigger subtype.
  const startIds = workflow.nodes
    .filter((n) => n.data.kind === "trigger" && n.data.subtype === trigger)
    .map((n) => n.id);

  const visited = new Set<string>(startIds);
  const queue = [...startIds];
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
