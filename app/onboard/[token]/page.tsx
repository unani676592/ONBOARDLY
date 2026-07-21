import { notFound } from "next/navigation";
import Logo from "@/components/Logo";
import OnboardForm from "@/components/onboard/OnboardForm";
import { fetchOnboardClient } from "@/lib/onboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding — Onboardly",
  // This is a private per-client link; keep it out of search indexes.
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ token: string }> };

export default async function OnboardPage({ params }: PageProps) {
  const { token } = await params;
  const data = await fetchOnboardClient(token);

  // Invalid / unknown token → friendly 404 (app/onboard/[token]/not-found.tsx).
  // No leak about whether the token existed.
  if (!data) notFound();

  const agencyLabel = data.agencyName.trim();

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hi {data.clientName} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-2 text-slate-600">
              {agencyLabel
                ? `${agencyLabel} needs a few details to get started.`
                : "Your agency needs a few details to get started."}
            </p>
            <p className="mt-3 text-sm font-medium text-slate-400">
              Takes about 2 minutes. No account needed.
            </p>
          </header>

          <OnboardForm
            token={token}
            clientName={data.clientName}
            agencyName={agencyLabel}
            alreadySubmitted={data.alreadySubmitted}
          />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Powered by Onboardly
        </p>
      </div>
    </main>
  );
}
