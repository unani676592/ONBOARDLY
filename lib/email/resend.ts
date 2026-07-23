import { Resend } from "resend";

// Server-only Resend client. RESEND_API_KEY is read from the environment and is
// never exposed to the browser (no NEXT_PUBLIC_ prefix). Lazily constructed so a
// missing key surfaces as a clear error at send time, not at import time.
let client: Resend | null = null;

export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local (server-only, no NEXT_PUBLIC_ prefix) and restart the dev server.",
    );
  }
  if (!client) client = new Resend(apiKey);
  return client;
}
