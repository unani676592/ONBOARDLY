"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MinusCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { relativeTime } from "@/lib/time";
import {
  ACTION_SUBTYPE_LABELS,
  TRIGGER_LABELS,
  type AutomationRun,
  type RunStatus,
} from "@/lib/automationRuns";

// Real per-action run history for the automation. Reads automation_runs (RLS-
// scoped to the signed-in agency) on mount, most recent first. No fabricated
// rows — an empty table shows the honest empty state.
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
            When your automation runs, each action shows up here — the client, what
            ran, and the outcome with its reason.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ul className="divide-y divide-slate-100">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </ul>
    </Shell>
  );
}

// --- One activity row -------------------------------------------------------

type Tone = "success" | "failed" | "skipped";

function toneOf(status: RunStatus): Tone {
  if (status === "ran" || status === "sent") return "success";
  if (status === "skipped") return "skipped";
  return "failed";
}

// Legacy invite rows (pre-engine) have a null subtype and were always emails.
function actionLabelOf(run: AutomationRun): string {
  if (!run.action_subtype) return "Send email";
  return ACTION_SUBTYPE_LABELS[run.action_subtype] ?? run.action_subtype;
}

function statusWordOf(run: AutomationRun, tone: Tone): string {
  const isEmail = !run.action_subtype || run.action_subtype === "send-email";
  if (tone === "success") return isEmail ? "Sent" : "Ran";
  if (tone === "failed") return "Failed";
  return "Skipped";
}

const TONE_STYLES: Record<
  Tone,
  { badge: string; word: string; reason: string }
> = {
  success: {
    badge: "bg-emerald-50 text-emerald-600",
    word: "text-emerald-600",
    reason: "",
  },
  failed: {
    badge: "bg-rose-50 text-rose-600",
    word: "text-rose-600",
    reason: "bg-rose-50 text-rose-600",
  },
  skipped: {
    badge: "bg-slate-100 text-slate-500",
    word: "text-slate-500",
    reason: "bg-slate-50 text-slate-500",
  },
};

function RunRow({ run }: { run: AutomationRun }) {
  const tone = toneOf(run.status);
  const styles = TONE_STYLES[tone];
  const actionLabel = actionLabelOf(run);
  const statusWord = statusWordOf(run, tone);
  // "not implemented" reads more naturally as a sentence in the reason box.
  const reason =
    run.error === "not implemented" ? "Not implemented yet." : run.error;

  return (
    <li className="flex items-start gap-3 px-5 py-4">
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${styles.badge}`}
      >
        {tone === "success" ? (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        ) : tone === "failed" ? (
          <XCircle className="h-4 w-4" aria-hidden="true" />
        ) : (
          <MinusCircle className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="truncate text-sm font-semibold text-slate-900">
            {run.client_name || "Unknown client"}
          </p>
          {run.client_email && (
            <span className="text-xs text-slate-400">{run.client_email}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{actionLabel}</span> ·{" "}
          <span className={styles.word}>{statusWord}</span> ·{" "}
          {TRIGGER_LABELS[run.trigger]} · {relativeTime(run.created_at)}
        </p>
        {tone !== "success" && reason && (
          <p
            className={`mt-1 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed ${styles.reason}`}
          >
            {reason}
          </p>
        )}
      </div>
    </li>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
      {children}
    </div>
  );
}
