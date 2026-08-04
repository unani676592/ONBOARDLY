import type { Subtype } from "@/components/app/automations/workflow-data";
import type { WorkflowAction } from "@/lib/automation/types";
import { sendEmailAction } from "@/lib/automation/actions/sendEmail";
import { addToNotionAction } from "@/lib/automation/actions/addToNotion";
import { createFolderAction } from "@/lib/automation/actions/createFolder";

// The action registry: subtype → the action that handles it.
//
// The engine core knows nothing about specific actions — it only asks this
// registry for a handler by node subtype. Adding a new action later means
// registering it here (and writing its file); the engine never changes.
// A subtype with no entry is treated as "not implemented" by the engine and
// skipped — never faked, never errored.
const registry = new Map<Subtype, WorkflowAction>();

function register(action: WorkflowAction): void {
  registry.set(action.id, action);
}

// Built-in actions: the invite email send, the Notion record write, and the
// Google Drive folder creation.
register(sendEmailAction);
register(addToNotionAction);
register(createFolderAction);

export function getAction(subtype: Subtype): WorkflowAction | undefined {
  return registry.get(subtype);
}
