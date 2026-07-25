// Automation execution engine — public entry point.
//
// Callers (the invite path today, more triggers later) import the engine from
// here. Actions register themselves via the registry, which the engine pulls in;
// importing this module wires everything up.
export { runWorkflow } from "@/lib/automation/engine";
export type {
  ActionContext,
  ActionResult,
  EngineActionOutcome,
  EngineResult,
  WorkflowAction,
  WorkflowTriggerContext,
} from "@/lib/automation/types";
