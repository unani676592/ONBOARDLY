// Client data layer. Today there is no `clients` table yet, so the stats are
// honest zeros — but the dashboard reads them from here, never from hardcoded
// JSX, so wiring up the real query later is a one-function change.

export type ClientStats = {
  total: number;
  onboarding: number;
  completed: number;
};

// TODO: once the `clients` table exists (RLS-scoped to the signed-in agency),
// replace this with a Supabase count query, e.g.
//   select status, count(*) from clients where owner = auth.uid() group by status
// and derive total/onboarding/completed from the grouped counts.
export async function getClientStats(): Promise<ClientStats> {
  return { total: 0, onboarding: 0, completed: 0 };
}
