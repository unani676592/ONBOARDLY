"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  HardDrive,
  Loader2,
  Plug,
  Unplug,
} from "lucide-react";
import { relativeTime } from "@/lib/time";
import type { GoogleDriveConnectionStatus } from "@/lib/googleDrive/types";

// The Google Drive integration card: connect (OAuth redirect), see connected
// state, disconnect. Connecting is a full-page navigation to the server route
// that redirects to Google's consent screen — the refresh token is never held
// in, or returned to, the browser. `initialError` carries a real failure passed
// back from the OAuth callback via `?drive_error=`.
export default function GoogleDriveCard({
  initial,
  initialError,
}: {
  initial: GoogleDriveConnectionStatus;
  initialError?: string | null;
}) {
  const [status, setStatus] = useState<GoogleDriveConnectionStatus>(initial);
  const [redirecting, setRedirecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function handleDisconnect() {
    setError(null);
    setDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/google-drive", { method: "DELETE" });
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

  const healthy = status.connected && !status.problem;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
          <HardDrive className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              Google Drive
            </h2>
            <StatusPill connected={status.connected} problem={!!status.problem} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Connect Google Drive so a folder can be created for each new client.
          </p>
        </div>
      </div>

      <div className="px-6 py-5">
        {healthy ? (
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
                accountEmail={status.accountEmail}
                disconnecting={disconnecting}
                onDisconnect={handleDisconnect}
              />
            )}
            <ConnectPanel redirecting={redirecting} onConnect={() => setRedirecting(true)} />
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
  status: GoogleDriveConnectionStatus;
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
          <Row label="Account">
            {status.accountEmail || status.accountName || "—"}
          </Row>
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

// --- Connect ---------------------------------------------------------------

// The connect button is a real link to the server route (full navigation), which
// 302s to Google's consent screen. We flip a local "redirecting" state on click
// purely for the label — the browser is leaving the page either way.
function ConnectPanel({
  redirecting,
  onConnect,
}: {
  redirecting: boolean;
  onConnect: () => void;
}) {
  return (
    <div className="space-y-4">
      <a
        href="/api/integrations/google-drive/connect"
        onClick={onConnect}
        aria-disabled={redirecting}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/30 transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        {redirecting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plug className="h-4 w-4" aria-hidden="true" />
        )}
        {redirecting ? "Redirecting to Google…" : "Connect Google Drive"}
      </a>

      <div className="rounded-xl bg-slate-50 px-4 py-3.5 text-xs leading-relaxed text-slate-500">
        <p className="font-semibold text-slate-600">What you’re granting</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>
            We request the least-privileged scope: Onboardly can only see and
            manage files and folders <span className="font-medium">it creates</span>{" "}
            — never the rest of your Drive.
          </li>
          <li>You can disconnect anytime, which revokes this access at Google.</li>
        </ul>
      </div>
    </div>
  );
}

// --- Bits ------------------------------------------------------------------

// Shown when a stored connection re-verified as broken (Google expires refresh
// tokens ~weekly in testing, or access was revoked). Names the real reason and
// lets the user reconnect (the panel below) or remove it.
function NeedsReconnect({
  reason,
  accountEmail,
  disconnecting,
  onDisconnect,
}: {
  reason: string;
  accountEmail?: string | null;
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
      {accountEmail && (
        <p className="mt-1 text-xs text-amber-700/70">Last connected account: {accountEmail}</p>
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
