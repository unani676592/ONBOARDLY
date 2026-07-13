"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, Link as LinkIcon, Zap, type LucideIcon } from "lucide-react";

type Benefit = { icon: LucideIcon; label: string };

const benefits: Benefit[] = [
  { icon: Zap, label: "Set up once — every client after is automatic" },
  {
    icon: LinkIcon,
    label: "Clients onboard via magic link. No accounts, no passwords",
  },
  { icon: LayoutDashboard, label: "One dashboard shows every client's status" },
];

// Animation timing (ms) — mirrors /login's cascade, but runs once (no loop).
const CARD_DURATION = 350;
const STAGGER = 700;
const CAPTION_AT = benefits.length * STAGGER; // fade caption in after the cards

export default function BenefitSequence() {
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);

  // Respect prefers-reduced-motion (and react to live changes)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Trigger the one-time entrance on mount.
  useEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  // Under reduced motion everything is shown static, no animation.
  const shown = reduced || visible;

  return (
    <div className="flex w-full max-w-sm flex-col">
      <ul className="flex flex-col gap-5">
        {benefits.map(({ icon: Icon, label }, i) => {
          const entranceDelay = reduced || !visible ? 0 : i * STAGGER;

          return (
            <li key={label}>
              {/* Entrance wrapper: fade + slide up. Kept separate from hover
                  so hovering never interferes with the cascade. */}
              <div
                className="ease-out"
                style={{
                  transitionProperty: reduced ? "none" : "opacity, transform",
                  transitionDuration: `${CARD_DURATION}ms`,
                  transitionDelay: `${entranceDelay}ms`,
                  opacity: shown ? 1 : 0,
                  transform: shown ? "translateY(0)" : "translateY(10px)",
                }}
              >
                {/* Hover target: only translate + shadow, 150ms */}
                <div className="group flex items-center gap-4 rounded-2xl bg-white px-5 py-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-900/5 transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/10">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="flex-1 text-[0.95rem] font-semibold leading-snug text-slate-800">
                    {label}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p
        className="mt-8 text-center text-sm text-slate-400"
        style={{
          opacity: shown ? 1 : 0,
          transition: reduced ? "none" : "opacity 300ms ease-out",
          transitionDelay: reduced ? "0ms" : `${CAPTION_AT}ms`,
        }}
      >
        Your next client could be onboarded today.
      </p>
    </div>
  );
}
