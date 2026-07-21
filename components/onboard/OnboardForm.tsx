"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle2,
  File as FileIcon,
  Loader2,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import {
  CONTACT_METHODS,
  CONTACT_METHOD_LABELS,
  CONTACT_VALUE_LABELS,
  type ContactMethod,
} from "@/lib/clients";
import {
  ACCEPT_ATTR,
  MAX_FILES,
  MAX_FILE_BYTES,
  formatBytes,
  validateFile,
} from "@/lib/uploads";

type Errors = Partial<
  Record<
    "businessName" | "needs" | "contactValue" | "lookAndFeel",
    string
  >
>;

type StagedStatus = "staged" | "uploading" | "done" | "failed";
type StagedFile = {
  id: string;
  file: File;
  status: StagedStatus;
  error?: string;
};

export default function OnboardForm({
  token,
  clientName,
  agencyName,
  alreadySubmitted,
}: {
  token: string;
  clientName: string;
  agencyName: string;
  alreadySubmitted: boolean;
}) {
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [needs, setNeeds] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("email");
  const [contactValue, setContactValue] = useState("");
  const [lookAndFeel, setLookAndFeel] = useState("");

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Show the confirmation if the client already submitted, or once they do now.
  const [done, setDone] = useState(alreadySubmitted);

  // Staged file uploads. Each file moves staged → uploading → done | failed.
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  // Set once the six intake fields have been saved, so a file-only retry after
  // a partial failure doesn't re-submit them.
  const [fieldsSaved, setFieldsSaved] = useState(false);

  // Once the fields are saved and every staged file has uploaded, advance to the
  // thank-you screen. Covers all completion paths (submit, retry-all, retry-one)
  // without each one having to re-derive "are we finished?".
  useEffect(() => {
    if (
      fieldsSaved &&
      !submitting &&
      files.length > 0 &&
      files.every((s) => s.status === "done")
    ) {
      setDone(true);
    }
  }, [fieldsSaved, submitting, files]);

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    const rejected: string[] = [];
    const accepted: StagedFile[] = [];
    let count = files.length;

    for (const file of Array.from(incoming)) {
      if (count >= MAX_FILES) {
        rejected.push(`${file.name}: over the ${MAX_FILES}-file limit`);
        continue;
      }
      // Skip files already staged / just accepted (same name + size).
      const isDupe = (s: StagedFile) =>
        s.file.name === file.name && s.file.size === file.size;
      if (files.some(isDupe) || accepted.some(isDupe)) continue;

      const invalid = validateFile(file);
      if (invalid) {
        rejected.push(`${file.name}: ${invalid}`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file, status: "staged" });
      count += 1;
    }

    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    setFileError(rejected.length ? rejected.join(" · ") : null);
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    // Reset so selecting the same file again still fires onChange.
    e.target.value = "";
  }

  function removeFile(id: string) {
    if (submitting) return;
    setFiles((prev) => prev.filter((s) => s.id !== id));
  }

  // Upload a subset of staged/failed files in one request. Marks each done or
  // failed from the server's per-file results; returns true only if all
  // uploaded. Never throws.
  async function uploadBatch(subset: StagedFile[]): Promise<boolean> {
    if (subset.length === 0) return true;
    const ids = new Set(subset.map((s) => s.id));
    setFiles((prev) =>
      prev.map((s) =>
        ids.has(s.id) ? { ...s, status: "uploading", error: undefined } : s,
      ),
    );

    try {
      const fd = new FormData();
      subset.forEach((s) => fd.append("files", s.file, s.file.name));

      const res = await fetch(
        `/api/onboard/${encodeURIComponent(token)}/files`,
        { method: "POST", body: fd },
      );

      if (!res.ok) {
        setFormError(
          res.status === 404
            ? "This link isn't valid anymore. Please ask your agency for a new one."
            : res.status === 429
              ? "Too many attempts — please wait a moment and try again."
              : "Some files couldn't be uploaded — please retry.",
        );
        setFiles((prev) =>
          prev.map((s) =>
            ids.has(s.id) ? { ...s, status: "failed", error: "Not uploaded" } : s,
          ),
        );
        return false;
      }

      const body = (await res.json().catch(() => ({}))) as {
        results?: { ok: boolean; error?: string }[];
      };
      const results = body.results ?? [];

      // Server preserves order, so the i-th result maps to the i-th uploaded
      // file (iterating prev in the same order the subset was built).
      setFiles((prev) => {
        let i = 0;
        return prev.map((s) => {
          if (!ids.has(s.id)) return s;
          const r = results[i++];
          return r?.ok
            ? { ...s, status: "done", error: undefined }
            : { ...s, status: "failed", error: r?.error ?? "Upload failed" };
        });
      });

      const allOk =
        results.length === subset.length && results.every((r) => r.ok);
      if (!allOk) {
        setFormError(
          "Your details were saved, but some files didn't upload. Retry the failed ones below.",
        );
      }
      return allOk;
    } catch {
      setFormError("Couldn't upload files — check your connection and retry.");
      setFiles((prev) =>
        prev.map((s) =>
          ids.has(s.id) ? { ...s, status: "failed", error: "Not uploaded" } : s,
        ),
      );
      return false;
    }
  }

  async function retryOne(id: string) {
    if (submitting) return;
    const target = files.find((s) => s.id === id);
    if (!target) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await uploadBatch([target]);
    } finally {
      setSubmitting(false);
    }
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!businessName.trim()) next.businessName = "Enter your business or brand name.";
    if (!needs.trim()) next.needs = "Let us know what you need.";
    if (!contactValue.trim())
      next.contactValue = `Enter ${CONTACT_VALUE_LABELS[contactMethod].toLowerCase()}.`;
    if (!lookAndFeel.trim())
      next.lookAndFeel = "Tell us a little about the look and feel.";
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      // 1. Save the six intake fields (skip if already saved — e.g. this is a
      //    retry after a partial file failure).
      if (!fieldsSaved) {
        const res = await fetch(`/api/onboard/${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: businessName.trim(),
            website: website.trim(),
            needs: needs.trim(),
            contactMethod,
            contactValue: contactValue.trim(),
            lookAndFeel: lookAndFeel.trim(),
          }),
        });

        const body = (await res.json().catch(() => ({}))) as {
          status?: string;
        };

        const saved =
          res.ok &&
          (body.status === "ok" || body.status === "already_submitted");

        if (!saved) {
          if (res.status === 404) {
            setFormError(
              "This link isn't valid anymore. Please ask your agency for a new one.",
            );
          } else if (res.status === 429) {
            setFormError(
              "Too many attempts — please wait a moment and try again.",
            );
          } else {
            setFormError("Something went wrong — please try again.");
          }
          return;
        }

        setFieldsSaved(true);
      }

      // 2. Fields are saved. Upload any files that still need it. With no files
      //    we're done immediately; otherwise the effect flips to the thank-you
      //    screen once every file has uploaded.
      const pending = files.filter(
        (s) => s.status === "staged" || s.status === "failed",
      );
      if (pending.length === 0 && files.length === 0) {
        setDone(true);
        return;
      }
      await uploadBatch(pending);
    } catch {
      setFormError("Couldn't reach the server — check your connection and retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
        </span>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
          Thanks, {clientName}!
        </h2>
        <p className="mt-2 text-slate-600">
          {agencyName
            ? `Your details are with ${agencyName}.`
            : "Your details are with your agency."}
        </p>
        <p className="mt-4 text-sm text-slate-400">You can close this page.</p>
      </div>
    );
  }

  const inputClass = (invalid?: string) =>
    `w-full rounded-xl border bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
      invalid
        ? "border-red-400"
        : "border-slate-200 focus-visible:border-indigo-500"
    }`;

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
      {/* 1. Business / brand name */}
      <div>
        <label
          htmlFor="onb-business"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Business / brand name
        </label>
        <input
          id="onb-business"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Studio"
          aria-invalid={errors.businessName ? true : undefined}
          aria-describedby={errors.businessName ? "onb-business-error" : undefined}
          className={inputClass(errors.businessName)}
        />
        {errors.businessName && (
          <p id="onb-business-error" className="mt-1.5 text-sm text-red-500">
            {errors.businessName}
          </p>
        )}
      </div>

      {/* 2. Website (optional) */}
      <div>
        <label
          htmlFor="onb-website"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Website <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="onb-website"
          type="text"
          inputMode="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="acme.com"
          className={inputClass()}
        />
      </div>

      {/* 3. Needs */}
      <div>
        <label
          htmlFor="onb-needs"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          What do you need from us?
        </label>
        <textarea
          id="onb-needs"
          rows={4}
          value={needs}
          onChange={(e) => setNeeds(e.target.value)}
          placeholder="A new brand identity and a landing page…"
          aria-invalid={errors.needs ? true : undefined}
          aria-describedby={errors.needs ? "onb-needs-error" : undefined}
          className={inputClass(errors.needs)}
        />
        {errors.needs && (
          <p id="onb-needs-error" className="mt-1.5 text-sm text-red-500">
            {errors.needs}
          </p>
        )}
      </div>

      {/* 4. Preferred contact method */}
      <div>
        <label
          htmlFor="onb-method"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Preferred contact method
        </label>
        <select
          id="onb-method"
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
          className={inputClass()}
        >
          {CONTACT_METHODS.map((method) => (
            <option key={method} value={method}>
              {CONTACT_METHOD_LABELS[method]}
            </option>
          ))}
        </select>
      </div>

      {/* 5. Contact details — label adapts to method */}
      <div>
        <label
          htmlFor="onb-contact"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          {CONTACT_VALUE_LABELS[contactMethod]}
        </label>
        <input
          id="onb-contact"
          type={contactMethod === "email" ? "email" : "tel"}
          inputMode={contactMethod === "email" ? "email" : "tel"}
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
          placeholder={
            contactMethod === "email" ? "you@acme.com" : "+1 555 000 1234"
          }
          aria-invalid={errors.contactValue ? true : undefined}
          aria-describedby={errors.contactValue ? "onb-contact-error" : undefined}
          className={inputClass(errors.contactValue)}
        />
        {errors.contactValue && (
          <p id="onb-contact-error" className="mt-1.5 text-sm text-red-500">
            {errors.contactValue}
          </p>
        )}
      </div>

      {/* 6. Look and feel */}
      <div>
        <label
          htmlFor="onb-look"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          What look and feel are you going for?
        </label>
        <textarea
          id="onb-look"
          rows={4}
          value={lookAndFeel}
          onChange={(e) => setLookAndFeel(e.target.value)}
          placeholder="Clean and modern, lots of white space…"
          aria-invalid={errors.lookAndFeel ? true : undefined}
          aria-describedby="onb-look-help onb-look-error"
          className={inputClass(errors.lookAndFeel)}
        />
        <p id="onb-look-help" className="mt-1.5 text-sm text-slate-400">
          Colours, style, brands you like — anything that helps.
        </p>
        {errors.lookAndFeel && (
          <p id="onb-look-error" className="mt-1 text-sm text-red-500">
            {errors.lookAndFeel}
          </p>
        )}
      </div>

      {/* File uploads (optional) */}
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-slate-800">
          Brand assets{" "}
          <span className="font-normal text-slate-400">(optional)</span>
        </span>

        <label
          htmlFor="onb-files"
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-1 ${
            submitting
              ? "border-slate-200 bg-slate-50 opacity-60"
              : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/40"
          }`}
        >
          <Upload className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <span className="text-sm font-medium text-slate-700">
            Tap to add files
          </span>
          <span className="text-xs text-slate-400">
            PNG, JPG, WEBP, GIF or PDF · up to {formatBytes(MAX_FILE_BYTES)} each
            · {MAX_FILES} max
          </span>
          <input
            id="onb-files"
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            onChange={onFileInputChange}
            disabled={submitting}
            className="sr-only"
          />
        </label>

        {fileError && (
          <p className="mt-1.5 text-sm text-red-500">{fileError}</p>
        )}

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <FileIcon
                  className="h-5 w-5 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {s.file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatBytes(s.file.size)}
                    {s.status === "failed" && s.error ? ` · ${s.error}` : ""}
                  </p>
                </div>

                {s.status === "uploading" && (
                  <Loader2
                    className="h-4 w-4 shrink-0 text-indigo-500 motion-safe:animate-spin"
                    aria-label="Uploading"
                  />
                )}
                {s.status === "done" && (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-500"
                    aria-label="Uploaded"
                  />
                )}
                {s.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => retryOne(s.id)}
                    disabled={submitting}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                  </button>
                )}
                {(s.status === "staged" || s.status === "failed") && (
                  <button
                    type="button"
                    onClick={() => removeFile(s.id)}
                    disabled={submitting}
                    aria-label={`Remove ${s.file.name}`}
                    className="inline-flex shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <>
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            {fieldsSaved ? "Uploading…" : "Submitting…"}
          </>
        ) : (
          <>
            {fieldsSaved && files.some((s) => s.status === "failed")
              ? "Retry upload"
              : "Submit details"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      {formError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600"
        >
          {formError}
        </p>
      )}
    </form>
  );
}
