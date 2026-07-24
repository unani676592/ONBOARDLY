import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sendInviteEmail } from "@/lib/email/sendInvite";
import type { RunTrigger } from "@/lib/automationRuns";

// Sends one client their invite email. POST only (it has a side effect).
// Ownership + client lookup live in sendInviteEmail (session + RLS).
//
// Body: { trigger?: "client-invited" | "manual-resend" }.
//   - "client-invited" (automatic on invite): only sends when the user's
//     workflow status is "enabled"; otherwise returns { status: "skipped" }.
//   - "manual-resend": an explicit owner action — always sends.
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

  // Automatic sends only fire when the workflow is enabled.
  if (trigger === "client-invited") {
    const { data: wf } = await supabase
      .from("workflows")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (wf?.status !== "enabled") {
      return NextResponse.json({ status: "skipped", reason: "draft" });
    }
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");

  const result = await sendInviteEmail(clientId, baseUrl, trigger);

  if (result.ok) {
    return NextResponse.json({ status: "sent", id: result.id });
  }

  // A failed email send is a completed request with a failure outcome → 200 so
  // the caller reads `status`. Auth/not-found/server problems keep real codes.
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
