// Shared automation-run types. Client-safe (no server-only imports) so both the
// Activity tab (client component) and the server engine can use it.

export type RunTrigger = "client-invited" | "manual-resend";

// Per-action outcomes recorded by the engine. 'sent' is legacy (pre-engine
// invite rows) and reads the same as 'ran' for a send-email action.
export type RunStatus = "ran" | "failed" | "skipped" | "sent";

// One recorded action outcome (row of public.automation_runs). Since Phase 8's
// invite-only logging, rows now carry which workflow and which action produced
// them; legacy invite rows have null action_subtype / workflow_id.
export type AutomationRun = {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string;
  workflow_id: string | null;
  action_subtype: string | null;
  trigger: RunTrigger;
  status: RunStatus;
  error: string | null;
  created_at: string;
};

// How each trigger reads in the Activity list.
export const TRIGGER_LABELS: Record<RunTrigger, string> = {
  "client-invited": "Client invited",
  "manual-resend": "Manual resend",
};

// Human labels for each action subtype the engine can run. Plain strings (no
// icon imports) to keep this module client-safe and server-safe.
export const ACTION_SUBTYPE_LABELS: Record<string, string> = {
  "send-email": "Send email",
  "create-folder": "Create folder",
  "create-task": "Create task",
  "add-crm-record": "Add CRM record",
  condition: "Condition",
  delay: "Delay",
};
