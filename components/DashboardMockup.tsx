import {
  LayoutDashboard,
  Users,
  FileText,
  Workflow,
  ListChecks,
  Blocks,
  Settings,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Clients", icon: Users },
  { label: "Templates", icon: FileText },
  { label: "Automations", icon: Workflow },
  { label: "Tasks", icon: ListChecks },
  { label: "Integrations", icon: Blocks },
  { label: "Settings", icon: Settings },
];

const stats = [
  { label: "Total Clients", value: "128" },
  { label: "Onboarding", value: "32" },
  { label: "Completed", value: "96" },
];

const clients = [
  {
    name: "Acme Marketing",
    initials: "AM",
    status: "Onboarded",
    tone: "bg-emerald-50 text-emerald-700",
    bar: "w-full bg-emerald-500",
    time: "2h ago",
  },
  {
    name: "Nova Creative",
    initials: "NC",
    status: "Form Completed",
    tone: "bg-indigo-50 text-indigo-700",
    bar: "w-[70%] bg-indigo-500",
    time: "3h ago",
  },
  {
    name: "Pixel Labs",
    initials: "PL",
    status: "Files Pending",
    tone: "bg-amber-50 text-amber-700",
    bar: "w-[45%] bg-amber-500",
    time: "1d ago",
  },
  {
    name: "Bright Growth",
    initials: "BG",
    status: "Invited",
    tone: "bg-slate-100 text-slate-500",
    bar: "w-[10%] bg-slate-400",
    time: "2d ago",
  },
];

export default function DashboardMockup() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/15"
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="mx-auto w-full max-w-[200px] rounded-md border border-slate-200 bg-white px-3 py-1 text-center text-[11px] text-slate-400">
          app.onboardly.com
        </div>
      </div>

      {/* Body */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-40 flex-col border-r border-slate-100 bg-slate-50/50 p-3 sm:flex">
          <div className="mb-4 flex items-center gap-2 px-1">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-bold text-slate-800">Onboardly</span>
          </div>
          <nav className="flex flex-col gap-0.5">
            {sidebarItems.map(({ label, icon: Icon, active }) => (
              <span
                key={label}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </nav>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-3 text-white">
            <p className="text-[11px] font-semibold">Upgrade plan</p>
            <p className="mt-0.5 text-[10px] leading-tight text-indigo-100">
              Unlock premium features
            </p>
          </div>
        </aside>

        {/* Main panel */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Dashboard</h3>
            <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white">
              <Plus className="h-3 w-3" /> Invite client
            </span>
          </div>

          {/* Stat cards */}
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-slate-100 bg-white p-2.5"
              >
                <p className="text-[10px] text-slate-400">{s.label}</p>
                <p className="mt-1 text-lg font-bold tracking-tight text-slate-900">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Recent clients */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">Recent Clients</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600">
                View all clients <ArrowRight className="h-3 w-3" />
              </span>
            </div>

            <div className="space-y-1">
              {clients.map((c) => (
                <div
                  key={c.name}
                  className="grid grid-cols-[1.4fr_1fr_0.9fr_auto] items-center gap-2 rounded-lg border border-slate-50 px-2 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                      {c.initials}
                    </span>
                    <span className="truncate text-[11px] font-semibold text-slate-700">
                      {c.name}
                    </span>
                  </div>
                  <span
                    className={`justify-self-start rounded-full px-2 py-0.5 text-[9px] font-semibold ${c.tone}`}
                  >
                    {c.status}
                  </span>
                  <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${c.bar}`} />
                  </span>
                  <span className="text-right text-[10px] text-slate-400">
                    {c.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
