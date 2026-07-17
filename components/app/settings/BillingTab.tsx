import { Sparkles } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "$300",
    description: "For freelancers taking on their first handful of clients.",
  },
  {
    name: "Professional",
    price: "$700",
    description: "For growing agencies onboarding clients every week.",
  },
  {
    name: "Premium",
    price: "$1,500+",
    description: "For established teams with high onboarding volume.",
  },
];

export default function BillingTab() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Your plan
        </h3>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Early Access — Free
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            You&rsquo;re on free early access. Paid plans arrive after launch —
            early users get a discount.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Planned pricing
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-900">{plan.name}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {plan.price}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {plan.description}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          One-time payment. Final pricing may change before launch.
        </p>
      </section>
    </div>
  );
}
