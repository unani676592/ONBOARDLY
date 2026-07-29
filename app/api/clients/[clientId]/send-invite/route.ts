import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sendInviteEmail } from "@/lib/email/sendInvite";
import { runWorkflow } from "@/lib/automation";
import { logActionRun } from "@/lib/automation/activityLog";
import type { RunTrigger } from "@/lib/automationRuns";
import type { WorkflowRow } from "@/components/app/automations/workflow-persistence";

// Sends one client their invite email. POST only (it has a side effect).
// Ownership + client lookup live in sendInviteEmail (session + RLS).
//
// Body: { trigger?: "client-invited" | "manual-resend" }.
//   - "client-invited" (automatic on invite): runs the agency's workflow through
//     the automation engine. The engine only runs enabled workflows and finds
//     the send-email action; a draft/absent workflow sends nothing (skipped).
//   - "manual-resend": an explicit owner action — always sends, bypassing the
//     workflow entirely (it isn't a trigger firing, it's the owner resending).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { clientId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const trigger: RunTrigger =
    (body as { trigger?: string })?.trigger === "manual-resend"
      ? "manual-resend"
      : "client-invited";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { status: "failed", error: "unauthorized", reason: "Not signed in." },
      { status: 401 },
    );
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");

  // Manual resend is an explicit owner action, not a workflow trigger — send
  // directly, always, regardless of workflow state.
  if (trigger === "manual-resend") {
    const result = await sendInviteEmail(clientId, baseUrl);

    // Log the send as a send-email action (no workflow ran). Best-effort, and
    // only for a real attempt — success, or a Resend-level failure (502).
    // Precondition misses (client/token not found) never reached a send.
    if (result.ok || result.status === 502) {
      const { data: client } = await supabase
        .from("clients")
        .select("name, email")
        .eq("id", clientId)
        .maybeSingle();
      await logActionRun(supabase, {
        userId: user.id,
        clientId,
        clientName: client?.name ?? "",
        clientEmail: client?.email ?? "",
        workflowId: null,
        actionSubtype: "send-email",
        trigger,
        status: result.ok ? "ran" : "failed",
        // On success, log any self-correction (e.g. appended magic link) as the
        // reason so the activity log reflects what actually happened.
        reason: result.ok ? (result.warning ?? null) : result.reason,
      });
    }

    return sendResultResponse(result);
  }

  // Automatic invite: run this agency's workflow through the engine. The engine
  // gates on "enabled" and finds the send-email action.
  const { data: wf } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // No workflow yet, or draft → the engine runs nothing (same gate as before).
  if (!wf) {
    return NextResponse.json({ status: "skipped", reason: "draft" });
  }

  const engineResult = await runWorkflow(wf as WorkflowRow, {
    clientId,
    baseUrl,
    trigger,
    userId: user.id,
    supabase,
  });

  if (!engineResult.ran) {
    return NextResponse.json({ status: "skipped", reason: "draft" });
  }

  // Report the invite email's outcome — the send-email action is what this
  // endpoint's callers care about. An enabled workflow with no send-email node
  // sends nothing, honestly (skipped) rather than faking a send.
  const email = engineResult.actions.find((a) => a.subtype === "send-email");
  if (!email) {
    return NextResponse.json({
      status: "skipped",
      reason: "This workflow has no send-email action.",
    });
  }

  if (email.result.status === "ran") {
    return NextResponse.json({ status: "sent", id: email.result.detail });
  }
  if (email.result.status === "skipped") {
    return NextResponse.json({ status: "skipped", reason: email.result.reason });
  }
  // A failed send is a completed request with a failure outcome → 200 so the
  // caller reads `status` and shows `reason`.
  return NextResponse.json({ status: "failed", reason: email.result.reason });
}

// Map a direct sendInviteEmail result onto the response shape callers expect.
// Kept for the manual-resend path, which sends outside the engine.
function sendResultResponse(
  result: Awaited<ReturnType<typeof sendInviteEmail>>,
) {
  if (result.ok) {
    return NextResponse.json({ status: "sent", id: result.id });
  }
  if (result.status === 502) {
    return NextResponse.json({ status: "failed", reason: result.reason });
  }
  const errorKey =
    result.status === 401
      ? "unauthorized"
      : result.status === 404
        ? "not_found"
        : "server_error";
  return NextResponse.json(
    { status: "failed", error: errorKey, reason: result.reason },
    { status: result.status },
  );
}
