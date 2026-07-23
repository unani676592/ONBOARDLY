import { NextResponse } from "next/server";
import { listClientFiles } from "@/lib/clientFiles";

// Agency-side file listing for one client. GET only. All authorization lives in
// listClientFiles (session + RLS-scoped ownership) — this route just maps the
// result to a response. Signed download URLs are generated there, server-side;
// the private bucket has no public URLs.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { clientId } = await params;
  const result = await listClientFiles(clientId);

  if (!result.ok) {
    const body =
      result.status === 401
        ? { error: "unauthorized" }
        : result.status === 404
          ? { error: "not_found" }
          : { error: "server_error" };
    return NextResponse.json(body, { status: result.status });
  }

  return NextResponse.json({ files: result.files });
}
