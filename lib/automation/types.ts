// Automation execution engine — shared types.
//
// Server-side only in practice, but this file has no runtime imports: the
// workflow shapes below are pulled in as `import type` (fully erased at build),
// so nothing here drags the canvas' client-only deps (@xyflow/react, lucide)
// into the server bundle.

import type { RunTrigger } from "@/lib/automationRuns";
import type { SupabaseServerClient } from "@/lib/supabaseServer";
import type { Subtype } from "@/components/app/automations/workflow-data";
import type {
  PersistedNode,
  WorkflowRow,
} from "@/components/app/automations/workflow-persistence";

// The outcome of a single action. Honest by construction: an action either
// ran, was deliberately skipped (with a reason), or failed (with a reason).
// There is no silent/fake success — "ran" is only returned when work happened.
export type ActionResult =
  // `note` records a self-correction on an otherwise successful run (e.g. an
  // invite whose template was missing the magic link, appended automatically).
  // It's logged as the run's reason so the activity log tells the whole truth.
  | { status: "ran"; detail?: string; note?: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

// Everything an action needs to do its work: the triggering client plus the
// workflow/node context it belongs to. Settings live on `node.data.settings`.
export type ActionContext = {
  clientId: string;
  baseUrl: string;
  trigger: RunTrigger;
  workflow: WorkflowRow;
  node: PersistedNode;
  // Set only by the session-less trigger caller (runTriggerActions), where
  // there's no agency session to derive the owner from. runWorkflow (engine
  // core) never sets it — its actions read the owner via auth.getUser(). An
  // action that can run session-less (upload-files) uses this to scope by
  // user_id explicitly under service_role.
  userId?: string;
};

// The one interface every action implements. `id` matches the node subtype the
// action handles, so the engine can find it by the node it's executing.
export interface WorkflowAction {
  id: Subtype;
  run(ctx: ActionContext): Promise<ActionResult>;
}

// One executed action node, paired with its outcome. Ordered by the engine.
export type EngineActionOutcome = {
  nodeId: string;
  subtype: Subtype;
  title: string;
  result: ActionResult;
};

// The result of running a whole workflow.
//   ran: false  → the workflow was gated (not enabled) and nothing executed.
//   ran: true   → each reachable action node was run/skipped, in `actions`.
export type EngineResult = {
  ran: boolean;
  actions: EngineActionOutcome[];
};

// The trigger-time context the engine is called with (before it knows which
// node it's about to run). Carries the RLS-scoped server client + owner id so
// the engine can log each action's outcome.
export type WorkflowTriggerContext = {
  clientId: string;
  baseUrl: string;
  trigger: RunTrigger;
  userId: string;
  supabase: SupabaseServerClient;
};
