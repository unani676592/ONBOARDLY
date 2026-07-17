import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Server-side session gate. Runs before /dashboard, /login, and /signup.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates the token against Supabase Auth — more trustworthy
  // than reading the cookie alone.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protected app routes (the authenticated shell). Kept in sync with the
  // (app) route group.
  const PROTECTED = [
    "/dashboard",
    "/clients",
    "/templates",
    "/automations",
    "/tasks",
    "/integrations",
    "/settings",
  ];
  const isProtected = PROTECTED.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // Protect the app: no session → send to login.
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Logged-in users have no business on the auth pages.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/templates/:path*",
    "/automations/:path*",
    "/tasks/:path*",
    "/integrations/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
