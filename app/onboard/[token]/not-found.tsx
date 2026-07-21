import { Unlink } from "lucide-react";
import Logo from "@/components/Logo";

// Shown for any invalid / expired / unknown intake token. Deliberately generic:
// it never reveals whether the token ever existed.
export default function OnboardNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8fc] px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-slate-400">
            <Unlink className="h-8 w-8" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-xl font-bold tracking-tight text-slate-900">
            This link isn&rsquo;t valid
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Please ask your agency for a new one.
          </p>
        </div>
      </div>
    </main>
  );
}
