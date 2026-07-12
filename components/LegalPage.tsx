import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";

type Section = { heading: string; body: string };

export default function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: Section[];
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          Draft — placeholder content
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: 2026</p>

        <div className="mt-10 space-y-10">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold text-slate-900">{s.heading}</h2>
              <p className="mt-3 leading-relaxed text-slate-600">{s.body}</p>
            </section>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-100">
        <div className="mx-auto max-w-3xl px-6 py-8 text-sm text-slate-400">
          © 2026 Onboardly. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
