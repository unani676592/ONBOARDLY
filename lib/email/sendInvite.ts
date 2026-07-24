import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { fullNameOf } from "@/lib/user";
import { EMAIL_FROM } from "@/lib/email/config";
import { getResend } from "@/lib/email/resend";
import { buildInviteEmail } from "@/lib/email/inviteEmail";
import type { RunTrigger } from "@/lib/automationRuns";

// Server-only: send one client their invite email and record the attempt.
//
// SECURITY: runs through the RLS-scoped anon server client (the signed-in
// agency's cookie session). The clients row only resolves if it belongs to this
// agency (policy: user_id = auth.uid()), so a hit both confirms ownership and
// hands us the name / email / token. No service_role, no client-supplied user_id.

export type SendInviteResult =
  | { ok: true; id: string }
  | { ok: false; status: 401 | 404 | 500 | 502; reason: string };

export async function sendInviteEmail(
  clientId: string,
  baseUrl: string,
  trigger: RunTrigger,
): Promise<SendInviteResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, reason: "Not signed in." };

  // RLS scopes this to the caller's own clients — ownership check + data source.
  const { data: client, error } = await supabase
    .from("clients")
    .select("name, email, token")
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    console.error("sendInviteEmail lookup:", error.message);
    return { ok: false, status: 500, reason: "Could not load the client." };
  }
  if (!client) {
    return { ok: false, status: 404, reason: "Client not found." };
  }
  if (!client.token) {
    return { ok: false, status: 500, reason: "This client has no invite token." };
  }

  const magicLink = `${baseUrl}/onboard/${client.token}`;
  const email = buildInviteEmail({
    clientName: client.name ?? "",
    agencyName: fullNameOf(user) ?? "",
    magicLink,
  });

  let result: SendInviteResult;
  try {
    const { data, error: sendError } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: client.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (sendError) {
      // Surface Resend's real reason (e.g. the test-sender recipient
      // restriction). Never log the recipient address.
      console.error("sendInviteEmail resend:", sendError.message);
      result = { ok: false, status: 502, reason: sendError.message };
    } else if (!data?.id) {
      result = { ok: false, status: 502, reason: "Resend returned no message id." };
    } else {
      result = { ok: true, id: data.id };
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown email error.";
    console.error("sendInviteEmail threw:", reason);
    result = { ok: false, status: 502, reason };
  }

  // Record the attempt (best-effort — a logging failure never changes the real
  // email outcome we report to the caller).
  const { error: runError } = await supabase.from("automation_runs").insert({
    user_id: user.id,
    client_id: clientId,
    client_name: client.name ?? "",
    client_email: client.email,
    trigger,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.reason,
  });
  if (runError) console.error("sendInviteEmail run log:", runError.message);

  // Stamp last-sent only on a real success.
  if (result.ok) {
    const { error: stampError } = await supabase
      .from("clients")
      .update({ invite_sent_at: new Date().toISOString() })
      .eq("id", clientId);
    if (stampError) console.error("sendInviteEmail stamp:", stampError.message);
  }

  return result;
}
