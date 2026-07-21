// Shared client types + constants. Kept free of any server-only imports
// (next/headers) so this module is safe to import from client components like
// the clients table and status badge. The RLS-scoped query functions live in
// lib/clientQueries.ts (server-only).

export const CLIENT_STATUSES = [
  "invited",
  "form_completed",
  "files_pending",
  "onboarded",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
  // Added by the magic-link phase. `token` is the unguessable per-client intake
  // key used to build /onboard/[token]; `submitted_at` is null until the client
  // completes their form.
  token: string;
  submitted_at: string | null;
};

export type ClientStats = {
  total: number;
  onboarding: number;
  completed: number;
};

// The client's chosen contact method for the intake form. Kept in sync with the
// CHECK constraint on public.client_submissions.contact_method.
export const CONTACT_METHODS = ["email", "phone", "whatsapp"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

// How each method reads in the method <select>.
export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
};

// The label for the contact-value field adapts to the chosen method.
export const CONTACT_VALUE_LABELS: Record<ContactMethod, string> = {
  email: "Your email",
  phone: "Your phone number",
  whatsapp: "Your WhatsApp number",
};

// One client's submitted intake answers (one row per client).
export type ClientSubmission = {
  id: string;
  client_id: string;
  business_name: string;
  website: string | null;
  needs: string;
  contact_method: ContactMethod;
  contact_value: string;
  look_and_feel: string;
  created_at: string;
};
