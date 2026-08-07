import { NextResponse } from "next/server";
import {
  resolveUploadTarget,
  storeClientFile,
  type StoreResult,
} from "@/lib/onboardUploads";
import { markClientOnboarded } from "@/lib/onboard";
import { MAX_FILES } from "@/lib/uploads";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { runTriggerActions } from "@/lib/automation/runTriggerActions";
import { logActionRun } from "@/lib/automation/activityLog";
import type { WorkflowRow } from "@/components/app/automations/workflow-persistence";

// Public intake file-upload endpoint. Validates the per-client token first,
// then writes each file to the private `client-files` bucket via the
// service_role admin client (the anon key cannot write — see step-1 policies).
// The six intake text fields are handled by the sibling ../route.ts; this route
// only touches storage and never changes the client's status.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// The files-uploaded automation can stream several files through Drive; set an
// explicit ceiling rather than relying on the platform default (a worst-case
// 6×10MB batch can exceed the 10s default — see client_drive_files resumability).
export const maxDuration = 60;

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

  // Once at least one file is actually stored, advance the client to
  // 'onboarded' (from 'files_pending' only — see markClientOnboarded). This is
  // the sole place that status is set, so 'onboarded' always means a real file
  // exists. Best-effort: a failure here never blocks the upload response.
  if (results.some((r) => r.ok)) {
    const mark = await markClientOnboarded(token);

    // Everything below runs session-less (the intake visitor is anonymous), so
    // it uses a service_role client scoped explicitly by user_id. Wrapped — none
    // of it may break the client's upload response.
    try {
      const admin = createSupabaseAdminClient();

      // Stamp the "new files" signal. `files_updated_at` marks this upload; on
      // the FIRST upload (the one that onboards the client — status "ok") we seed
      // `files_seen_at` to match, so the initial submission raises no badge. A
      // later upload ("unchanged", already onboarded) leaves `files_seen_at`
      // behind, so `updated_at > seen_at` → the agency sees it.
      const now = new Date().toISOString();
      await admin
        .from("clients")
        .update(
          mark.status === "ok"
            ? { files_updated_at: now, files_seen_at: now }
            : { files_updated_at: now },
        )
        .eq("id", target.clientId)
        .eq("user_id", target.userId);

      // Never swallow a status-advance failure: the upload still succeeded (the
      // client's files are stored), but the agency must learn — with the real
      // reason — that onboarding didn't advance. A silently-dropped RPC error is
      // exactly how the missing mark_client_onboarded function hid for months.
      if (mark.status === "error") {
        const { data: c } = await admin
          .from("clients")
          .select("name, email")
          .eq("id", target.clientId)
          .eq("user_id", target.userId)
          .maybeSingle();
        await logActionRun(admin, {
          userId: target.userId,
          clientId: target.clientId,
          clientName: c?.name ?? "",
          clientEmail: c?.email ?? "",
          workflowId: null,
          actionSubtype: "mark-onboarded",
          trigger: "files-uploaded",
          status: "failed",
          reason: `Couldn’t mark the client onboarded: ${mark.reason}`,
        });
      }

      // Fire the files-uploaded automation trigger — runs only the actions wired
      // downstream of that trigger, scoped by user_id.
      const { data: wf } = await admin
        .from("workflows")
        .select("*")
        .eq("user_id", target.userId)
        .maybeSingle();
      if (wf) {
        const baseUrl = (
          process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
        ).replace(/\/$/, "");
        await runTriggerActions(admin, wf as WorkflowRow, "files-uploaded", {
          clientId: target.clientId,
          userId: target.userId,
          baseUrl,
        });
      }
    } catch (err) {
      console.error(
        "files-uploaded trigger:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Always 200 with a per-file result array — partial failures are normal and
  // handled client-side (retry the failed ones). A wholesale token failure is
  // the 404 above.
  return NextResponse.json({ results });
}
