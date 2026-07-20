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
};

export type ClientStats = {
  total: number;
  onboarding: number;
  completed: number;
};
