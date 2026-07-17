"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/dashboard/LogoutButton";
import type { SettingsUser } from "@/components/app/settings/settings-context";

export default function AccountTab({ user }: { user: SettingsUser | null }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function validate() {
    const next: { password?: string; confirm?: string } = {};
    if (password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    if (confirm !== password) {
      next.confirm = "Passwords don't match.";
    }
    return next;
  }

  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setDone(false);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setFormError(
        error.message || "Couldn't update your password. Please try again.",
      );
      return;
    }
    setDone(true);
    setPassword("");
    setConfirm("");
    window.setTimeout(() => setDone(false), 2500);
  }

  return (
    <div className="space-y-8">
      {/* Email */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Email
        </h3>
        <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {user?.email || "—"}
        </p>
        <p className="mt-1.5 text-xs text-slate-400">Email changes coming soon.</p>
      </section>

      {/* Change password */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Change password
        </h3>
        <form
          onSubmit={handlePasswordChange}
          noValidate
          className="mt-4 space-y-4"
        >
          <div>
            <label
              htmlFor="settings-new-password"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              New password
            </label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? "settings-new-password-error" : undefined
              }
              className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                errors.password
                  ? "border-red-400"
                  : "border-slate-200 focus-visible:border-indigo-500"
              }`}
            />
            {errors.password && (
              <p
                id="settings-new-password-error"
                className="mt-1.5 text-sm text-red-500"
              >
                {errors.password}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settings-confirm-password"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Confirm new password
            </label>
            <input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={
                errors.confirm ? "settings-confirm-password-error" : undefined
              }
              className={`w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                errors.confirm
                  ? "border-red-400"
                  : "border-slate-200 focus-visible:border-indigo-500"
              }`}
            />
            {errors.confirm && (
              <p
                id="settings-confirm-password-error"
                className="mt-1.5 text-sm text-red-500"
              >
                {errors.confirm}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {saving ? "Updating…" : "Update password"}
            </button>
            {done && (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-fade-in"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Password updated
              </span>
            )}
            {formError && (
              <span role="alert" className="text-sm font-medium text-red-500">
                {formError}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Session */}
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Session
        </h3>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <h3 className="text-sm font-bold text-red-600">Danger zone</h3>
        <p className="mt-2 text-sm text-slate-600">
          Need to delete your account?{" "}
          <a
            href="mailto:support@onboardly.com?subject=Delete%20my%20account"
            className="font-semibold text-red-600 underline underline-offset-2 hover:text-red-700"
          >
            Contact us
          </a>{" "}
          and we&rsquo;ll handle it.
        </p>
      </section>
    </div>
  );
}
