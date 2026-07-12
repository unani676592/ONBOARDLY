"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Does my client need to create an account?",
    a: "No — they get a magic link. One click, no signup, no password.",
  },
  {
    q: "What tools does it work with?",
    a: "Google Drive and Gmail first; more integrations coming.",
  },
  {
    q: "What if my client never fills the form?",
    a: "Automatic reminder emails until they do — you'll see their status as 'Invited' on your dashboard.",
  },
  {
    q: "Is this for me if I only get 1-2 clients a month?",
    a: "It shines at 3+ clients/month, but works at any volume.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mt-12 space-y-4">
          {faqs.map((item, i) => {
            const isOpen = open === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <div
                key={item.q}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50"
              >
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                  >
                    <span className="text-base font-semibold text-slate-900">
                      {item.q}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-5 w-5 flex-none text-slate-400 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="px-6 pb-5 text-sm leading-relaxed text-slate-500"
                >
                  {item.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
