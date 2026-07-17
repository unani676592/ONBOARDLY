"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  Settings2,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";

export type SettingsTab = "general" | "account" | "billing" | "privacy";

/** The subset of the signed-in user the settings tabs prefill from. */
export type SettingsUser = {
  email: string;
  fullName: string;
  agencyName: string;
  workType: string;
};

export const SETTINGS_TABS: {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "account", label: "Account", icon: User },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "privacy", label: "Privacy", icon: Shield },
];

const TAB_IDS = SETTINGS_TABS.map((t) => t.id) as string[];

function parseHash(): { open: boolean; tab: SettingsTab } {
  if (typeof window === "undefined") return { open: false, tab: "general" };
  const raw = window.location.hash.replace(/^#/, "");
  if (raw !== "settings" && !raw.startsWith("settings/")) {
    return { open: false, tab: "general" };
  }
  const seg = raw.split("/")[1];
  const tab = TAB_IDS.includes(seg) ? (seg as SettingsTab) : "general";
  return { open: true, tab };
}

/**
 * The Settings modal's open/tab state lives in the URL hash
 * (#settings/<tab>) so a refresh reopens the same tab and old /settings
 * links keep working. Every mutation fires a (real or synthetic) hashchange,
 * so the modal and the sidebar highlight stay in sync.
 */
export function useSettingsHashState(): { open: boolean; tab: SettingsTab } {
  const pathname = usePathname();
  const [state, setState] = useState<{ open: boolean; tab: SettingsTab }>({
    open: false,
    tab: "general",
  });

  useEffect(() => {
    const sync = () => setState(parseHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  // Re-read after a client navigation carries a hash (e.g. the /settings
  // redirect → /dashboard#settings/general), where hashchange may not fire.
  useEffect(() => {
    setState(parseHash());
  }, [pathname]);

  return state;
}

/** Open the modal to a tab (adds a history entry so Back closes it). */
export function openSettings(tab: SettingsTab = "general") {
  window.location.hash = `settings/${tab}`;
}

/** Switch tabs without stacking history entries. */
export function setSettingsTab(tab: SettingsTab) {
  const url = `${window.location.pathname}${window.location.search}#settings/${tab}`;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event("hashchange"));
}

/** Close the modal and strip the hash from the URL. */
export function closeSettings() {
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event("hashchange"));
}
