"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Mail,
  TriangleAlert,
  User,
  X,
} from "lucide-react";
import Dialog from "@/components/app/Dialog";
import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// What actually happened after the client was created.
type Result =
  | { kind: "sent"; name: string }
  | { kind: "failed"; name: string; reason: string }
  | { kind: "skipped"; name: string };

export default function InviteClientModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Reset everything each time the modal is opened afresh.
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setErrors({});
      setFormError(null);
      setSubmitting(false);
      setResult(null);
    }
  }, [open]);

  function validate() {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = "Enter the client's name.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);

    // Derive user_id from the session — never trust a client-supplied value.
    // (RLS also enforces user_id = auth.uid() on insert.)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      setFormError("Your session expired — please log in again.");
      return;
    }

    const trimmedName = name.trim();
    const { data: created, error } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name: trimmedName,
        email: email.trim().toLowerCase(),
        status: "invited",
      })
      .select("id")
      .single();

    if (error || !created) {
      setSubmitting(false);
      // 23505 = unique_violation on (user_id, email).
      if (error?.code === "23505") {
        setErrors({ email: "You've already added this client." });
      } else {
        setFormError("Something went wrong — please try again.");
      }
      return;
    }

    // The client exists now — refresh the table behind the modal regardless of
    // what happens with the email. A failed send never rolls this back.
    onSuccess();

    // Fire the automatic invite email (server decides sent / skipped-draft /
    // failed and records the run). Report exactly what happened.
    try {
      const res = await fetch(`/api/clients/${created.id}/send-invite`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trigger: "client-invited" }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.status === "sent") {
        setResult({ kind: "sent", name: trimmedName });
      } else if (res.ok && body.status === "skipped") {
        setResult({ kind: "skipped", name: trimmedName });
      } else {
        setResult({
          kind: "failed",
          name: trimmedName,
          reason: body.reason ?? body.error ?? `HTTP ${res.status}`,
        });
      }
    } catch (err) {
      setResult({
        kind: "failed",
        name: trimmedName,
        reason: err instanceof Error ? err.message : "Network error.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="invite-title"
      className="max-w-md"
    >
      {result ? (
        <ResultView result={result} onDone={onClose} />
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="invite-title"
                className="text-lg font-bold tracking-tight text-slate-900"
              >
                Invite a client
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Add a client to start tracking their onboarding.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="client-name"
                className="mb-1.5 block text-sm font-semibold text-slate-800"
              >
                Client name
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="client-name"
                  name="client-name"
                  type="text"
                  autoComplete="off"
                  placeholder="Acme Studio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "client-name-error" : undefined}
                  className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    errors.name
                      ? "border-red-400"
                      : "border-slate-200 focus-visible:border-indigo-500"
                  }`}
                />
              </div>
              {errors.name && (
                <p id="client-name-error" className="mt-1.5 text-sm text-red-500">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="client-email"
                className="mb-1.5 block text-sm font-semibold text-slate-800"
              >
                Client email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="client-email"
                  name="client-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  placeholder="hello@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "client-email-error" : undefined}
                  className={`w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                    errors.email
                      ? "border-red-400"
                      : "border-slate-200 focus-visible:border-indigo-500"
                  }`}
                />
              </div>
              {errors.email && (
                <p id="client-email-error" className="mt-1.5 text-sm text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Adding…
                </>
              ) : (
                <>
                  Add client
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

            <p className="text-center text-xs leading-relaxed text-slate-400">
              When your automation is enabled, the invite email is sent
              automatically. In Draft, the client is added without an email.
            </p>
          </form>
        </>
      )}
    </Dialog>
  );
}

function ResultView({ result, onDone }: { result: Result; onDone: () => void }) {
  const config =
    result.kind === "sent"
      ? {
          icon: CheckCircle2,
          iconClass: "bg-emerald-50 text-emerald-600",
          title: "Client added — invite sent",
          body: `${result.name} was added and their invite email is on its way.`,
        }
      : result.kind === "skipped"
        ? {
            icon: Info,
            iconClass: "bg-slate-100 text-slate-500",
            title: "Client added — no email sent",
            body: `${result.name} was added, but your automation is in Draft, so no invite email was sent. Turn it on in Automations, or use Copy link to share manually.`,
          }
        : {
            icon: TriangleAlert,
            iconClass: "bg-amber-50 text-amber-600",
            title: "Client added — email failed",
            body: `${result.name} was added, but the invite email didn't send: ${(result as { reason: string }).reason}. They're saved — use Copy link on the Clients page to share their onboarding link.`,
          };

  const Icon = config.icon;
  return (
    <div className="text-center">
      <div
        className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${config.iconClass}`}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2
        id="invite-title"
        className="mt-4 text-lg font-bold tracking-tight text-slate-900"
      >
        {config.title}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {config.body}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Done
      </button>
    </div>
  );
}
