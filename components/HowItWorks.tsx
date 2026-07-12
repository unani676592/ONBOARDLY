import { UserPlus, ClipboardList, Zap } from "lucide-react";

const steps = [
  {
    n: 1,
    icon: UserPlus,
    title: "Add your client",
    body: "One click sends them a magic link. No account needed.",
  },
  {
    n: 2,
    icon: ClipboardList,
    title: "They fill one form",
    body: "Files, brand info, and answers collected in one place.",
  },
  {
    n: 3,
    icon: Zap,
    title: "Everything automates",
    body: "Welcome email, folders, CRM record, and tasks — done instantly.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          How it works
        </h2>

        <div className="relative mt-16 grid gap-8 md:grid-cols-3 md:gap-6">
          {/* Dotted connector line (desktop only) */}
          <div
            aria-hidden="true"
            className="absolute left-[16.66%] right-[16.66%] top-6 hidden border-t-2 border-dashed border-indigo-200 md:block"
          />

          {steps.map((step) => (
            <div key={step.n} className="relative flex flex-col items-center">
              <div className="z-10 grid h-12 w-12 place-items-center rounded-full border-4 border-white bg-indigo-600 text-base font-bold text-white shadow-md shadow-indigo-600/40">
                {step.n}
              </div>
              <div className="mt-6 w-full rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm shadow-slate-200/60">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <step.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
