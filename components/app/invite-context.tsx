"use client";

import { createContext, useContext } from "react";

// Lets any page (e.g. the empty-state "Invite your first client" button) open
// the single invite modal that lives up in the app shell.
export const InviteContext = createContext<{ open: () => void }>({
  open: () => {},
});

export function useInvite() {
  return useContext(InviteContext);
}
