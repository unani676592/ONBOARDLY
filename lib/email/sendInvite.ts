import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { fullNameOf } from "@/lib/user";
import { EMAIL_FROM } from "@/lib/email/config";
import { getResend } from "@/lib/email/resend";
import {
  DEFAULT_INVITE_TEMPLATE,
  MAGIC_LINK_TOKEN,
  renderTemplate,
  type EmailTemplate,
} from "@/lib/email/inviteTemplate";

// Server-only: send one client their invite email and stamp invite_sent_at.
// The caller records the activity run (see logActionRun); this function is
// purely the send + stamp.
//
// SECURITY: runs through the RLS-scoped anon server client (the signed-in
// agency's cookie session). The clients row only resolves if it belongs to this
// agency (policy: user_id = auth.uid()), so a hit both confirms ownership and
// hands us the name / email / token. No service_role, no client-supplied user_id.

export type SendInviteResult =
  // `warning` is set when the send had to self-correct (e.g. a saved template
  // missing the magic link) — the email still went out, but the caller logs it.
  | { ok: true; id: string; warning?: string }
  | { ok: false; status: 401 | 404 | 500 | 502; reason: string };

export async function sendInviteEmail(
  clientId: string,
  baseUrl: string,
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

  // Load this agency's saved template; fall back to the shared default when they
  // haven't customized one (same source of truth the editor uses). RLS scopes
  // this to the owner's own row.
  let template: EmailTemplate = DEFAULT_INVITE_TEMPLATE;
  const { data: saved, error: templateError } = await supabase
    .from("email_templates")
    .select("subject, body")
    .eq("user_id", user.id)
    .maybeSingle();
  if (templateError) {
    // A template read failure shouldn't block the invite — the default still
    // produces a valid, honest email.
    console.error("sendInviteEmail template:", templateError.message);
  } else if (saved?.subject && saved?.body) {
    template = { subject: saved.subject, body: saved.body };
  }

  // Resolve each variable to a real value, with graceful fallbacks so no token
  // or empty string ever reaches the client. "Your agency" mirrors the editor
  // preview's placeholder when no account name is set.
  const email = renderTemplate(template, {
    client_name: client.name?.trim() || "there",
    agency_name: fullNameOf(user) || "Your agency",
    magic_link: magicLink,
  });

  // Safety net: the editor and save API both require {{magic_link}}, but a
  // legacy or tampered row could lack it. Never send a linkless invite — append
  // the real link so the client can still reach their form, and flag it so the
  // caller records the self-correction honestly.
  let bodyText = email.body;
  let warning: string | undefined;
  if (!template.body.includes(MAGIC_LINK_TOKEN)) {
    bodyText = `${bodyText.trimEnd()}\n\n${magicLink}`;
    warning =
      "The saved template was missing the magic link, so it was appended automatically.";
    console.warn("sendInviteEmail: template missing magic link — appended.");
  }

  let result: SendInviteResult;
  try {
    // Plain text only — the template body is plain text with real line breaks.
    const { data, error: sendError } = await getResend().emails.send({
      from: EMAIL_FROM,
      to: client.email,
      subject: email.subject,
      text: bodyText,
    });

    if (sendError) {
      // Surface Resend's real reason (e.g. the test-sender recipient
      // restriction). Never log the recipient address.
      console.error("sendInviteEmail resend:", sendError.message);
      result = { ok: false, status: 502, reason: sendError.message };
    } else if (!data?.id) {
      result = { ok: false, status: 502, reason: "Resend returned no message id." };
    } else {
      result = { ok: true, id: data.id, warning };
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown email error.";
    console.error("sendInviteEmail threw:", reason);
    result = { ok: false, status: 502, reason };
  }

  // Note: activity logging is the engine's job now (per-action). This function
  // just sends + stamps; callers (the engine's send-email action, and the
  // manual-resend route) record the run via logActionRun.

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
