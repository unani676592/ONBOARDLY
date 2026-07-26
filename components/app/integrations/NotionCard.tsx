"use client";

import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plug,
  Unplug,
} from "lucide-react";
import { relativeTime } from "@/lib/time";
import type { NotionConnectionStatus } from "@/lib/notion/types";

// The Notion integration card: connect (token + database), see connected state,
// disconnect. All state changes go through /api/integrations/notion — the token
// is never held in, or returned to, the browser beyond the moment of submitting.
export default function NotionCard({
  initial,
}: {
  initial: NotionConnectionStatus;
}) {
  const [status, setStatus] = useState<NotionConnectionStatus>(initial);
  const [token, setToken] = useState("");
  const [database, setDatabase] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setConnecting(true);
    try {
      const res = await fetch("/api/integrations/notion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, database }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok && body.connection) {
        setStatus(body.connection as NotionConnectionStatus);
        setToken("");
        setDatabase("");
      } else {
        setError(body.error ?? `Couldn’t connect (HTTP ${res.status}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    setError(null);
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/notion", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) {
        setStatus({ connected: false });
      } else {
        setError(body.error ?? `Couldn’t disconnect (HTTP ${res.status}).`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
          <NotionGlyph />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-slate-900">Notion</h2>
            <StatusPill connected={status.connected} problem={!!status.problem} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Connect a Notion database so client records can be written to it.
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {status.connected && !status.problem ? (
          <ConnectedState
            status={status}
            disconnecting={disconnecting}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <>
            {status.connected && status.problem && (
              <NeedsReconnect
                reason={status.problem}
                databaseTitle={status.databaseTitle}
                disconnecting={disconnecting}
                onDisconnect={handleDisconnect}
              />
            )}
            <ConnectForm
              token={token}
              database={database}
              connecting={connecting}
              onToken={setToken}
              onDatabase={setDatabase}
              onSubmit={handleConnect}
            />
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm leading-relaxed text-rose-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// --- Connected -------------------------------------------------------------

function ConnectedState({
  status,
  disconnecting,
  onDisconnect,
}: {
  status: NotionConnectionStatus;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Connected
        </div>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label="Database">{status.databaseTitle || "—"}</Row>
          {status.workspaceName && <Row label="Workspace">{status.workspaceName}</Row>}
          {status.connectedAt && (
            <Row label="Connected">{relativeTime(status.connectedAt)}</Row>
          )}
        </dl>
      </div>

      <button
        type="button"
        onClick={onDisconnect}
        disabled={disconnecting}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {disconnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Unplug className="h-4 w-4" aria-hidden="true" />
        )}
        {disconnecting ? "Disconnecting…" : "Disconnect"}
      </button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1 truncate font-medium text-slate-700">{children}</dd>
    </div>
  );
}

// --- Connect form ----------------------------------------------------------

function ConnectForm({
  token,
  database,
  connecting,
  onToken,
  onDatabase,
  onSubmit,
}: {
  token: string;
  database: string;
  connecting: boolean;
  onToken: (v: string) => void;
  onDatabase: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="notion-token"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Internal integration secret
        </label>
        <input
          id="notion-token"
          type="password"
          value={token}
          onChange={(e) => onToken(e.target.value)}
          placeholder="ntn_… or secret_…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        />
      </div>

      <div>
        <label
          htmlFor="notion-database"
          className="mb-1.5 block text-sm font-semibold text-slate-800"
        >
          Database ID or URL
        </label>
        <input
          id="notion-database"
          type="text"
          value={database}
          onChange={(e) => onDatabase(e.target.value)}
          placeholder="https://notion.so/…  or  32-character ID"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        />
      </div>

      <button
        type="submit"
        disabled={connecting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plug className="h-4 w-4" aria-hidden="true" />
        )}
        {connecting ? "Verifying…" : "Connect Notion"}
      </button>

      <NotionHelp />
    </form>
  );
}

function NotionHelp() {
  return (
    <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3.5 text-xs leading-relaxed text-slate-500">
      <p className="font-semibold text-slate-600">How to connect</p>
      <ol className="mt-1.5 list-decimal space-y-1 pl-4">
        <li>
          Create an internal integration at{" "}
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-indigo-600 hover:text-indigo-700"
          >
            notion.so/my-integrations
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>{" "}
          and copy its secret.
        </li>
        <li>
          Open your target database → <span className="font-medium">•••</span> →{" "}
          <span className="font-medium">Connections</span> → add your integration.
        </li>
        <li>Paste the secret and the database link above.</li>
      </ol>
    </div>
  );
}

// --- Bits ------------------------------------------------------------------

// Shown when a stored connection re-verified as broken: names the real reason
// and lets the user reconnect (the form below) or remove it. Not fake — the
// connection genuinely won't write until re-established.
function NeedsReconnect({
  reason,
  databaseTitle,
  disconnecting,
  onDisconnect,
}: {
  reason: string;
  databaseTitle?: string | null;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        Connection needs attention
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-amber-700/90">{reason}</p>
      {databaseTitle && (
        <p className="mt-1 text-xs text-amber-700/70">
          Last connected database: {databaseTitle}
        </p>
      )}
      <button
        type="button"
        onClick={onDisconnect}
        disabled={disconnecting}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm ring-1 ring-amber-200 transition-colors hover:bg-amber-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {disconnecting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Remove connection
      </button>
    </div>
  );
}

function StatusPill({
  connected,
  problem,
}: {
  connected: boolean;
  problem: boolean;
}) {
  if (connected && !problem) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
        <Check className="h-3 w-3" aria-hidden="true" />
        Connected
      </span>
    );
  }
  if (connected && problem) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
        <AlertCircle className="h-3 w-3" aria-hidden="true" />
        Needs attention
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
      Not connected
    </span>
  );
}

function NotionGlyph() {
  // Simple "N" mark — we don't ship Notion's trademarked logo.
  return <span className="text-lg font-black leading-none">N</span>;
}
