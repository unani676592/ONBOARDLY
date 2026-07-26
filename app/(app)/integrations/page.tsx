import { FileText, HardDrive, Mail } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { checkConnection } from "@/lib/notion/api";
import NotionCard from "@/components/app/integrations/NotionCard";
import type { NotionConnectionStatus } from "@/lib/notion/types";

export const metadata = {
  title: "Integrations — Onboardly",
};

export default async function IntegrationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read status server-side. The token is read here only to re-verify liveness
  // against Notion; it is never passed to the client — only the resulting
  // `problem` reason is. If the row (or table, pre-migration) isn't there we
  // show the not-connected state.
  let notion: NotionConnectionStatus = { connected: false };
  if (user) {
    const { data } = await supabase
      .from("notion_connections")
      .select("access_token, database_id, database_title, workspace_name, connected_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      // Re-verify: a revoked token / un-shared database shouldn't keep reading
      // as healthy. Only a definitive failure flags a problem — a transient
      // network issue leaves the connection shown as-is.
      const check = await checkConnection(data.access_token, data.database_id);
      notion = {
        connected: true,
        databaseId: data.database_id,
        databaseTitle: data.database_title,
        workspaceName: data.workspace_name,
        connectedAt: data.connected_at,
        problem: check.state === "invalid" ? check.reason : null,
      };
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect the tools your onboarding data should flow into.
        </p>
      </header>

      <div className="mt-6 space-y-4">
        <NotionCard initial={notion} />

        {/* Honest "coming soon" placeholders — clearly not connectable yet. */}
        <SoonCard
          icon={HardDrive}
          name="Google Drive"
          description="Create a client folder automatically during onboarding."
        />
        <SoonCard
          icon={Mail}
          name="Gmail"
          description="Send onboarding emails from your own Gmail address."
        />
        <SoonCard
          icon={FileText}
          name="Airtable"
          description="Sync client records into an Airtable base."
        />
      </div>
    </div>
  );
}

function SoonCard({
  icon: Icon,
  name,
  description,
}: {
  icon: typeof Mail;
  name: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 opacity-70 shadow-sm">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-slate-700">{name}</h2>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            Soon
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  );
}
