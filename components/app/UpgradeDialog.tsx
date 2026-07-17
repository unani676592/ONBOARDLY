"use client";

import { Sparkles, X } from "lucide-react";
import Dialog from "@/components/app/Dialog";

export default function UpgradeDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="upgrade-title"
      describedBy="upgrade-desc"
      className="max-w-sm text-center"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Sparkles className="h-7 w-7" aria-hidden="true" />
      </div>

      <h2
        id="upgrade-title"
        className="mt-4 text-lg font-bold tracking-tight text-slate-900"
      >
        Pricing coming soon
      </h2>
      <p id="upgrade-desc" className="mt-2 text-sm text-slate-500">
        Onboardly is in early access. Paid plans and premium features are on the
        way — you&rsquo;ll be the first to know.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Got it
      </button>
    </Dialog>
  );
}
