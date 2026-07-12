import { Check, ArrowRight, Star } from "lucide-react";

type Tier = {
  name: string;
  price: string;
  description: string;
  featuresIntro?: string;
  features: string[];
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Starter",
    price: "$300",
    description: "Everything you need to automate basic client onboarding.",
    features: ["Intake form", "Welcome email automation", "Folder creation"],
  },
  {
    name: "Professional",
    price: "$700",
    description: "Advanced automation and integrations for growing teams.",
    featuresIntro: "Everything in Starter, plus:",
    features: ["Client portal", "CRM integration", "Task automation"],
    featured: true,
  },
  {
    name: "Premium",
    price: "$1,500+",
    description: "Custom workflows and priority support for scaling teams.",
    featuresIntro: "Everything in Professional, plus:",
    features: ["Custom workflows", "Multi-team", "Priority support"],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Simple, transparent pricing
        </h2>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-700">
            One-time payment
          </span>
          <span className="text-sm text-slate-500">
            No subscriptions. No surprises.
          </span>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl bg-white p-8 ${
                tier.featured
                  ? "border-2 border-indigo-600 shadow-xl shadow-indigo-600/15 lg:-mt-4 lg:pt-12"
                  : "border border-slate-200 shadow-sm shadow-slate-200/60"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/40">
                  <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
              <p className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
                {tier.price}
              </p>
              <p className="mt-3 min-h-[2.5rem] text-sm leading-relaxed text-slate-500">
                {tier.description}
              </p>

              {tier.featuresIntro && (
                <p className="mt-6 text-sm font-semibold text-slate-800">
                  {tier.featuresIntro}
                </p>
              )}
              <ul className={`${tier.featuresIntro ? "mt-3" : "mt-6"} space-y-3`}>
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-indigo-50 text-indigo-600">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  tier.featured
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-700"
                    : "border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                }`}
              >
                Get early access
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
