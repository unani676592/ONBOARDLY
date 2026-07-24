"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/app/Sidebar";
import TopBar from "@/components/app/TopBar";
import InviteClientModal from "@/components/app/InviteClientModal";
import SettingsModal from "@/components/app/settings/SettingsModal";
import { InviteContext } from "@/components/app/invite-context";

export default function AppShell({
  user,
  children,
}: {
  user: { displayName: string; email: string; initials: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const inviteCtx = useMemo(
    () => ({ open: () => setInviteOpen(true) }),
    [],
  );

  // A client was added: re-fetch the server components (dashboard stats/list,
  // clients table) so the new row shows immediately. The modal stays open to
  // report the email outcome (sent / failed / skipped) and closes itself via
  // its Done button, so we don't close or toast here.
  const handleClientAdded = useCallback(() => {
    router.refresh();
  }, [router]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <InviteContext.Provider value={inviteCtx}>
      <div className="min-h-screen bg-[#f7f8fc]">
        {/* Desktop sidebar (fixed, ~240px) */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-slate-200 md:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
              onClick={closeMobile}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 w-64 border-r border-slate-200 bg-white shadow-2xl">
              <Sidebar onNavigate={closeMobile} />
            </aside>
          </div>
        )}

        <div className="md:pl-60">
          <TopBar user={user} onMenu={() => setMobileOpen(true)} />
          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      <InviteClientModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={handleClientAdded}
      />
      <SettingsModal />
    </InviteContext.Provider>
  );
}
