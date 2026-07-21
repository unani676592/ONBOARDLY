"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2, Paperclip } from "lucide-react";
import {
  CONTACT_METHODS,
  CONTACT_METHOD_LABELS,
  CONTACT_VALUE_LABELS,
  type ContactMethod,
} from "@/lib/clients";

type Errors = Partial<
  Record<
    "businessName" | "needs" | "contactValue" | "lookAndFeel",
    string
  >
>;

export default function OnboardForm({
  token,
  clientName,
  agencyName,
  alreadySubmitted,
}: {
  token: string;
  clientName: string;
  agencyName: string;
  alreadySubmitted: boolean;
}) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [needs, setNeeds] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [lookAndFeel, setLookAndFeel] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Show the confirmation if the client already submitted, or once they do now.
  const [done, setDone] = useState(alreadySubmitted);

  function validate(): Errors {
    const next: Errors = {};
    if (!businessName.trim()) next.businessName = "Enter your business or brand name.";
    if (!needs.trim()) next.needs = "Let us know what you need.";
    if (!contactValue.trim())
      next.contactValue = `Enter ${CONTACT_VALUE_LABELS[contactMethod].toLowerCase()}.`;
    if (!lookAndFeel.trim())
      next.lookAndFeel = "Tell us a little about the look and feel.";
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/onboard/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: businessName.trim(),
          website: website.trim(),
          needs: needs.trim(),
          contactMethod,
          contactValue: contactValue.trim(),
          lookAndFeel: lookAndFeel.trim(),
        }),
      });

      const body = (await res.json().catch(() => ({}))) as {
        status?: string;
      };

      if (res.ok && (body.status === "ok" || body.status === "already_submitted")) {
        setDone(true);
        return;
      }

      if (res.status === 404) {
        setFormError(
          "This link isn't valid anymore. Please ask your agency for a new one.",
        );
        return;
      }

      if (res.status === 429) {
        setFormError("Too many attempts — please wait a moment and try again.");
        return;
      }

      setFormError("Something went wrong — please try again.");
    } catch {
      setFormError("Couldn't reach the server — check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </span>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
          Thanks, {clientName}!
        </h2>
        <p className="mt-2 text-slate-600">
          {agencyName
            ? `Your details are with ${agencyName}.`
            : "Your details are with your agency."}
        </p>
        <p className="mt-4 text-sm text-slate-400">You can close this page.</p>
      </div>
    );
  }

  const inputClass = (invalid?: string) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
      invalid
        ? "border-red-400"
        : "border-slate-200 focus-visible:border-indigo-500"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      {/* 1. Business / brand name */}
      <div>
        <label
          htmlFor="onb-business"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Business / brand name
        </label>
        <input
          id="onb-business"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Studio"
          aria-invalid={errors.businessName ? true : undefined}
          aria-describedby={errors.businessName ? "onb-business-error" : undefined}
          className={inputClass(errors.businessName)}
        />
        {errors.businessName && (
          <p id="onb-business-error" className="mt-1.5 text-sm text-red-500">
            {errors.businessName}
          </p>
        )}
      </div>

      {/* 2. Website (optional) */}
      <div>
        <label
          htmlFor="onb-website"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Website <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="onb-website"
          type="text"
          inputMode="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="acme.com"
          className={inputClass()}
        />
      </div>

      {/* 3. Needs */}
      <div>
        <label
          htmlFor="onb-needs"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          What do you need from us?
        </label>
        <textarea
          id="onb-needs"
          rows={4}
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          placeholder="A new brand identity and a landing page…"
          aria-invalid={errors.needs ? true : undefined}
          aria-describedby={errors.needs ? "onb-needs-error" : undefined}
          className={inputClass(errors.needs)}
        />
        {errors.needs && (
          <p id="onb-needs-error" className="mt-1.5 text-sm text-red-500">
            {errors.needs}
          </p>
        )}
      </div>

      {/* 4. Preferred contact method */}
      <div>
        <label
          htmlFor="onb-method"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Preferred contact method
        </label>
        <select
          id="onb-method"
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
          className={inputClass()}
        >
          {CONTACT_METHODS.map((method) => (
            <option key={method} value={method}>
              {CONTACT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Contact details — label adapts to method */}
      <div>
        <label
          htmlFor="onb-contact"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          {CONTACT_VALUE_LABELS[contactMethod]}
        </label>
        <input
          id="onb-contact"
          type={contactMethod === "email" ? "email" : "tel"}
          inputMode={contactMethod === "email" ? "email" : "tel"}
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
          placeholder={
            contactMethod === "email" ? "you@acme.com" : "+1 555 000 1234"
          }
          aria-invalid={errors.contactValue ? true : undefined}
          aria-describedby={errors.contactValue ? "onb-contact-error" : undefined}
          className={inputClass(errors.contactValue)}
        />
        {errors.contactValue && (
          <p id="onb-contact-error" className="mt-1.5 text-sm text-red-500">
            {errors.contactValue}
          </p>
        )}
      </div>

      {/* 6. Look and feel */}
      <div>
        <label
          htmlFor="onb-look"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          What look and feel are you going for?
        </label>
        <textarea
          id="onb-look"
          rows={4}
          value={lookAndFeel}
          onChange={(e) => setLookAndFeel(e.target.value)}
          placeholder="Clean and modern, lots of white space…"
          aria-invalid={errors.lookAndFeel ? true : undefined}
          aria-describedby="onb-look-help onb-look-error"
          className={inputClass(errors.lookAndFeel)}
        />
        <p id="onb-look-help" className="mt-1.5 text-sm text-slate-400">
          Colours, style, brands you like — anything that helps.
        </p>
        {errors.lookAndFeel && (
          <p id="onb-look-error" className="mt-1 text-sm text-red-500">
            {errors.lookAndFeel}
          </p>
        )}
      </div>

      {/* Honest file-upload placeholder */}
      <div className="flex gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <Paperclip
          className="mt-0.5 h-5 w-5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <p className="text-sm leading-relaxed text-slate-500">
          File uploads (logos, brand assets, documents) are coming soon — your
          agency will follow up if they need files.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting…
          </>
        ) : (
          <>
            Submit details
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      {formError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
        >
          {formError}
        </p>
      )}
    </form>
  );
}
