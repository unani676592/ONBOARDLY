import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { validateTemplate } from "@/lib/email/inviteTemplate";

// Per-agency invite email template: save (POST) the one customizable template.
//
// RLS scopes every query to the signed-in agency (user_id = auth.uid()); the
// row is unique on user_id so this upserts. This only stores what the editor
// holds — it does NOT affect the email clients actually receive yet (step 3).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generous caps: enough for a real invite email, small enough to reject abuse.
const SUBJECT_MAX = 200;
const BODY_MAX = 5000;

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const subject = String((body as { subject?: unknown })?.subject ?? "").trim();
  const templateBody = String((body as { body?: unknown })?.body ?? "").trim();

  // Server-side enforcement of the same hard rules the editor shows inline —
  // a broken template can't be saved even if the client checks are bypassed.
  // Unknown-token warnings are advisory only and don't block saving.
  const { errors } = validateTemplate({ subject, body: templateBody });
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, error: errors[0] });
  }
  if (subject.length > SUBJECT_MAX) {
    return NextResponse.json({
      ok: false,
      error: `Keep the subject under ${SUBJECT_MAX} characters.`,
    });
  }
  if (templateBody.length > BODY_MAX) {
    return NextResponse.json({
      ok: false,
      error: `Keep the body under ${BODY_MAX} characters.`,
    });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("email_templates").upsert(
    {
      user_id: user.id,
      subject,
      body: templateBody,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("template save:", error.message);
    return NextResponse.json(
      { ok: false, error: "Couldn’t save your template. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, template: { subject, body: templateBody } });
}
