import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { fullNameOf } from "@/lib/user";
import { EMAIL_FROM } from "@/lib/email/config";
import { getResend } from "@/lib/email/resend";
import { buildInviteEmail } from "@/lib/email/inviteEmail";

// Server-only: send one client their invite email.
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
      // restriction) so it can be acted on. Never log the recipient address.
      console.error("sendInviteEmail resend:", sendError.message);
      return { ok: false, status: 502, reason: sendError.message };
    }
    if (!data?.id) {
      return { ok: false, status: 502, reason: "Resend returned no message id." };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unknown email error.";
    console.error("sendInviteEmail threw:", reason);
    return { ok: false, status: 502, reason };
  }
}
