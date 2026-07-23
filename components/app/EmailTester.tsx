"use client";

import { useState } from "react";
import { AlertCircle, Check, Loader2, Send } from "lucide-react";

type TestClient = { id: string; name: string; email: string };

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; id: string }
  | { kind: "failed"; reason: string };

export default function EmailTester({ clients }: { clients: TestClient[] }) {
  const [states, setStates] = useState<Record<string, SendState>>({});

  async function send(id: string) {
    setStates((s) => ({ ...s, [id]: { kind: "sending" } }));
    try {
      const res = await fetch(`/api/clients/${id}/send-invite`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === "sent") {
        setStates((s) => ({ ...s, [id]: { kind: "sent", id: body.id } }));
      } else {
        setStates((s) => ({
          ...s,
          [id]: {
            kind: "failed",
            reason: body.reason ?? body.error ?? `HTTP ${res.status}`,
          },
        }));
      }
    } catch (err) {
      setStates((s) => ({
        ...s,
        [id]: {
          kind: "failed",
          reason: err instanceof Error ? err.message : "Network error.",
        },
      }));
    }
  }

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No clients yet — add one from the Clients page first.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {clients.map((client) => {
        const state = states[client.id] ?? { kind: "idle" };
        const sending = state.kind === "sending";
        return (
          <li
            key={client.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {client.name}
              </p>
              <p className="truncate text-xs text-slate-500">{client.email}</p>
              {state.kind === "sent" && (
                <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Sent — id {state.id}
                </p>
              )}
              {state.kind === "failed" && (
                <p className="mt-1 flex items-start gap-1.5 text-xs font-medium text-rose-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="break-words">Failed: {state.reason}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => send(client.id)}
              disabled={sending}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send invite
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
