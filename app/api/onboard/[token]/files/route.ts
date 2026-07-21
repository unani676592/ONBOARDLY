import { NextResponse } from "next/server";
import {
  resolveUploadTarget,
  storeClientFile,
  type StoreResult,
} from "@/lib/onboardUploads";
import { MAX_FILES } from "@/lib/uploads";

// Public intake file-upload endpoint. Validates the per-client token first,
// then writes each file to the private `client-files` bucket via the
// service_role admin client (the anon key cannot write — see step-1 policies).
// The six intake text fields are handled by the sibling ../route.ts; this route
// only touches storage and never changes the client's status.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ token: string }> };

// Per-instance rate limit — same best-effort speed bump as the sibling intake
// route, with a tighter cap because uploads are heavier. Not a durable
// guarantee (serverless instances don't share this Map).
const WINDOW_MS = 60_000;
const MAX_HITS = 10;
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

// Generic 404 for any invalid/unknown token — never reveals whether it existed.
function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function POST(req: Request, { params }: RouteContext) {
  const { token } = await params;

  if (rateLimited(`files:${clientIp(req)}`)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  // Authorize BEFORE reading the body / touching storage.
  const target = await resolveUploadTarget(token);
  if (!target) return notFound();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: "too_many_files" }, { status: 400 });
  }

  // Upload sequentially to keep memory and connection use modest. Order is
  // preserved so the client can map results back to the files it sent.
  const results: StoreResult[] = [];
  for (const file of files) {
    results.push(await storeClientFile(target, file));
  }

  // Always 200 with a per-file result array — partial failures are normal and
  // handled client-side (retry the failed ones). A wholesale token failure is
  // the 404 above.
  return NextResponse.json({ results });
}
