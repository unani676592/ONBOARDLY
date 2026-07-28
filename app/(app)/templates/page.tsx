import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { fullNameOf } from "@/lib/user";
import { DEFAULT_INVITE_TEMPLATE, type EmailTemplate } from "@/lib/email/inviteTemplate";
import TemplateEditor from "@/components/app/templates/TemplateEditor";

export const metadata = {
  title: "Templates — Onboardly",
};

export default async function TemplatesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // RLS scopes this to the caller's own row — a hit means they've saved before.
  // No row → start from the step-1 default so the editor always has a sensible
  // draft to open with.
  let saved: EmailTemplate | null = null;
  if (user) {
    const { data } = await supabase
      .from("email_templates")
      .select("subject, body")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.subject && data?.body) {
      saved = { subject: data.subject, body: data.body };
    }
  }

  const initial = saved ?? DEFAULT_INVITE_TEMPLATE;
  const agencyName = fullNameOf(user ?? null);

  return (
    <div className="mx-auto max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Templates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Customize the invite email your clients receive. Use variables like{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-slate-700">
            {"{{client_name}}"}
          </code>{" "}
          — they’re filled with real details when each invite is sent.
        </p>
      </header>

      <div className="mt-6">
        <TemplateEditor
          initial={initial}
          hasSaved={saved !== null}
          agencyName={agencyName}
        />
      </div>
    </div>
  );
}
