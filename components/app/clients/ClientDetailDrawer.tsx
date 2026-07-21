"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2, X } from "lucide-react";
import Dialog from "@/components/app/Dialog";
import {
  CONTACT_METHOD_LABELS,
  type Client,
  type ClientSubmission,
} from "@/lib/clients";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/time";

// Read-only view of a client's submitted intake answers. Reads
// client_submissions with the anon key — RLS scopes it to the signed-in
// agency's own clients (the authenticated SELECT policy joins on
// clients.user_id = auth.uid()).
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">
        {value}
      </dd>
    </div>
  );
}

export default function ClientDetailDrawer({
  client,
  onClose,
  onCopyLink,
}: {
  client: Client;
  onClose: () => void;
  onCopyLink: (client: Client) => void;
}) {
  const [submission, setSubmission] = useState<ClientSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Only clients who have submitted have a row to fetch.
  const hasSubmitted = client.submitted_at != null;

  useEffect(() => {
    if (!hasSubmitted) {
      setLoading(false);
      return;
    }
    let active = true;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("client_submissions")
        .select("*")
        .eq("client_id", client.id)
        .maybeSingle();
      if (!active) return;
      if (fetchError) {
        setError(true);
      } else {
        setSubmission(data as ClientSubmission | null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [client.id, hasSubmitted]);

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="client-detail-title"
      className="max-w-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="client-detail-title"
            className="truncate text-lg font-bold tracking-tight text-slate-900"
          >
            {client.name}
          </h2>
          <p className="truncate text-sm text-slate-500">{client.email}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            Couldn&rsquo;t load these details — please try again.
          </p>
        ) : submission ? (
          <>
            <dl className="space-y-5">
              <Field label="Business / brand name" value={submission.business_name} />
              <Field label="Website" value={submission.website || "—"} />
              <Field label="What they need" value={submission.needs} />
              <Field
                label="Preferred contact method"
                value={CONTACT_METHOD_LABELS[submission.contact_method]}
              />
              <Field label="Contact details" value={submission.contact_value} />
              <Field label="Look and feel" value={submission.look_and_feel} />
            </dl>
            <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-400">
              Submitted {formatDate(submission.created_at)}
            </p>
          </>
        ) : (
          // Not submitted yet (or the row is missing): honest empty state.
          <div className="flex flex-col items-center py-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              No details submitted yet
            </p>
            <p className="mt-1 max-w-xs text-sm text-slate-400">
              Copy this client&rsquo;s link and send it to them — emails go out
              automatically once magic links launch.
            </p>
            <button
              type="button"
              onClick={() => onCopyLink(client)}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Copy link
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
