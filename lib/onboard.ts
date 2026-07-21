import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { CONTACT_METHODS, type ContactMethod } from "@/lib/clients";

// Server-only intake helpers for the public /onboard/[token] flow. Imports
// next/headers (via supabaseServer), so never import this from a client
// component.
//
// SECURITY MODEL: the public intake page has no logged-in user, so it must
// never read the clients / client_submissions tables directly with the anon
// key (those tables have zero anon RLS policies). Instead we call two
// SECURITY DEFINER Postgres functions that run as their owner, bypass RLS, and
// return / write ONLY whitelisted fields:
//   - get_onboard_client(p_token)  -> { client_name, agency_name, already_submitted }
//   - submit_onboard(p_token, ...) -> 'ok' | 'already_submitted' | 'invalid'
// EXECUTE on both is granted to the anon role; no service_role key is used.

export type OnboardClient = {
  clientName: string;
  agencyName: string;
  alreadySubmitted: boolean;
};

export type OnboardPayload = {
  businessName: string;
  website: string;
  needs: string;
  contactMethod: ContactMethod;
  contactValue: string;
  lookAndFeel: string;
};

export type SubmitResult = "ok" | "already_submitted" | "invalid" | "error";

/**
 * Look up the greeting data for an intake token. Returns null for an invalid /
 * unknown token so callers can render a generic 404 with no information leak
 * (we never reveal whether a token existed). Never returns emails or ids.
 */
export async function fetchOnboardClient(
  token: string,
): Promise<OnboardClient | null> {
  if (!token || typeof token !== "string") return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_onboard_client", {
    p_token: token,
  });

  if (error) {
    // Log the message only — never the token or any client data.
    console.error("get_onboard_client:", error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    clientName: row.client_name ?? "",
    agencyName: row.agency_name ?? "",
    alreadySubmitted: Boolean(row.already_submitted),
  };
}

/**
 * Persist a client's intake answers and flip their status to 'form_completed'.
 * The DB function is idempotent-safe: a second submission returns
 * 'already_submitted' rather than inserting a duplicate.
 */
export async function submitOnboard(
  token: string,
  payload: OnboardPayload,
): Promise<SubmitResult> {
  if (!token) return "invalid";
  if (!CONTACT_METHODS.includes(payload.contactMethod)) return "invalid";

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_onboard", {
    p_token: token,
    p_business_name: payload.businessName,
    p_website: payload.website,
    p_needs: payload.needs,
    p_contact_method: payload.contactMethod,
    p_contact_value: payload.contactValue,
    p_look_and_feel: payload.lookAndFeel,
  });

  if (error) {
    console.error("submit_onboard:", error.message);
    return "error";
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (result === "ok" || result === "already_submitted" || result === "invalid") {
    return result;
  }
  return "error";
}
