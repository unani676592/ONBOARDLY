import BenefitSequence from "@/components/signup/BenefitSequence";
import SignupForm from "@/components/signup/SignupForm";

export const metadata = {
  title: "Create your account — Onboardly",
  description: "Start onboarding clients in minutes.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left panel — hidden below lg */}
      <section
        aria-hidden="true"
        className="relative hidden items-center justify-center overflow-hidden bg-indigo-50/60 lg:flex lg:w-[55%]"
      >
        {/* Faint dotted pattern */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(79,70,229,0.12) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Soft glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative z-10 flex w-full justify-center px-12">
          <BenefitSequence />
        </div>
      </section>

      {/* Right panel — signup card. Full width below lg with soft gradient. */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-6 py-12 lg:w-[45%] lg:bg-white lg:bg-none">
        <SignupForm />
      </section>
    </main>
  );
}
