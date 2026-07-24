"use client";

import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import { TRIGGER_LABELS, type AutomationRun } from "@/lib/automationRuns";

// Real run history for the automation. Reads automation_runs (RLS-scoped to the
// signed-in agency) on mount. No fabricated rows — an empty table shows the
// honest empty state.
export default function ActivityTab() {
  const [runs, setRuns] = useState<AutomationRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: err } = await supabase
        .from("automation_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (err) {
        setError(err.message);
        return;
      }
      setRuns((data as AutomationRun[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <Shell>
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Couldn’t load activity
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            {error}
          </p>
        </div>
      </Shell>
    );
  }

  if (runs === null) {
    return (
      <Shell>
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-500">Loading activity…</p>
        </div>
      </Shell>
    );
  }

  if (runs.length === 0) {
    return (
      <Shell>
        <div className="flex flex-col items-center px-6 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
            <Activity className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-5 text-base font-bold tracking-tight text-slate-900">
            No activity yet
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            When your automation runs, each invite email shows up here — sent or
            failed, with the reason.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ul className="divide-y divide-slate-100">
        {runs.map((run) => {
          const sent = run.status === "sent";
          return (
            <li key={run.id} className="flex items-start gap-3 px-5 py-4">
              <span
                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                  sent ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                }`}
              >
                {sent ? (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {run.client_name}
                  </p>
                  <span className="text-xs text-slate-400">{run.client_email}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className={sent ? "text-emerald-600" : "text-rose-600"}>
                    {sent ? "Invite sent" : "Invite failed"}
                  </span>{" "}
                  · {TRIGGER_LABELS[run.trigger]} · {relativeTime(run.created_at)}
                </p>
                {!sent && run.error && (
                  <p className="mt-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs leading-relaxed text-rose-600">
                    {run.error}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
      {children}
    </div>
  );
}
