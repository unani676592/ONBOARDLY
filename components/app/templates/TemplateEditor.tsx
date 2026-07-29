"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Loader2,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  DEFAULT_INVITE_TEMPLATE,
  TEMPLATE_VARIABLES,
  validateTemplate,
  type EmailTemplate,
} from "@/lib/email/inviteTemplate";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Field = "subject" | "body";

// Sample values used only for the live preview — never sent. At send time
// (step 3) these become each client's real details.
const SAMPLE_CLIENT_NAME = "Ramesh";

export default function TemplateEditor({
  initial,
  hasSaved,
  agencyName,
}: {
  initial: EmailTemplate;
  hasSaved: boolean;
  agencyName: string | null;
}) {
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  // The last-persisted copy — dirty state and "Saved" compare against this.
  const [baseline, setBaseline] = useState<EmailTemplate>(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<Field>("body");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Where to place the caret after an insert re-renders the field.
  const pendingCaret = useRef<{ field: Field; pos: number } | null>(null);

  const dirty = subject !== baseline.subject || body !== baseline.body;

  // Live validation, same rules the save API enforces. Errors block saving;
  // unknown tokens are a non-blocking heads-up.
  const { errors, unknownTokens } = validateTemplate({ subject, body });
  const hasErrors = errors.length > 0;

  // A sample magic link that reflects the real app origin once mounted.
  const [sampleLink, setSampleLink] = useState(
    "https://your-app.example/onboard/sample-invite",
  );
  useEffect(() => {
    setSampleLink(`${window.location.origin}/onboard/sample-invite`);
  }, []);

  // Restore the caret after inserting a variable so typing continues in place.
  useEffect(() => {
    const pending = pendingCaret.current;
    if (!pending) return;
    const el = pending.field === "subject" ? subjectRef.current : bodyRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(pending.pos, pending.pos);
    }
    pendingCaret.current = null;
  }, [subject, body]);

  // Warn before a full-page unload (refresh / close / external nav) when there
  // are unsaved edits. Note: Next.js soft navigation between app pages isn't
  // covered by this browser event.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const insertVariable = useCallback(
    (token: string) => {
      const field = activeField;
      const el = field === "subject" ? subjectRef.current : bodyRef.current;
      const value = field === "subject" ? subject : body;
      const start = el?.selectionStart ?? value.length;
      const end = el?.selectionEnd ?? start;
      const next = value.slice(0, start) + token + value.slice(end);
      if (field === "subject") setSubject(next);
      else setBody(next);
      pendingCaret.current = { field, pos: start + token.length };
      if (status === "saved") setStatus("idle");
    },
    [activeField, subject, body, status],
  );

  async function handleSave() {
    // Don't attempt an invalid save — surface the first blocking issue instead.
    // (The button is disabled on errors; this also guards the retry link.)
    if (errors.length > 0) {
      setStatus("error");
      setError(errors[0]);
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.template) {
        setBaseline({ subject: data.template.subject, body: data.template.body });
        setSubject(data.template.subject);
        setBody(data.template.body);
        setStatus("saved");
      } else {
        setStatus("error");
        setError(data.error ?? `Couldn’t save (HTTP ${res.status}).`);
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    }
  }

  function handleReset() {
    const ok = window.confirm(
      "Reset to the default invite email? This replaces the current subject and body — your custom copy is discarded once you save.",
    );
    if (!ok) return;
    setSubject(DEFAULT_INVITE_TEMPLATE.subject);
    setBody(DEFAULT_INVITE_TEMPLATE.body);
    setStatus("idle");
    setError(null);
  }

  const fill = useCallback(
    (text: string) =>
      text
        .replaceAll("{{client_name}}", SAMPLE_CLIENT_NAME)
        .replaceAll("{{agency_name}}", agencyName || "Your agency")
        .replaceAll("{{magic_link}}", sampleLink),
    [agencyName, sampleLink],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900">
            Invite email
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {hasSaved
              ? "Your saved template."
              : "Starting from the default template — save to make it yours."}
          </p>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Subject */}
          <div>
            <label
              htmlFor="tpl-subject"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Subject
            </label>
            <input
              id="tpl-subject"
              ref={subjectRef}
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setActiveField("subject")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            />
          </div>

          {/* Body */}
          <div>
            <label
              htmlFor="tpl-body"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Body
            </label>
            <textarea
              id="tpl-body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setActiveField("body")}
              rows={12}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Plain text only. Line breaks are kept as written.
            </p>
          </div>

          {/* Insert variable */}
          <div className="rounded-xl bg-slate-50 px-4 py-4">
            <p className="text-sm font-semibold text-slate-700">Insert a variable</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
              Click to drop one into the{" "}
              <span className="font-medium text-slate-600">
                {activeField === "subject" ? "subject" : "body"}
              </span>{" "}
              at your cursor. Each is replaced with the client’s real details when
              the invite is sent.
            </p>
            <ul className="mt-3 space-y-2">
              {TEMPLATE_VARIABLES.map((v) => (
                <li key={v.key} className="flex items-center gap-3">
                  <button
                    type="button"
                    // Keep the field focused (and its caret) through the click.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertVariable(v.token)}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-indigo-600 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {v.token}
                  </button>
                  <span className="text-xs leading-snug text-slate-500">
                    {v.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Blocking validation errors */}
          {hasErrors && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {errors.length > 1
                  ? "Fix these before saving:"
                  : "Fix this before saving:"}
              </div>
              <ul className="mt-1.5 space-y-1 pl-6 text-sm leading-relaxed text-rose-600">
                {errors.map((msg) => (
                  <li key={msg} className="list-disc">
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Non-blocking warning: unrecognized variables */}
          {unknownTokens.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {unknownTokens.length > 1
                  ? "These variables aren’t recognized"
                  : "This variable isn’t recognized"}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-amber-700/90">
                They’ll be sent to the client exactly as written, not replaced:{" "}
                {unknownTokens.map((t, i) => (
                  <span key={t}>
                    {i > 0 && ", "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[13px] text-amber-800">
                      {t}
                    </code>
                  </span>
                ))}
                . Supported variables are{" "}
                {TEMPLATE_VARIABLES.map((v, i) => (
                  <span key={v.key}>
                    {i > 0 && ", "}
                    <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[13px] text-amber-800">
                      {v.token}
                    </code>
                  </span>
                ))}
                .
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || status === "saving" || hasErrors}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {status === "saving" ? "Saving…" : "Save changes"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset to default
            </button>

            {/* Status */}
            {status === "saved" && !dirty && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" aria-hidden="true" />
                Saved
              </span>
            )}
            {dirty && status !== "saving" && (
              <span className="text-sm text-slate-400">Unsaved changes</span>
            )}
          </div>

          {status === "error" && error && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm leading-relaxed text-rose-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {error}{" "}
                <button
                  type="button"
                  onClick={handleSave}
                  className="font-semibold underline underline-offset-2 hover:text-rose-700"
                >
                  Retry
                </button>
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold tracking-tight text-slate-900">Preview</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Sample values shown. Real details are filled in when each invite sends.
          </p>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {/* Subject line */}
            <div className="border-b border-slate-200 bg-white px-5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Subject
              </p>
              <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
                {fill(subject) || (
                  <span className="font-normal italic text-slate-400">
                    (empty subject)
                  </span>
                )}
              </p>
            </div>
            {/* Body */}
            <div className="px-5 py-4">
              {fill(body).trim() ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                  {fill(body)}
                </p>
              ) : (
                <p className="text-sm italic text-slate-400">(empty body)</p>
              )}
            </div>
          </div>

          <dl className="mt-4 space-y-1.5 text-xs text-slate-500">
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-400">client_name</dt>
              <dd className="font-medium text-slate-600">{SAMPLE_CLIENT_NAME}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-400">agency_name</dt>
              <dd className="font-medium text-slate-600">
                {agencyName || (
                  <span className="italic text-slate-400">
                    Your agency (set a name in Settings)
                  </span>
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-slate-400">magic_link</dt>
              <dd className="min-w-0 flex-1 truncate font-medium text-slate-600">
                {sampleLink}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
