"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2, Mail, User, X } from "lucide-react";
import Dialog from "@/components/app/Dialog";
import { supabase } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  // Reset the form each time the modal is opened afresh.
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setErrors({});
      setFormError(null);
      setSubmitting(false);
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

    const { error } = await supabase.from("clients").insert({
      user_id: user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      status: "invited",
    });

    setSubmitting(false);

    if (error) {
      // 23505 = unique_violation on (user_id, email).
      if (error.code === "23505") {
        setErrors({ email: "You've already added this client." });
      } else {
        setFormError("Something went wrong — please try again.");
      }
      return;
    }

    onSuccess();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="invite-title"
      className="max-w-md"
    >
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
          Invite emails go out automatically once magic links launch — for now,
          clients are tracked here.
        </p>
      </form>
    </Dialog>
  );
}
