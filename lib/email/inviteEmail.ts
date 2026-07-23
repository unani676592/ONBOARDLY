// Builds the invite email (subject + HTML + plain-text fallback).
//
// Everything rendered here is real data supplied by the caller: the client's
// name, the agency name from the owner's account, and the actual magic link.
// No fabricated stats, testimonials, or sender claims. When the agency name is
// unknown the copy stays generic rather than inventing one.

export type InviteEmailInput = {
  clientName: string;
  agencyName: string; // "" when the owner has no name set — copy adapts
  magicLink: string;
};

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
};

// Escape the few characters that matter inside HTML text / attribute context.
// clientName and agencyName are user-controlled, so this prevents markup
// injection into the email body.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildInviteEmail(input: InviteEmailInput): BuiltEmail {
  const clientName = input.clientName.trim();
  const agencyName = input.agencyName.trim();
  const link = input.magicLink;

  const greetingName = clientName || "there";
  const inviter = agencyName
    ? `${agencyName} has invited you to get started.`
    : "You've been invited to get started.";
  const subject = agencyName
    ? `Get started with ${agencyName}`
    : "Get started — a quick onboarding";

  const text = [
    `Hi ${greetingName},`,
    "",
    inviter,
    "It only takes a few minutes, and there's no account to create.",
    "",
    "Open your onboarding:",
    link,
    "",
    "If you weren't expecting this, you can ignore this email.",
  ].join("\n");

  const html = `<!-- invite email -->
<div style="margin:0;padding:0;background:#f7f8fc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fc;padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td style="font-size:18px;font-weight:700;color:#1e1b2e;padding-bottom:16px;">Onboardly</td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.6;color:#334155;">
              <p style="margin:0 0 12px;">Hi ${esc(greetingName)},</p>
              <p style="margin:0 0 12px;">${esc(inviter)}</p>
              <p style="margin:0 0 24px;">It only takes a few minutes, and there's no account to create.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${esc(link)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:12px;">Get started</a>
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:#64748b;">
              <p style="margin:0 0 8px;">Or paste this link into your browser:</p>
              <p style="margin:0 0 16px;word-break:break-all;"><a href="${esc(link)}" style="color:#4f46e5;">${esc(link)}</a></p>
              <p style="margin:0;color:#94a3b8;">If you weren't expecting this, you can ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;

  return { subject, html, text };
}
