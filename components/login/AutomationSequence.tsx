"use client";

import { useEffect, useState } from "react";
import {
  Check,
  FileText,
  Folder,
  Mail,
  SquareCheckBig,
  UserRound,
  type LucideIcon,
} from "lucide-react";

type Step = { icon: LucideIcon; label: string };

const steps: Step[] = [
  { icon: FileText, label: "Client form completed" },
  { icon: Mail, label: "Welcome email sent" },
  { icon: Folder, label: "Drive folder created" },
  { icon: UserRound, label: "CRM record added" },
  { icon: SquareCheckBig, label: "Tasks assigned" },
];

// Animation timing (ms)
const CARD_DURATION = 350;
const STAGGER = 700;
const CARD_LAND = (steps.length - 1) * STAGGER + CARD_DURATION; // last card settled
const CHECK_POP_AFTER = 220; // check pops just after its card lands
const HOLD = 3000;
const FADE_OUT = 400;
const FADE_OUT_AT = CARD_LAND + CHECK_POP_AFTER + HOLD;
const RESTART_AT = FADE_OUT_AT + FADE_OUT;

export default function AutomationSequence() {
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const [cycle, setCycle] = useState(0);

  // Respect prefers-reduced-motion (and react to live changes)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Drive the cascade -> hold -> fade-out -> restart loop
  useEffect(() => {
    if (reduced) return;
    setVisible(true);
    const fadeTimer = setTimeout(() => setVisible(false), FADE_OUT_AT);
    const restartTimer = setTimeout(() => setCycle((c) => c + 1), RESTART_AT);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(restartTimer);
    };
  }, [reduced, cycle]);

  // Under reduced motion, everything is shown static with checks visible.
  const shown = reduced || visible;

  return (
    <div className="flex w-full max-w-sm flex-col">
      <ol className="flex flex-col">
        {steps.map(({ icon: Icon, label }, i) => {
          // Stagger entrance; collapse to 0 delay on fade-out so cards leave together.
          const entranceDelay = reduced ? 0 : visible ? i * STAGGER : 0;
          const checkDelay = reduced
            ? 0
            : visible
              ? i * STAGGER + CARD_DURATION + CHECK_POP_AFTER
              : 0;

          return (
            <li key={label} className="flex flex-col items-center">
              {/* Dotted connector above every card except the first */}
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="h-6 w-0 border-l-2 border-dotted border-indigo-300"
                  style={{
                    opacity: shown ? 1 : 0,
                    transition: reduced ? "none" : "opacity 300ms ease-out",
                  }}
                />
              )}

              {/* Entrance wrapper: fade + slide up. Kept separate from hover
                  so hovering never interferes with the cascade. */}
              <div
                className="w-full ease-out"
                style={{
                  transitionProperty: reduced ? "none" : "opacity, transform",
                  transitionDuration: `${CARD_DURATION}ms`,
                  transitionDelay: `${entranceDelay}ms`,
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(10px)",
                }}
              >
                {/* Hover target: only translate + shadow, 150ms */}
                <div className="group flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="flex-1 text-[0.95rem] font-semibold text-slate-800">
                    {label}
                  </span>
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green-100 text-green-600 ease-out"
                    style={{
                      transitionProperty: reduced ? "none" : "transform",
                      transitionDuration: "250ms",
                      transitionDelay: `${checkDelay}ms`,
                      transform: shown ? "scale(1)" : "scale(0)",
                    }}
                  >
                    <Check className="h-4 w-4" strokeWidth={3} />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p
        className="mt-8 text-center text-sm text-slate-400"
        style={{
          opacity: shown ? 1 : 0,
          transition: reduced ? "none" : "opacity 300ms ease-out",
        }}
      >
        One form. Everything else is automatic.
      </p>
    </div>
  );
}
