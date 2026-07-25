import { sendInviteEmail } from "@/lib/email/sendInvite";
import type { ActionContext, ActionResult, WorkflowAction } from "@/lib/automation/types";

// The "send-email" action: sends the client their invite email with magic link.
//
// This is a thin adapter over the existing sendInviteEmail — the actual send,
// RLS-scoped ownership check, run logging and invite_sent_at stamp all still
// live there, unchanged. The action just maps that result onto the engine's
// ran / failed shape. Credentials (Resend key) stay server-side inside
// sendInviteEmail; nothing secret passes through the context.
export const sendEmailAction: WorkflowAction = {
  id: "send-email",
  async run({ clientId, baseUrl }: ActionContext): Promise<ActionResult> {
    const result = await sendInviteEmail(clientId, baseUrl);
    if (result.ok) {
      return { status: "ran", detail: result.id };
    }
    return { status: "failed", reason: result.reason };
  },
};
