// Single source of truth for the customizable client invite email:
// the supported template variables, the default template used when an agency
// has not saved its own, and the shared EmailTemplate shape.
//
// This is deliberately storage/UI-agnostic. Step 2 (the editor) and step 3
// (wiring templates into the send) both import from here so the variable list
// and the fallback copy never drift between them.
//
// Plain text only for now — subject line + plain body. No HTML/rich text.

export type EmailTemplate = {
  subject: string;
  body: string;
};

// A variable the agency may drop into the subject or body. `token` is the exact
// literal an agency types (and what the send substitutes); `key` is the stable
// identifier code uses when supplying the value. Keep this list authoritative:
// the editor renders it as the "insert variable" palette, and the send builds
// its replacement map from it.
export type TemplateVariable = {
  key: "client_name" | "agency_name" | "magic_link";
  token: string; // e.g. "{{client_name}}"
  label: string;
  description: string;
};

export const TEMPLATE_VARIABLES: readonly TemplateVariable[] = [
  {
    key: "client_name",
    token: "{{client_name}}",
    label: "Client name",
    description: "The name of the client being invited.",
  },
  {
    key: "agency_name",
    token: "{{agency_name}}",
    label: "Agency name",
    description: "Your agency name, from your account.",
  },
  {
    key: "magic_link",
    token: "{{magic_link}}",
    label: "Magic link",
    description: "The client's unique onboarding link — no sign in required.",
  },
] as const;

// The concrete value each variable is replaced with at send time. Keyed by the
// same `key`s as TEMPLATE_VARIABLES so the two can't drift.
export type TemplateValues = Record<TemplateVariable["key"], string>;

// Substitute every supported variable in the subject and body. Driven off
// TEMPLATE_VARIABLES so the registry stays the single source of truth: add a
// variable there and it's substituted here automatically. Pure — the caller
// supplies already-resolved values (with fallbacks applied).
export function renderTemplate(
  template: EmailTemplate,
  values: TemplateValues,
): EmailTemplate {
  const apply = (text: string) =>
    TEMPLATE_VARIABLES.reduce(
      (acc, v) => acc.split(v.token).join(values[v.key]),
      text,
    );
  return { subject: apply(template.subject), body: apply(template.body) };
}

// The default invite template, used when an agency has not saved a custom one.
// Defined in code (not seeded per-row) so a brand-new agency always has a
// sensible email without a database write.
export const DEFAULT_INVITE_TEMPLATE: EmailTemplate = {
  subject: "{{agency_name}} needs a few details to get started",
  body: `Dear {{client_name}},

We are currently setting things up for you at {{agency_name}} and need some information from you before we begin.

It should only take around 2 minutes to complete – no sign in required. Simply visit the link below and fill out the form:

{{magic_link}}

Best regards,
{{agency_name}}`,
};
