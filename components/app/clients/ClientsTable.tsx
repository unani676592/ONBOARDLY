"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2, Loader2, Search, Trash2, UserPlus } from "lucide-react";
import Dialog from "@/components/app/Dialog";
import InviteTrigger from "@/components/app/InviteTrigger";
import Toast from "@/components/app/Toast";
import ClientDetailDrawer from "@/components/app/clients/ClientDetailDrawer";
import { STATUS_META } from "@/components/app/clients/StatusBadge";
import {
  CLIENT_STATUSES,
  type Client,
  type ClientStatus,
} from "@/lib/clients";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/time";
import { initialsFor } from "@/lib/user";

export default function ClientsTable({
  initialClients,
}: {
  initialClients: Client[];
}) {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Re-sync when the server re-fetches (e.g. after a client is added via the
  // shell's invite modal, which calls router.refresh()).
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  // Live updates: a single RLS-scoped realtime channel on the clients table.
  // Realtime applies the signed-in agency's SELECT policy, so we only receive
  // events for our own clients (needs REPLICA IDENTITY FULL for the old row on
  // UPDATE/DELETE). One channel, torn down on unmount — no duplicates across
  // re-renders or React StrictMode's double-invoke. If the socket never
  // connects or drops, the table simply stops receiving pushes; local edits and
  // manual refresh keep working, so nothing goes stale-forever or crashes.
  useEffect(() => {
    const channel = supabase
      .channel("clients-table")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Client;
            setClients((list) =>
              // Dedupe: an invite can arrive here and via router.refresh().
              list.some((c) => c.id === row.id) ? list : [row, ...list],
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as Client;
            // Merge in place so the status badge, dropdown value, and Submitted
            // tag all reflect the authoritative row (also reconciles our own
            // optimistic status edits).
            setClients((list) =>
              list.map((c) => (c.id === row.id ? { ...c, ...row } : c)),
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as Partial<Client>;
            setClients((list) => list.filter((c) => c.id !== old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [clients, query]);

  function flashError(message: string) {
    setError(message);
    window.setTimeout(() => setError(null), 3000);
  }

  // Copy a client's magic link (origin + /onboard/[token]) to the clipboard.
  // Uses the async Clipboard API where available, with a legacy fallback for
  // non-secure contexts (e.g. plain http on a LAN IP).
  const copyLink = useCallback(async (client: Client) => {
    const url = `${window.location.origin}/onboard/${client.token}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setToast("Copied ✓");
    } catch {
      flashError("Couldn't copy the link — please try again.");
    }
  }, []);

  async function changeStatus(client: Client, status: ClientStatus) {
    if (status === client.status) return;
    const previous = client.status;

    // Optimistic: update the row (and updated_at) immediately.
    const updatedAt = new Date().toISOString();
    setClients((list) =>
      list.map((c) =>
        c.id === client.id ? { ...c, status, updated_at: updatedAt } : c,
      ),
    );

    const { error: updateError } = await supabase
      .from("clients")
      .update({ status, updated_at: updatedAt })
      .eq("id", client.id);

    if (updateError) {
      // Revert on failure.
      setClients((list) =>
        list.map((c) =>
          c.id === client.id ? { ...c, status: previous } : c,
        ),
      );
      flashError("Couldn't update status — please try again.");
    }
  }

  async function confirmDelete() {
    if (!confirming) return;
    const target = confirming;
    setDeleting(true);

    const { error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("id", target.id);

    setDeleting(false);
    setConfirming(null);

    if (deleteError) {
      flashError("Couldn't remove that client — please try again.");
      return;
    }

    // Optimistic removal after a confirmed delete.
    setClients((list) => list.filter((c) => c.id !== target.id));
  }

  // All clients removed client-side (e.g. deleted the last one) — show the
  // empty state without waiting for a server refresh.
  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-indigo-50 text-indigo-600">
            <UserPlus className="h-9 w-9" aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-lg font-bold tracking-tight text-slate-900">
            No clients yet
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Invite your first client — their onboarding runs on autopilot from
            there.
          </p>
          <InviteTrigger label="Invite your first client" className="mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search clients"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600"
        >
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3">Client</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Added</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No clients match “{query}”.
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setDetailClient(client)}
                        className="flex items-center gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      >
                        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                          {initialsFor(client.name, client.email)}
                          {client.submitted_at && (
                            <span
                              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                              aria-hidden="true"
                            />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                            {client.name}
                            {client.submitted_at && (
                              <span className="text-xs font-medium text-emerald-600">
                                · Submitted
                              </span>
                            )}
                          </p>
                          <p className="truncate text-slate-500">
                            {client.email}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <label className="sr-only" htmlFor={`status-${client.id}`}>
                        Change status for {client.name}
                      </label>
                      <select
                        id={`status-${client.id}`}
                        value={client.status}
                        onChange={(e) =>
                          changeStatus(client, e.target.value as ClientStatus)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                      >
                        {CLIENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_META[status].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => copyLink(client)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Link2 className="h-4 w-4" aria-hidden="true" />
                          Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(client)}
                          aria-label={`Remove ${client.name}`}
                          className="inline-grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirming && (
        <Dialog
          open
          onClose={() => (deleting ? undefined : setConfirming(null))}
          labelledBy="delete-client-title"
          describedBy="delete-client-desc"
          className="max-w-sm"
        >
          <h2
            id="delete-client-title"
            className="text-lg font-bold tracking-tight text-slate-900"
          >
            Remove {confirming.name}?
          </h2>
          <p id="delete-client-desc" className="mt-2 text-sm text-slate-500">
            This can&rsquo;t be undone.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              disabled={deleting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-600/30 transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deleting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {deleting ? "Removing…" : "Remove"}
            </button>
          </div>
        </Dialog>
      )}

      {/* Client detail drawer */}
      {detailClient && (
        <ClientDetailDrawer
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onCopyLink={copyLink}
        />
      )}

      {toast && (
        <Toast key={toast} message={toast} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
