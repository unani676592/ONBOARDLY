import { UserPlus } from "lucide-react";
import InviteTrigger from "@/components/app/InviteTrigger";

export const metadata = {
  title: "Clients — Onboardly",
};

export default function ClientsPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-indigo-50 text-indigo-600">
          <UserPlus className="h-9 w-9" aria-hidden="true" />
        </span>
        <h2 className="mt-6 text-lg font-bold tracking-tight text-slate-900">
          No clients yet
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Invite your first client — their onboarding runs on autopilot from
          there.
        </p>
        <InviteTrigger label="Invite your first client" className="mt-6" />
      </div>
    </div>
  );
}
