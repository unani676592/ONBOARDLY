"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Plus, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useInvite } from "@/components/app/invite-context";
import { headingFor } from "@/components/app/nav";
import { openSettings } from "@/components/app/settings/settings-context";

type MenuKey = "bell" | "avatar" | null;

export default function TopBar({
  user,
  onMenu,
}: {
  user: { displayName: string; email: string; initials: string };
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { open: openInvite } = useInvite();

  const [menu, setMenu] = useState<MenuKey>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Close either dropdown on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    function onClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenu(null);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onMenu}
          aria-label="Open navigation"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="flex-1 truncate text-xl font-bold tracking-tight text-slate-900">
          {headingFor(pathname)}
        </h1>

        <div ref={barRef} className="flex items-center gap-2 sm:gap-3">
          {/* Invite client */}
          <button
            type="button"
            onClick={openInvite}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-4"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Invite client</span>
            <span className="sm:hidden">Invite</span>
          </button>

          {/* Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => (m === "bell" ? null : "bell"))}
              aria-label="Notifications"
              aria-haspopup="true"
              aria-expanded={menu === "bell"}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <Bell className="h-5 w-5" />
            </button>
            {menu === "bell" && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 animate-pop-in"
              >
                <p className="text-sm font-semibold text-slate-900">
                  Notifications
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  No notifications yet.
                </p>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => (m === "avatar" ? null : "avatar"))}
              aria-label="Account menu"
              aria-haspopup="true"
              aria-expanded={menu === "avatar"}
              className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {user.initials}
            </button>
            {menu === "avatar" && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 animate-pop-in"
              >
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user.displayName}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(null);
                    openSettings();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <SettingsIcon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  Settings
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-70"
                >
                  <LogOut className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  {loggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
