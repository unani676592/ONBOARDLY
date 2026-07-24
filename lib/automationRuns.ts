// Shared automation-run types. Client-safe (no server-only imports) so both the
// Activity tab (client component) and the server send-path can use it.

export type RunTrigger = "client-invited" | "manual-resend";
export type RunStatus = "sent" | "failed";

// One recorded invite-email attempt (row of public.automation_runs).
export type AutomationRun = {
  id: string;
  user_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string;
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
