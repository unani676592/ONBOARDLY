"use client";

import { ArrowRight } from "lucide-react";
import { useInvite } from "@/components/app/invite-context";

/**
 * Opens the shared invite modal (which lives in the app shell). Used by the
 * empty-state calls-to-action on the dashboard and clients pages.
 */
export default function InviteTrigger({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  const { open } = useInvite();

  return (
    <button
      type="button"
      onClick={open}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${className}`}
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
