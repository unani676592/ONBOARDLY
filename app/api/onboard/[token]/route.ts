import { NextResponse } from "next/server";
import {
  fetchOnboardClient,
  submitOnboard,
  type OnboardPayload,
} from "@/lib/onboard";
import { CONTACT_METHODS, type ContactMethod } from "@/lib/clients";

// Public intake endpoint. Runs on the server and reaches the database only
// through SECURITY DEFINER functions (see lib/onboard.ts) — the anon key never
// touches the clients / client_submissions tables directly.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

const MAX_LEN = 5000;

// Best-effort, per-instance rate limit. This is a guard, not a guarantee:
// serverless instances don't share this Map, so treat it as a speed bump
// against trivial abuse, not a hard limit. A durable limiter would need a
// shared store (out of scope for this phase).
const WINDOW_MS = 60_000;
const MAX_HITS = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_HITS;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// A generic 404 for any invalid/unknown token — never reveals whether the
// token existed.
function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function GET(req: Request, { params }: RouteContext) {
  const { token } = await params;

  if (rateLimited(`get:${clientIp(req)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const data = await fetchOnboardClient(token);
  if (!data) return notFound();

  // Whitelisted fields only — no emails, no ids, no other clients.
  return NextResponse.json(data);
}

// Coerce an unknown JSON field into a bounded, trimmed string.
function asString(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_LEN) : "";
}

export async function POST(req: Request, { params }: RouteContext) {
  const { token } = await params;

  if (rateLimited(`post:${clientIp(req)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const contactMethod = asString(b.contactMethod);

  const payload: OnboardPayload = {
    businessName: asString(b.businessName),
    website: asString(b.website),
    needs: asString(b.needs),
    contactMethod: contactMethod as ContactMethod,
    contactValue: asString(b.contactValue),
    lookAndFeel: asString(b.lookAndFeel),
  };

  // Server-side validation mirrors the client form (all required except
  // website; contact method must be one of the allowed values).
  const missingRequired =
    !payload.businessName ||
    !payload.needs ||
    !payload.contactValue ||
    !payload.lookAndFeel;
  if (missingRequired || !CONTACT_METHODS.includes(payload.contactMethod)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await submitOnboard(token, payload);

  switch (result) {
    case "ok":
      return NextResponse.json({ status: "ok" });
    case "already_submitted":
      return NextResponse.json({ status: "already_submitted" });
    case "invalid":
      // Unknown token — same generic 404 as GET, no leak.
      return notFound();
    default:
      return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
