"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

// Brief auto-dismissing confirmation toast. Entrance uses the shared
// animate-fade-in class, which is already disabled under prefers-reduced-motion.
export default function Toast({
  message,
  onDone,
  duration = 2500,
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  useEffect(() => {
    const id = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(id);
  }, [message, duration, onDone]);

  return (
    <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/20 animate-fade-in"
      >
        <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        {message}
      </div>
    </div>
  );
}
