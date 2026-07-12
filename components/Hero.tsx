import { ArrowRight, Play, FileText, Copy, UserX } from "lucide-react";
import DashboardMockup from "./DashboardMockup";
import TiltCard from "./TiltCard";

const trust = [
  { icon: FileText, label: "One form" },
  { icon: Copy, label: "Zero copy-paste" },
  { icon: UserX, label: "No client accounts needed" },
];

export default function Hero() {
  return (
    <section id="product" className="relative overflow-hidden">
      {/* soft background accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-100/50 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:gap-10 lg:py-24">
        {/* Left */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700">
            <span aria-hidden="true">⚡</span> Automated onboarding for modern
            agencies
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            Stop losing <span className="text-indigo-600">3+ hours</span>{" "}
            onboarding every client.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
            Your client fills one form — no account, no login, just a magic
            link. Onboardly handles the rest: welcome emails, Drive folders, CRM
            records, and tasks. All on autopilot.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#cta"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              Get early access
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-white">
                <Play className="h-2.5 w-2.5" fill="currentColor" strokeWidth={0} />
              </span>
              See how it works
            </a>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {trust.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — dashboard mockup */}
        <div className="lg:pl-4">
          <TiltCard className="rotate-[1.4deg]">
            <DashboardMockup />
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
