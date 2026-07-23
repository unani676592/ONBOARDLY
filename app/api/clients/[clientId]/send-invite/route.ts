import { NextResponse } from "next/server";
import { sendInviteEmail } from "@/lib/email/sendInvite";

// Sends one client their invite email. POST only (it has a side effect).
// Authorization + client lookup live in sendInviteEmail (session + RLS-scoped
// ownership). Part A only: nothing wires this to the canvas or the invite flow.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const { clientId } = await params;

  // Prefer an explicit site URL if configured; fall back to the request origin
  // (localhost in dev). This is what the magic link in the email points to.
  const baseUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");

  const result = await sendInviteEmail(clientId, baseUrl);

  if (result.ok) {
    return NextResponse.json({ status: "sent", id: result.id });
  }

  const errorKey =
    result.status === 401
      ? "unauthorized"
      : result.status === 404
        ? "not_found"
        : result.status === 502
          ? "email_failed"
          : "server_error";

  return NextResponse.json(
    { status: "failed", error: errorKey, reason: result.reason },
    { status: result.status },
  );
}
