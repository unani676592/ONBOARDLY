import { createClient } from "@supabase/supabase-js";

// ⚠️ SERVER-ONLY. This client uses the Supabase service_role key, which bypasses
// Row Level Security. It exists solely so trusted server routes can perform the
// one operation the anon key cannot: writing to the private `client-files`
// bucket on behalf of an unauthenticated intake visitor (the step-1 storage
// policies grant NO anon/authenticated INSERT — only service_role can write).
//
// HARD RULES for this file:
//   - NEVER import it from a client component ("use client") or any browser
//     bundle. It must only be reached from route handlers / server modules.
//   - The key lives in SUPABASE_SERVICE_ROLE_KEY — server-only, NEVER prefixed
//     with NEXT_PUBLIC_, and never logged.
//   - Callers must authorize the request themselves (e.g. validate the intake
//     token) BEFORE using this client — it has full database + storage access.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createSupabaseAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing server env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only) in .env.local.",
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
