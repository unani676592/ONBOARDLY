"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import UpgradeDialog from "@/components/app/UpgradeDialog";
import { NAV_ITEMS, isActive } from "@/components/app/nav";
import {
  openSettings,
  useSettingsHashState,
} from "@/components/app/settings/settings-context";

export default function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { open: settingsOpen } = useSettingsHashState();

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="inline-flex rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <Logo />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          // Settings opens the modal over the current page instead of navigating.
          const isSettings = item.href === "/settings";
          const active = isSettings
            ? settingsOpen
            : isActive(pathname, item.href);

          const inner = (
            <>
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
                }`}
                aria-hidden="true"
              />
              <span className="flex-1 text-left">{item.label}</span>
              {item.soon && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  Soon
                </span>
              )}
            </>
          );

          const className = `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            active
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          }`;

          if (isSettings) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  openSettings();
                  onNavigate?.();
                }}
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                className={`w-full ${className}`}
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={className}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade card */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setUpgradeOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-indigo-700">
              Upgrade plan
            </span>
            <span className="block text-xs text-slate-500">
              Unlock premium features
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
