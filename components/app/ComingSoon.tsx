import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-indigo-50 text-indigo-600">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      <span className="mt-4 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
        Coming soon
      </span>
      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
