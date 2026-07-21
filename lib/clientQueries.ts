import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Client, ClientStats } from "@/lib/clients";

// Server-only reads (this module imports next/headers via supabaseServer, so it
// must never be imported from a client component). Every query runs through the
// RLS-scoped Supabase client, so results are implicitly limited to the
// signed-in agency's rows (policy: user_id = auth.uid()). We never filter by a
// client-supplied user_id.

// Real counts from the clients table. RLS scopes both queries to the current
// user, so we can count without a where-clause on user_id.
export async function getClientStats(): Promise<ClientStats> {
  const supabase = await createSupabaseServerClient();

  const [totalRes, onboardedRes] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "onboarded"),
  ]);

  if (totalRes.error) console.error("getClientStats total:", totalRes.error);
  if (onboardedRes.error)
    console.error("getClientStats onboarded:", onboardedRes.error);

  const total = totalRes.count ?? 0;
  const completed = onboardedRes.count ?? 0;

  return {
    total,
    onboarding: total - completed,
    completed,
  };
}

/** The N most recently added clients, newest first (dashboard card). */
export async function getRecentClients(limit = 5): Promise<Client[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getRecentClients:", error);
  return (data as Client[] | null) ?? [];
}

/** Every client for the signed-in agency, newest first (/clients page). */
export async function getAllClients(): Promise<Client[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) console.error("getAllClients:", error);
  // TEMP DIAGNOSTIC — comparing the viewer's uid to clients.user_id.
  console.log(
    "[DIAG getAllClients] viewer auth.uid =",
    user?.id,
    "| rows =",
    data?.length ?? 0,
  );
  return (data as Client[] | null) ?? [];
}
