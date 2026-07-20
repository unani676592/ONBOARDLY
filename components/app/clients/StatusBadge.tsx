import type { ClientStatus } from "@/lib/clients";

// Single source of truth for how each onboarding status is labelled and
// coloured — reused by the dashboard card, the clients table, and the status
// dropdown. No "use client": this is presentational and renders on the server
// too.
export const STATUS_META: Record<
  ClientStatus,
  { label: string; badge: string }
> = {
  invited: { label: "Invited", badge: "bg-slate-100 text-slate-600" },
  form_completed: { label: "Form completed", badge: "bg-blue-100 text-blue-700" },
  files_pending: { label: "Files pending", badge: "bg-amber-100 text-amber-700" },
  onboarded: { label: "Onboarded", badge: "bg-emerald-100 text-emerald-700" },
};

export default function StatusBadge({ status }: { status: ClientStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
    >
      {meta.label}
    </span>
  );
}
