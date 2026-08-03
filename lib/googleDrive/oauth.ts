// Server-only helpers for the Google Drive OAuth 2.0 flow over fetch (no SDK, no
// new dependency). Only ever imported from server route handlers — the client
// secret and the stored refresh token never touch the browser.
//
// This is a SEPARATE OAuth client from the Supabase Google login: it has its own
// client id/secret and its own redirect URI, so revoking Drive access here can
// never drop the login authorization, and rotating one secret can't break both.

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE = "https://oauth2.googleapis.com/revoke";
// about.get with `fields=user` is authorized by the drive.file scope and gives
// us the connected account's email/name for display — a real, live token check.
const DRIVE_ABOUT = "https://www.googleapis.com/drive/v3/about?fields=user";

// Least-privileged scope: the app can only see/manage files and folders IT
// creates. It cannot read the user's existing Drive.
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function googleCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Google Drive OAuth env vars. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in .env.local.",
    );
  }
  return { clientId, clientSecret };
}

// The callback URL for a given app origin. Must exactly match a redirect URI
// registered on the Drive OAuth client in Google Cloud Console.
export function driveRedirectUri(origin: string): string {
  return `${origin}/api/integrations/google-drive/callback`;
}

// Build the consent URL. `access_type=offline` + `prompt=consent` guarantees a
// refresh token every time (important: in testing, tokens expire ~weekly, so a
// reconnect must always mint a fresh one).
export function buildConsentUrl(redirectUri: string, state: string): string {
  const { clientId } = googleCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export type ExchangeResult =
  | { ok: true; refreshToken: string | null; accessToken: string }
  | { ok: false; error: string };

// Exchange the authorization code for tokens (called once, in the callback).
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<ExchangeResult> {
  const { clientId, clientSecret } = googleCreds();
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { error?: string } | null;
      return {
        ok: false,
        error: `Google rejected the sign-in (${detail?.error ?? `HTTP ${res.status}`}). Please try again.`,
      };
    }
    const data = (await res.json()) as { refresh_token?: string; access_token?: string };
    return {
      ok: true,
      refreshToken: data.refresh_token ?? null,
      accessToken: data.access_token ?? "",
    };
  } catch {
    return { ok: false, error: "Couldn’t reach Google. Please try again." };
  }
}

export type RefreshResult =
  | { ok: true; accessToken: string }
  // `invalid` = Google is refusing the refresh token (expired after the ~weekly
  // testing cap, or revoked). `unreachable` = transient — don't cry wolf.
  | { ok: false; kind: "invalid" | "unreachable"; error: string };

// Mint a short-lived access token from the stored refresh token. Used to
// re-verify liveness now, and to call the Drive API in later steps.
export async function refreshAccessToken(
  refreshToken: string,
): Promise<RefreshResult> {
  const { clientId, clientSecret } = googleCreds();
  try {
    const res = await fetch(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { access_token?: string };
      return { ok: true, accessToken: data.access_token ?? "" };
    }
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    // invalid_grant is Google's signal for an expired/revoked refresh token.
    if (detail?.error === "invalid_grant") {
      return { ok: false, kind: "invalid", error: "invalid_grant" };
    }
    // Any other non-OK status is treated as transient so a blip doesn't flag a
    // healthy connection as broken.
    return { ok: false, kind: "unreachable", error: detail?.error ?? `HTTP ${res.status}` };
  } catch {
    return { ok: false, kind: "unreachable", error: "network" };
  }
}

export type DriveUserResult =
  | { ok: true; email: string | null; name: string | null }
  | { ok: false; error: string };

// Confirm an access token can reach Drive and read back the connected account.
export async function fetchDriveUser(accessToken: string): Promise<DriveUserResult> {
  try {
    const res = await fetch(DRIVE_ABOUT, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error:
          "Google didn’t grant Drive access. Please connect again and approve the Drive permission.",
      };
    }
    if (!res.ok) {
      return { ok: false, error: `Google Drive check failed (HTTP ${res.status}).` };
    }
    const data = (await res.json()) as {
      user?: { emailAddress?: string; displayName?: string };
    };
    return {
      ok: true,
      email: data?.user?.emailAddress ?? null,
      name: data?.user?.displayName ?? null,
    };
  } catch {
    return { ok: false, error: "Couldn’t reach Google Drive. Please try again." };
  }
}

export type ConnectionCheck =
  | { state: "ok"; email: string | null; name: string | null }
  | { state: "invalid"; reason: string }
  | { state: "unreachable" };

// Re-verify a stored connection's liveness (keeps the Integrations page
// truthful). Refreshes an access token, then reads the account. A definitive
// invalid_grant becomes a specific "needs attention" reason; a transient blip
// leaves the connection shown as-is.
export async function checkConnection(refreshToken: string): Promise<ConnectionCheck> {
  const refreshed = await refreshAccessToken(refreshToken);
  if (!refreshed.ok) {
    if (refreshed.kind === "invalid") {
      return {
        state: "invalid",
        reason:
          "Google is no longer accepting the saved authorization. While the app is in testing Google drops Drive access about every 7 days (or if you revoked it) — reconnect to keep creating client folders.",
      };
    }
    return { state: "unreachable" };
  }
  const who = await fetchDriveUser(refreshed.accessToken);
  // Token refreshed fine but the about call blipped — treat as transient.
  if (!who.ok) return { state: "unreachable" };
  return { state: "ok", email: who.email, name: who.name };
}

// Best-effort revoke of the stored token at Google. Revoking the refresh token
// drops the entire grant for THIS client id only — since Drive uses its own
// OAuth client, login is unaffected. We delete our stored copy regardless.
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(GOOGLE_REVOKE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      cache: "no-store",
    });
  } catch {
    // Ignore — the connection is removed from our side either way.
  }
}
