"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Invisible companion to the server-rendered dashboard. The stat cards and
// Recent Clients list are derived server-side from the full clients table
// (getClientStats / getRecentClients), so the robust way to keep them live is a
// soft server re-fetch rather than client-side count math that could drift on a
// dropped event.
//
// It opens ONE RLS-scoped realtime channel on the agency's clients and, on any
// change, calls router.refresh() — Next.js re-runs the server component and the
// counts + list come back fresh, with no full-page reload. Bursts are coalesced
// into a single refresh. If the socket never connects or drops, refreshes just
// stop firing; the dashboard still renders and manual refresh recovers. Uses a
// distinct channel name from the clients table so the two never collide.
export default function DashboardRealtime() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-clients")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 300);
        },
      )
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
