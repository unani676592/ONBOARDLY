"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { initialsFor } from "@/lib/user";
import type { SettingsUser } from "@/components/app/settings/settings-context";

const WORK_TYPES = [
  "Marketing Agency",
  "Video Editing",
  "Design Agency",
  "Freelancer",
  "Coach",
  "Consultant",
  "Other",
];

export default function GeneralTab({ user }: { user: SettingsUser | null }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [workType, setWorkType] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed the form from the freshly loaded user metadata.
  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setAgencyName(user.agencyName);
      setWorkType(user.workType);
    }
  }, [user]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        agency_name: agencyName.trim(),
        work_type: workType,
      },
    });
    setSaving(false);
    if (updateError) {
      setError("Couldn't save your changes. Please try again.");
      return;
    }
    setSaved(true);
    // Re-read the session on the server so the dashboard greeting and the
    // avatar initials behind the modal update immediately.
    router.refresh();
    window.setTimeout(() => setSaved(false), 2000);
  }

  const initials = initialsFor(fullName.trim() || null, user?.email ?? "");

  return (
    <form onSubmit={handleSave} noValidate className="space-y-8">
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Profile
        </h3>

        <div className="mt-4 flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700">
            {initials}
          </span>
          <p className="text-sm text-slate-500">
            Your initials are used as your avatar across Onboardly.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="settings-full-name"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Full name
            </label>
            <input
              id="settings-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            />
          </div>

          <div>
            <label
              htmlFor="settings-agency-name"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Agency name
            </label>
            <input
              id="settings-agency-name"
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Your agency or business"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            />
          </div>

          <div>
            <label
              htmlFor="settings-work-type"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              What best describes your work?
            </label>
            <select
              id="settings-work-type"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            >
              <option value="" disabled>
                Select an option
              </option>
              {WORK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 animate-fade-in"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm font-medium text-red-500">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
