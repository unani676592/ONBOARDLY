"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fullNameOf } from "@/lib/user";
import GeneralTab from "@/components/app/settings/GeneralTab";
import AccountTab from "@/components/app/settings/AccountTab";
import BillingTab from "@/components/app/settings/BillingTab";
import PrivacyTab from "@/components/app/settings/PrivacyTab";
import {
  SETTINGS_TABS,
  closeSettings,
  setSettingsTab,
  useSettingsHashState,
  type SettingsUser,
} from "@/components/app/settings/settings-context";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function SettingsModal() {
  const { open, tab } = useSettingsHashState();
  const [user, setUser] = useState<SettingsUser | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Load the signed-in user's metadata each time the modal opens so tabs
  // prefill from the current server state (not stale local edits).
  useEffect(() => {
    if (!open) return;
    let active = true;
    setUser(null);
    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const u = data.user;
      setUser({
        email: u.email ?? "",
        // full_name, else Google's name — never invented. Agency/work stay
        // empty for Google users until they fill them in on the General tab.
        fullName: fullNameOf(u) ?? "",
        agencyName: (u.user_metadata?.agency_name as string) ?? "",
        workType: (u.user_metadata?.work_type as string) ?? "",
      });
    });
    return () => {
      active = false;
    };
  }, [open]);

  // Accessibility: focus trap, Escape, scroll-lock, restore focus on close.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const getFocusable = () => {
      const el = panelRef.current;
      if (!el) return [] as HTMLElement[];
      return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
    };

    requestAnimationFrame(() => getFocusable()[0]?.focus());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeSettings();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  const activeLabel =
    SETTINGS_TABS.find((t) => t.id === tab)?.label ?? "General";

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center sm:items-center sm:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={closeSettings}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl shadow-slate-900/20 animate-pop-in sm:h-[80vh] sm:max-w-4xl sm:flex-row sm:rounded-2xl"
      >
        {/* Close */}
        <button
          type="button"
          onClick={closeSettings}
          aria-label="Close settings"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tabs: left column on desktop, top row on mobile */}
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-[#f7f8fc] p-3 sm:w-[220px] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0 sm:border-r"
        >
          <p className="hidden px-3 py-2 text-lg font-bold tracking-tight text-slate-900 sm:block">
            Settings
          </p>
          {SETTINGS_TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSettingsTab(t.id)}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-indigo-600" : "text-slate-400"
                  }`}
                  aria-hidden="true"
                />
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 pt-14 sm:p-8">
          <h2
            id="settings-title"
            className="mb-6 text-xl font-bold tracking-tight text-slate-900"
          >
            {activeLabel}
          </h2>
          {tab === "general" && <GeneralTab user={user} />}
          {tab === "account" && <AccountTab user={user} />}
          {tab === "billing" && <BillingTab />}
          {tab === "privacy" && <PrivacyTab />}
        </div>
      </div>
    </div>
  );
}
