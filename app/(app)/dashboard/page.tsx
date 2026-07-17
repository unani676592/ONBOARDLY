import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import InviteTrigger from "@/components/app/InviteTrigger";
import { getClientStats } from "@/lib/clients";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { firstNameFor, fullNameOf } from "@/lib/user";

export const metadata = {
  title: "Dashboard — Onboardly",
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const firstName = firstNameFor(fullNameOf(user), email);

  const stats = await getClientStats();

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h2>
        <p className="mt-1 text-slate-500">
          Here&rsquo;s where your clients stand.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Total Clients" value={stats.total} />
        <StatCard icon={Clock} label="Onboarding" value={stats.onboarding} />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
        />
      </div>

      {/* Recent Clients */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            Recent Clients
          </h3>
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-indigo-600 transition-colors hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            View all clients
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center px-4 py-12 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-indigo-50 text-indigo-600">
            <UserPlus className="h-9 w-9" aria-hidden="true" />
          </span>
          <h4 className="mt-6 text-lg font-bold tracking-tight text-slate-900">
            No clients yet
          </h4>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Invite your first client — their onboarding runs on autopilot from
            there.
          </p>
          <InviteTrigger label="Invite your first client" className="mt-6" />
        </div>
      </section>
    </div>
  );
}
