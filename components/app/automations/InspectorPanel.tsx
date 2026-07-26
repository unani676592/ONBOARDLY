"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Loader2,
  MousePointerClick,
  X,
} from "lucide-react";
import {
  ACCENTS,
  BLOCKS,
  DEFAULT_EMAIL_SETTINGS,
  EMAIL_TEMPLATES,
  type SendEmailSettings,
  type WorkflowNode,
  type WorkflowNodeData,
} from "./workflow-data";
import type { NotionConnectionStatus } from "@/lib/notion/types";

type Props = {
  node: WorkflowNode | null;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const labelClass = "block text-xs font-semibold text-slate-600";

export default function InspectorPanel({ node, onChange, onClose }: Props) {
  if (!node) {
    return (
      <Panel>
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <MousePointerClick className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Select a block to configure it
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Its settings will appear here.
          </p>
        </div>
      </Panel>
    );
  }

  const def = BLOCKS[node.data.subtype];
  const accent = ACCENTS[def.accent];
  const Icon = def.icon;

  return (
    <Panel>
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accent.chip}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">
            {node.data.title}
          </p>
          <p className={`text-xs font-semibold ${accent.label}`}>{def.typeLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {node.data.kind === "trigger" ? (
          <TriggerBody fires={def.fires} />
        ) : node.data.subtype === "send-email" ? (
          <SendEmailBody node={node} onChange={onChange} />
        ) : node.data.subtype === "add-crm-record" ? (
          <AddToNotionBody />
        ) : (
          <p className="text-sm text-slate-500">
            This block has no settings yet.
          </p>
        )}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
      {children}
    </div>
  );
}

function TriggerBody({ fires }: { fires?: string }) {
  return (
    <>
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          When this runs
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {fires ?? "This trigger starts the workflow."}
        </p>
      </div>
      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        Triggers are fixed by the event they listen for, so there’s nothing to
        edit here.
      </p>
    </>
  );
}

function SendEmailBody({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (patch: Partial<WorkflowNodeData>) => void;
}) {
  const settings: SendEmailSettings = node.data.settings ?? DEFAULT_EMAIL_SETTINGS;

  function patchSettings(change: Partial<SendEmailSettings>) {
    onChange({ settings: { ...settings, ...change } });
  }

  return (
    <>
      {/* Editable node fields */}
      <div>
        <label className={labelClass} htmlFor="node-title">
          Title
        </label>
        <input
          id="node-title"
          className={`${inputClass} mt-1.5`}
          value={node.data.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor="node-desc">
          Description
        </label>
        <input
          id="node-desc"
          className={`${inputClass} mt-1.5`}
          value={node.data.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="border-t border-slate-100 pt-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Settings
        </h4>

        <div className="mt-3 space-y-4">
          <div>
            <label className={labelClass} htmlFor="email-template">
              Email template
            </label>
            <select
              id="email-template"
              className={`${inputClass} mt-1.5`}
              value={settings.template}
              onChange={(e) => patchSettings({ template: e.target.value })}
            >
              {EMAIL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              The default invite email is the only template for now.
            </p>
          </div>

          <Toggle
            label="Include magic link"
            hint="A unique magic link is added automatically."
            checked={settings.includeMagicLink}
            onChange={(v) => patchSettings({ includeMagicLink: v })}
          />

          <div>
            <label className={labelClass} htmlFor="sender-name">
              Sender name
            </label>
            <input
              id="sender-name"
              className={`${inputClass} mt-1.5`}
              placeholder="e.g. Aayush from Onboardly"
              value={settings.senderName}
              onChange={(e) => patchSettings({ senderName: e.target.value })}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="reply-to">
              Reply-to email
            </label>
            <input
              id="reply-to"
              type="email"
              className={`${inputClass} mt-1.5`}
              placeholder="hello@youragency.com"
              value={settings.replyTo}
              onChange={(e) => patchSettings({ replyTo: e.target.value })}
            />
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        UI only for now — these settings aren’t saved or sent yet.
      </p>
    </>
  );
}

// Connection-aware body for the "Add to Notion" action. The block is draggable
// regardless, but it only does anything once Notion is connected — so we tell
// the truth and, when disconnected, point the user to Integrations rather than
// letting the node silently no-op at run time.
function AddToNotionBody() {
  const [status, setStatus] = useState<NotionConnectionStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/integrations/notion");
        const body = (await res.json()) as NotionConnectionStatus;
        if (active) setStatus(body);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          What this does
        </h4>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Creates a row in your Notion database for each invited client — name,
          email, status, and the invited date.
        </p>
      </div>

      {status === null && !failed && (
        <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Checking your Notion connection…
        </p>
      )}

      {failed && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          Couldn’t check your Notion connection right now.
        </p>
      )}

      {status?.connected && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Notion connected
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-700/80">
            Rows are added to{" "}
            <span className="font-semibold">
              {status.databaseTitle || "your database"}
            </span>
            . It needs a title, an Email, a Status (Select), and a Date property.
          </p>
        </div>
      )}

      {status && !status.connected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-amber-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Notion isn’t connected yet, so this step will be skipped when the
            workflow runs. Connect it to start writing client records.
          </p>
          <Link
            href="/integrations"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            Connect Notion
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          checked ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
