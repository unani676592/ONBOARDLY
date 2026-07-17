"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail, User, X } from "lucide-react";
import Dialog from "@/components/app/Dialog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InviteClientModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [sent, setSent] = useState(false);

  // Reset the form each time the modal is opened afresh.
  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setErrors({});
      setSent(false);
    }
  }, [open]);

  function validate() {
    const next: { name?: string; email?: string } = {};
    if (!name.trim()) next.name = "Enter the client's name.";
    if (!EMAIL_RE.test(email.trim())) next.email = "Enter a valid email address.";
    return next;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    // No account is created and no email is sent — the clients table is the
    // next phase. We only surface an honest "coming soon" notice.
    setSent(true);
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
            Send a magic-link onboarding invite — no account needed on their end.
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          Send invite
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {sent && (
          <p
            role="status"
            className="rounded-xl bg-indigo-50 px-4 py-3 text-center text-sm font-medium text-indigo-700"
          >
            Client invitations activate in the next update — coming very soon.
          </p>
        )}
      </form>
    </Dialog>
  );
}
