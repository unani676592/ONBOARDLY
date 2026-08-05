# Onboardly — Build Log

A phase-by-phase record of shipped work: what was built and how it was
verified. Entries distinguish checks run end-to-end by the maintainer from
those left unverified, and documented constraints from open gaps.

> This file was started at the Google Drive integration. Earlier phases
> (through Phase 9) predate it and are **not** reconstructed here. The phase
> number below is inferred as the next after Phase 9.

---

## Phase 10 — Google Drive integration

Adds Google Drive as an execution-engine integration so an agency's onboarding
can create a per-client folder and collect the client's intake files into it.
Everything on free tiers. Least-privileged `drive.file` scope; a **separate**
OAuth client from Supabase login (so revoking Drive, or rotating its secret,
can't affect login).

### Step 1 — OAuth connection

- Per-agency Drive connection: consent → callback → refresh token stored
  server-side in an RLS-scoped `google_drive_connections` table (never
  `NEXT_PUBLIC_`).
- Validation on save (a real `about.get` check); honest not-connected /
  connected / failed states.
- Disconnect performs a **verified** revoke — it checks Google's `200` rather
  than assuming success, and shows an honest warning (with a link to
  myaccount.google.com) if Google doesn't confirm.
- **Verified end-to-end (maintainer):** connect, connected state, and
  disconnect with the grant confirmed removed from the Google account's
  third-party-app list.
- Documented behavior: while the consent screen is in Testing, Google expires
  refresh tokens roughly weekly. This surfaces as an honest "needs attention"
  reconnect state — expected, not a bug. Publishing the consent screen removes
  the cap.

### Step 2 — Folder creation on invite

- New `create-folder` engine action creates a Drive folder named after the
  client on the `client-invited` trigger, using the stored refresh token.
  Registered in the action registry; engine core untouched.
- Folder id/url persisted on the client row; a link is shown in the client
  drawer (read fresh, so it doesn't depend on stale table/realtime state).
- Idempotent (skips if the client already has a folder); not-connected → clean
  skip; expired auth → the step-1 "needs attention" reason; a Drive failure
  never blocks the invite.
- **Verified end-to-end (maintainer):** folder created in Drive with the
  correct name, drawer link opens it, activity logs a real run; not-connected
  skips cleanly and the invite still succeeds.

### Step 3 — Intake files uploaded into the client's folder

- New `upload-files` action plus a **trigger-scoped** runner
  (`runTriggerActions`) for the `files-uploaded` trigger. That trigger fires
  from the public intake route with **no agency session**, so the runner and
  action operate under `service_role`, scoping every query explicitly by
  `user_id`.
- Copies each intake file into the client's Drive folder (into the folder, not
  the root) and records each in a new `client_drive_files` table
  (`object_path → drive_file_id`), so uploads are idempotent and resumable. A
  partial batch is logged as **failed** with counts — never a clean run.
- Write-then-update logging: a `running` row is written up front and finalized
  on completion, so a killed batch leaves a visible in-progress row (shown as a
  distinct "In progress" state, not the amber needs-attention state).
- `maxDuration` set explicitly on the intake route (a worst-case 6×10 MB batch
  can exceed the platform default).
- **Verified (maintainer):** happy path on localhost — a file lands inside the
  client's folder and activity logs a real run.
- **Verified (script/DB evidence):** idempotency — on a re-fired trigger, an
  already-recorded file is not re-copied; only the new object is uploaded
  (confirmed via `client_drive_files` records).
- **Unverified:** the exact "all files already in Drive" skip message (the
  `pending === 0` branch) — not reachable through the current UI.
- Production note: an intake upload failed on the deployed site due to a stale
  `service_role` key in Vercel (environment, not code); local uploads work.

### Engine fix — trigger-scoped execution (separate commit)

- `runWorkflow` previously walked every action reachable from **any** trigger,
  so an action wired under one trigger (e.g. `files-uploaded`) also ran — and
  logged a skip — on every other trigger (e.g. `client-invited`).
- Extracted a single `actionNodesForTrigger` reachability helper (one source of
  truth) used by **both** `runWorkflow` and the trigger-scoped runner;
  `runWorkflow` now runs only the branch of the trigger that fired.
  `manual-resend` still bypasses the engine.
- **Verified (maintainer):** on invite, activity shows only the invite branch
  (Send email / Create folder / Add to Notion) and the phantom
  "Upload files to Drive · Skipped" row is gone; the reachability logic was also
  checked directly.

### Dropped — folder-sharing with the client

- The originally-planned step ("share the Drive folder with the client") was
  **dropped, not deferred.**
- Reason: clients have no Google account (magic-link model), so the only
  workable share is `anyone-with-link` read-only — which merely lets them view
  files they already sent (near-zero value) and grants no write path. Anything a
  client added directly in Drive would be invisible to Onboardly (no
  `client_drive_files` row, no Supabase copy, no activity entry). A feature that
  silently bypasses the system is worse than not having it. (`drive.file` does
  permit sharing app-created folders — this is a product decision, not a
  technical block.)
- Replaced by: re-opening intake for already-submitted clients (in progress).

### Known limitations (this phase)

| Limitation | Kind | Notes |
| --- | --- | --- |
| Deleting a client does not delete its Drive folder | Documented constraint | Orphaned folders remain in the agency's Drive; deleting client data doesn't reach into Google. Not a bug. |
| Client folders land in the root of My Drive | Documented constraint (`drive.file`) | `drive.file` can only touch what the app created, so there's no parent-folder placement without the Google Picker API. Not a bug. |
| A fully-failed intake upload gives the agency no signal | Known gap (follow-up) | If every file fails to store, the `files-uploaded` trigger never fires (`results.some(ok)` is false), so there's no activity row and nothing surfaces to the agency. Proposed fix: log an activity row on intake-upload failure. |
