import { Download, ExternalLink } from "lucide-react";

export default function PrivacyTab() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Your data
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Your clients&rsquo; data belongs to you. We never sell personal data.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Privacy Policy
            <ExternalLink className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </a>
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Terms &amp; Conditions
            <ExternalLink className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
          Export
        </h3>
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <Download className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Download my data
              </p>
              <p className="text-xs text-slate-500">
                A full export of your account and client data.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            Coming soon
          </span>
        </div>
      </section>
    </div>
  );
}
