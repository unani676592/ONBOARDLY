import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
  );
}

// Anon key only — never the service_role key. Browser client from @supabase/ssr
// stores the session in cookies so the server (middleware, server components)
// can read it. Shared by the waitlist form and auth. Safe for the browser.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
