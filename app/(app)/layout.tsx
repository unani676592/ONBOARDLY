import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { displayNameFor, fullNameOf, initialsFor } from "@/lib/user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side guard (defense in depth alongside the middleware).
  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const fullName = fullNameOf(user);

  return (
    <AppShell
      user={{
        displayName: displayNameFor(fullName, email),
        email,
        initials: initialsFor(fullName, email),
      }}
    >
      {children}
    </AppShell>
  );
}
