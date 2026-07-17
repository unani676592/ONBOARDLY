import type { User } from "@supabase/supabase-js";

// Deriving what we show for the signed-in user. Order of truth:
//   1. full_name from Supabase user metadata (set at signup)
//   2. the email prefix (before the "@") — a REAL value, never invented
// We never fabricate a placeholder name.

export function fullNameOf(user: User | null): string | null {
  const value = user?.user_metadata?.full_name;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

export function emailPrefix(email: string): string {
  return email.split("@")[0] ?? "";
}

/** First name for the greeting: first token of full_name, else email prefix. */
export function firstNameFor(fullName: string | null, email: string): string {
  if (fullName) return fullName.split(/\s+/)[0];
  return emailPrefix(email);
}

/** Full display name for menus: full_name, else email prefix. */
export function displayNameFor(fullName: string | null, email: string): string {
  return fullName ?? emailPrefix(email) ?? email;
}

/** Avatar initials: first letters of the first two name words, else the
 *  first letter of the email prefix. Always uppercase. */
export function initialsFor(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.split(/\s+/);
    const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
    return initials.toUpperCase();
  }
  const prefix = emailPrefix(email);
  return (prefix[0] ?? "?").toUpperCase();
}
