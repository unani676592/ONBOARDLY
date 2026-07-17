"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Settings now lives in a modal over the app. This route is kept so old
// /settings links still work — it redirects to the dashboard with the
// settings hash, which opens the modal on the General tab.
export default function SettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard#settings/general");
  }, [router]);

  return null;
}
