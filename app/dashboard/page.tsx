import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/dashboard/LogoutButton";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const metadata = {
  title: "Dashboard — Onboardly",
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side guard (defense in depth alongside the middleware).
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        <h1 className="mt-8 text-2xl font-extrabold tracking-tight text-slate-900">
          Welcome, {user.email}
        </h1>
        <p className="mt-2 text-slate-500">Your dashboard is coming soon.</p>

        <div className="mt-8 flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
