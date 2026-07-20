import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { Client, ClientStats } from "@/lib/clients";

// Server-only reads (this module imports next/headers via supabaseServer, so it
// must never be imported from a client component). Every query runs through the
// RLS-scoped Supabase client,
// so results are implicitly limited to the signed-in agency's rows
// (policy: user_id = auth.uid()). We never filter by a client-supplied user_id.

// Real counts from the clients table. RLS scopes both queries to the current
// user, so we can count without a where-clause on user_id.
export async function getClientStats(): Promise<ClientStats> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [totalRes, onboardedRes] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("status", "onboarded"),
  ]);

  // TEMP DIAGNOSTIC — remove after debugging read-returns-empty.
  console.log("[DIAG getClientStats] auth.uid =", user?.id);
  console.log("[DIAG getClientStats] total:", {
    count: totalRes.count,
    error: totalRes.error,
  });
  console.log("[DIAG getClientStats] onboarded:", {
    count: onboardedRes.count,
    error: onboardedRes.error,
  });

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
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
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

  // TEMP DIAGNOSTIC — remove after debugging read-returns-empty.
  console.log("[DIAG getAllClients] auth.uid =", user?.id);
  console.log("[DIAG getAllClients] rows:", data?.length ?? 0, "error:", error);

  return (data as Client[] | null) ?? [];
}
