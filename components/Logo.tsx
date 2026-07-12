import { Zap } from "lucide-react";

export default function Logo({
  className = "",
  wordmark = true,
}: {
  className?: string;
  wordmark?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm shadow-indigo-500/40">
        <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
      </span>
      {wordmark && (
        <span className="text-xl font-bold tracking-tight text-slate-900">
          Onboardly
        </span>
      )}
    </span>
  );
}
