import Link from "next/link";
import Logo from "./Logo";

// Inline X (Twitter) glyph — lucide's Twitter icon is the old bird logo.
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 sm:flex-row sm:justify-between">
        <Logo />

        <p className="order-last text-sm text-slate-400 sm:order-none">
          © 2026 Onboardly. All rights reserved.
        </p>

        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            Terms &amp; Conditions
          </Link>
          <a
            href="https://x.com/onboardly"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Onboardly on X"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <XIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
