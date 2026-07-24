"use client";

import "@xyflow/react/dist/style.css";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import WorkflowEditor from "./WorkflowEditor";
import ActivityTab from "./ActivityTab";
import { useWorkflowState } from "./useWorkflowState";

type Tab = "workflow" | "activity";

export default function AutomationBuilder() {
  const [tab, setTab] = useState<Tab>("workflow");
  const wf = useWorkflowState();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {wf.name}
              </h2>
              <StatusBadge enabled={wf.status === "enabled"} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{wf.description}</p>
          </div>

          <SaveControls wf={wf} />
        </div>
      </div>

      {/* Tabs + status toggle */}
      <div className="mt-5 flex shrink-0 items-center justify-between border-b border-slate-200">
        <div className="flex gap-6">
          <TabButton active={tab === "workflow"} onClick={() => setTab("workflow")}>
            Workflow
          </TabButton>
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
            Activity
          </TabButton>
        </div>
        <StatusToggle
          status={wf.status}
          onChange={(s) => wf.setStatus(s)}
          disabled={wf.loading}
        />
      </div>

      {/* Body */}
      {wf.loading ? (
        <BodyMessage>
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-500">Loading workflow…</p>
        </BodyMessage>
      ) : wf.loadError ? (
        <BodyMessage>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-rose-50 text-rose-500">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Couldn’t load your workflow
          </p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            {wf.loadError}
          </p>
          <button
            type="button"
            onClick={wf.reload}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
        </BodyMessage>
      ) : tab === "workflow" ? (
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <ReactFlowProvider>
            <WorkflowEditor wf={wf} />
          </ReactFlowProvider>
        </div>
      ) : (
        <ActivityTab />
      )}
    </div>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-amber-400"}`}
        aria-hidden="true"
      />
      {enabled ? "Enabled" : "Draft"}
    </span>
  );
}

function SaveControls({ wf }: { wf: ReturnType<typeof useWorkflowState> }) {
  const disabled = !wf.dirty || wf.saving || wf.loading;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        {wf.justSaved && !wf.dirty && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Check className="h-4 w-4" aria-hidden="true" />
            Saved
          </span>
        )}
        <button
          type="button"
          onClick={wf.save}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
        >
          {wf.saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save changes
            </>
          )}
        </button>
      </div>

      {wf.saveError && (
        <div
          role="alert"
          className="flex items-center gap-2 text-xs font-medium text-rose-600"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Save failed: {wf.saveError}</span>
          <button
            type="button"
            onClick={wf.save}
            className="font-semibold text-indigo-600 underline-offset-2 hover:underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function StatusToggle({
  status,
  onChange,
  disabled,
}: {
  status: "draft" | "enabled";
  onChange: (s: "draft" | "enabled") => void;
  disabled?: boolean;
}) {
  const enabled = status === "enabled";
  return (
    <div className="flex items-center gap-2 pb-2">
      <span className="text-sm font-medium text-slate-600">
        {enabled ? "Enabled" : "Draft"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle draft or enabled"
        disabled={disabled}
        onClick={() => onChange(enabled ? "draft" : "enabled")}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
          enabled ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
      <span
        title="When enabled, inviting a client automatically emails them their invite. In Draft, no invite emails are sent."
        className="grid h-5 w-5 place-items-center text-slate-400"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
  );
}

function BodyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center">
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? "border-indigo-600 text-indigo-600"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}
