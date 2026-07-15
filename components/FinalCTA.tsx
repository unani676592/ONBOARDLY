"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FinalCTA() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: cleanEmail });

    setLoading(false);

    // 23505 = unique_violation. The email is already on the list — treat as
    // success without revealing that it already existed.
    if (insertError && insertError.code !== "23505") {
      setError("Something went wrong — please try again.");
      return;
    }

    setSubmitted(true);
  }

  return (
    <section id="cta" className="scroll-mt-24 px-6 py-16">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 px-6 py-16 text-center sm:px-12">
        {/* subtle dotted texture */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-15 [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:16px_16px]"
        />

        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Onboard your next client in minutes, not hours.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100">
            Join the waitlist and be the first to automate your onboarding.
          </p>

          {submitted ? (
            <div
              role="status"
              className="mx-auto mt-8 inline-flex items-center gap-2 rounded-xl bg-white/15 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-inset ring-white/30"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-indigo-600">
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              You&apos;re on the list ✓
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1 text-left">
                <label htmlFor="cta-email" className="sr-only">
                  Work email
                </label>
                <input
                  id="cta-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError("");
                  }}
                  aria-invalid={!!error}
                  aria-describedby={error ? "cta-email-error" : undefined}
                  className="w-full rounded-xl border-0 bg-white/15 px-4 py-3.5 text-base text-white placeholder:text-indigo-200 ring-1 ring-inset ring-white/25 focus:outline-none focus:ring-2 focus:ring-white"
                />
                {error && (
                  <p
                    id="cta-email-error"
                    className="mt-2 pl-1 text-sm font-medium text-indigo-100"
                  >
                    {error}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Joining…" : "Get early access"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
