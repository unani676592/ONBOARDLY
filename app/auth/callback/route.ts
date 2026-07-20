import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

// OAuth (Google) redirect target. Supabase sends the browser here with a
// `?code=` after the provider round-trip. We exchange that code for a session
// — which writes the auth cookies — then forward to the app. This must be a
// server route so the cookie is set before the middleware guards /dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  // Only allow same-origin relative paths for `next` (guard against open
  // redirects). Default to the dashboard.
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No code, or the exchange failed — send them back to log in with a hint.
  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
