import { ArrowRight, Hammer } from "lucide-react";

export default function BuildInPublic() {
  return (
    <section className="py-10">
      <div className="mx-auto max-w-6xl px-6">
        <a
          href="https://x.com/onboardly"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 rounded-2xl bg-indigo-50 px-6 py-6 transition-colors hover:bg-indigo-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-8"
        >
          <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-indigo-100 text-indigo-600">
            <Hammer className="h-6 w-6" />
          </span>
          <p className="flex-1 text-center text-lg font-bold text-slate-800 sm:text-xl">
            🔨 Built in public — follow the journey on X
          </p>
          <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 transition-colors group-hover:bg-indigo-700">
            <ArrowRight className="h-5 w-5" />
          </span>
        </a>
      </div>
    </section>
  );
}
