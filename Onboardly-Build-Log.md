# Onboardly — Build Log

**Product:** Automated client onboarding system for agencies and freelancers
**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Storage) · Resend · Notion API · React Flow
**Status:** Deployed to Vercel. Core product loop fully functional.

---

## Product Overview

Agencies and freelancers lose real time onboarding every new client — chasing brand files, copy-pasting welcome emails, creating folders, setting up the same internal tasks. Onboardly reduces that to one form: the client gets a link, no account needed, fills their details once, and the agency's dashboard updates automatically. Automated actions (invite email, CRM record, file storage) fire from that single submission.

### User types

| Type                     | Role                                                       |
| ------------------------ | ---------------------------------------------------------- |
| **Admin (agency owner)** | Buyer and primary user — full dashboard, client management |
| **Client (end user)**    | Magic link only — no account, minimal friction             |

### Status pipeline

`Invited` → `Form Completed` → `Files Pending` → `Onboarded`

---

## Phase 0 — Validation & Positioning ✅ Complete

- Problem statement defined (post-deal setup, not sales)
- Target ICP defined (agencies, freelancers, 3+ clients/month)
- Outreach conducted; one substantive respondent (digital marketing freelancer, ~1 day/client for setup)
- Key finding: "onboarding" is read as *sales* by most people — messaging must clarify it means post-deal setup

---

## Phase 1 — Landing Page ✅ Complete

- Pain-first headline, full mockup, hero with HTML/CSS dashboard (no image asset)
- Pain cards, how-it-works, audience chips, build-in-public strip (no fake social proof)
- Pricing (3 tiers), accessible FAQ accordion, footer with Privacy/Terms
- Fully responsive, 3D hover tilt on hero (respects reduced-motion and touch)
- **Product decision:** no fabricated stats or testimonials anywhere — replaced with honest copy

---

## Phase 2 — Authentication UI ✅ Complete

- Split-screen login and signup pages, distinct left-panel content per intent (reminder checklist vs benefit cards)
- Full form validation, password visibility toggles, accessibility (aria-invalid, focus states)
- Mobile behaviour handled

---

## Phase 3 — Backend: Waitlist & Auth ✅ Complete

- `CLAUDE.md` project constitution (stack rules, security constraints, workflow)
- Waitlist table with RLS (anon insert-only, no read access), duplicate emails treated as success
- Email/password auth via Supabase, SSR session handling via `@supabase/ssr`, protected `/dashboard`
- Google OAuth fully wired (consent screen, test users, PKCE callback route)

---

## Phase 4 — Dashboard & Settings ✅ Complete

- Authenticated app shell (sidebar + top bar), all routes protected
- Honest "Soon" badges and coming-soon pages for unbuilt sections
- Real stat cards (no dummy data), empty states with single clear actions
- Settings as a modal: General, Account, Billing (honest "Early Access — Free"), Privacy tabs
- **Product decision:** no dummy data anywhere — new users see real zeros

---

## Phase 5 — Clients & Magic Link ✅ Complete

### 5a. Clients feature
- `clients` table with RLS (four policies), unique constraint per agency, status check constraint
- Invite modal, search, manual status override, delete with confirmation, live updates on same-tab mutations
- Two-account isolation tested — multi-tenancy verified
- **Bug fixed:** RLS SELECT policy was missing, silently swallowed by client-side error handling; corrected and errors now surface

### 5b. Magic link intake
- Per-client unguessable token, server-side token validation (no anon table access from public page)
- Public `/onboard/[token]` page, personalized greeting, six-field intake form
- Already-submitted state, invalid token → generic 404 (verified: no information leak)
- End-to-end incognito test passed: submit → status auto-flips to `form_completed`
- Agency-side view of submitted answers built via `ClientDetailDrawer` (modal, not a route)
- Agency name in Settings wired to intake page greeting

---

## Phase 6 — File Uploads ✅ Complete

- Supabase Storage bucket + upload policies (private bucket, signed URLs only)
- Real file upload UI on public intake page (client-side validation for type/size)
- Server-side upload route validates token before accepting files
- Agency-side file listing and download in `ClientDetailDrawer` via signed URLs
- Status flow: submission with files → `onboarded`; without files → `files_pending` (files route confirms real uploads, not a form-side flag)
- Cross-session Realtime updates: `/clients` table and dashboard now reflect status changes and new submissions without manual refresh (Supabase Realtime on the `clients` table, RLS-scoped)

---

## Phase 8 (pulled forward) — Automation Execution Engine ✅ Complete

Originally scoped for later, brought forward because automated invite delivery was a functional gap (copy-link only).

### Engine core
- Server-side execution engine reads a workflow's action nodes and runs them in order
- Action registry pattern — new actions register independently; engine core untouched when adding actions
- Unimplemented action types (Create folder, Add CRM record, Condition, Delay) skip cleanly with "not implemented" — no fake success, no silent failure

### Automations canvas
- Node-based workflow builder (React Flow): palette (Triggers/Actions/Flow), draggable canvas, inspector panel
- Honest "Soon" locks on unbuilt palette blocks — not draggable, not fake-functional
- Workflow persistence: `workflows` table (RLS), save/load, dirty-state tracking, unsaved-changes warning
- Draft/Enabled toggle genuinely gates execution — draft sends nothing, and says so

### Email infrastructure (Resend)
- Resend SDK integrated, invite email template, server-side send route
- Automatic send on client invite, gated on workflow enabled state
- Manual "Resend invite" action per client
- Known limitation: Resend's shared test sender (`onboarding@resend.dev`) only delivers to the account owner's own email until a custom domain is verified — deferred, documented, not a bug

### Per-action activity logging
- Every engine-run action writes a record: client, action, outcome (ran/failed/skipped), real reason, timestamp
- Activity tab on `/automations` shows full run history, most recent first, honest empty state

### Notion integration
- Internal integration token method (simpler than public OAuth, appropriate for a single-workspace tool)
- Per-agency credential + target database stored server-side, RLS-scoped
- Connection validated on save (real token check, real database reachability check)
- "Add to Notion" registered as a real engine action: creates a row with client name/email/status/date on invite
- Type-aware property mapping (Notion requires actual Email/Select/Date property types, not just matching names) — fails with the exact missing property if mismatched
- Honest connection states audited: not connected (skips cleanly), connected, connection failed with real reason, revoked/un-shared connection surfaces "needs attention" with a specific cause and reconnect path

---

## Phase 7 (pulled forward) — Welcome Email Template ✅ Complete

### Step 1 — Schema
- `email_templates` table (subject, body, one per agency), RLS matching existing pattern
- Default template and variable registry (`{{client_name}}`, `{{agency_name}}`, `{{magic_link}}`) defined as single source of truth in code

### Step 2 — Editor UI
- `/templates` page (no longer "Soon"): subject + plain-body editor, clickable variable-insertion chips
- Live preview panel with sample values, updates as you type
- Save (dirty-state aware), reload persistence confirmed, unsaved-changes browser warning, Reset to default with confirm dialog

### Step 3 — Wired into send
- Engine's send-email action now loads the agency's saved template (or default), resolves all three variables with real values at send time
- Magic link resolves to the real per-client URL — verified against Copy Link output
- Manual resend uses the same template logic

### Step 4 — Validation
- `{{magic_link}}` is mandatory — Save is blocked with a clear inline reason if removed (this exact failure was caught live during testing when a variable was accidentally replaced with placeholder text)
- Empty subject/body blocked
- Unrecognized/typo'd variables surface a non-blocking warning
- Send-time safeguard if a template somehow lacks the link

---

## Deployment (Phase 9, in progress)

- Pre-deployment audit completed: no build blockers, no committed secrets, no hardcoded localhost URLs
- Missing `SUPABASE_SERVICE_ROLE_KEY` identified and added (required for intake file uploads)
- Deployed to Vercel
- **Outstanding:** confirm live-site smoke test (signup, Google login, invite → email → intake → file upload) on the production domain; set `NEXT_PUBLIC_SITE_URL`; update Supabase Auth redirect URLs and Google OAuth authorized redirect URI for the production domain; decide on the dead "Forgot password?" stub link

---

## Phase 10 — Google Drive Integration ✅ Complete

Adds Google Drive as an execution-engine integration: create a per-client folder on invite and collect the client's intake files into it. Free tier throughout; least-privileged `drive.file` scope.

### Step 1 — OAuth connection
- Separate Drive OAuth client (not the login client) so secret rotation and revoke stay isolated from login
- `drive.file` scope — the app can only touch files and folders it created (least privilege)
- Per-agency refresh token stored server-side in an RLS-scoped `google_drive_connections` table (never `NEXT_PUBLIC_`)
- Honest not-connected / connected / connection-failed states; connection validated on save (real Drive check)
- Disconnect performs a **verified** revoke — it checks Google's response rather than assuming success, and says so honestly if Google doesn't confirm
- **Verified live:** connect, connected state, and disconnect-with-revoke — including confirming the grant disappeared from myaccount.google.com

### Step 2 — Folder creation on invite
- Registered as a real engine action (registry pattern; engine core untouched)
- Creates a Drive folder named after the client, using the stored refresh token
- Folder id and url stored on the client row; link surfaced in `ClientDetailDrawer`
- Idempotent (skips if the client already has a folder); clean skip with a real reason when Drive isn't connected; a Drive failure never blocks the invite
- **Verified live:** folder creation, drawer link, and the not-connected skip

### Step 3 — Intake files uploaded into the client's folder
- New `files-uploaded` trigger path — it fires from the public intake route, which has no agency session, so it runs server-side under the service-role key and scopes every query by `user_id`
- New `client_drive_files` tracking table (`object_path → drive_file_id`) so files are never copied twice
- Partial batches are logged as **failed** with counts — not as a clean run
- A `running` status is written before the upload starts, so a killed request leaves a visible record rather than silence
- **Verified live (localhost):** happy path — the file landed inside the client's folder and Activity logged `Ran`
- **Verified:** per-file idempotency, via the `client_drive_files` records — an already-recorded file is not copied again
- **Unverified:** the `pending === 0` "all files already in Drive" skip message — not reachable through the current UI

### Engine fix — trigger-scoped execution
- `runWorkflow` previously walked actions reachable from **any** trigger, so a `files-uploaded` action ran (and logged a skip) on every invite
- Fixed by extracting a shared `actionNodesForTrigger` helper used by **both** `runWorkflow` and `runTriggerActions`, so each trigger fires only its own downstream actions; `manual-resend` still bypasses the engine
- **Verified live:** an invite now logs only send-email, create-folder and add-to-notion — no phantom upload skip row

### Folder sharing — dropped, not deferred
- The planned "share the folder with the client" step was **dropped, not deferred**
- Reason: our clients have no Google account, so the only workable share is anyone-with-link read-only — which grants no write path and only lets them view files they already sent. Anything a client did add in Drive would be invisible to Onboardly — no tracking row, no Supabase copy, no Activity entry. A feature that silently bypasses our own system is worse than not having it.

---

## Known Limitations (Documented, Not Bugs)

**Invite emails only deliver to the Resend account's own address**
Resend's test-sender anti-spam restriction — applies to every provider, not specific to Resend.
→ Verify a custom domain in Resend (~1 hour, low cost).

**Google OAuth in "testing" mode**
The consent screen is not yet published.
→ Publish before public launch; may trigger Google review.

**No password reset flow**
Not yet built; the "Forgot password?" link is currently a dead stub.
→ Implement the `resetPasswordForEmail` flow, or hide the link until built.

**Dashboard's Recent Clients rows aren't clickable**
The detail view is only reachable from the `/clients` table.
→ Minor — bundle into a later polish pass.

**Notion row is a one-time snapshot at invite**
No sync back when the client's status later changes.
→ Backlog: a status-change trigger to update the existing row.

**Deleting a client leaves its Drive folder orphaned**
Client deletion doesn't reach into Google, so folders accumulate in the agency's Drive over time.
→ Out of scope; `drive.file` gives us no cleanup path we'd want to take automatically.

**Client folders are created in My Drive root**
`drive.file` only permits touching what the app created, so folders can't be placed under a chosen parent.
→ Would need the Google Picker API; out of scope.

**A fully-failed intake upload gives the agency no signal**
When every intake file fails to upload, the `files-uploaded` trigger never fires (`results.some(ok)` is false), so there's no Activity row and no notification.
→ Proposed fix: an Activity row on intake-upload failure; currently a known gap.

---

## Engineering Practices Established

- `CLAUDE.md` project constitution enforced across all AI-assisted sessions
- Anon key client-side only; service-role key server-only, never `NEXT_PUBLIC_`
- RLS enabled on every table with explicit, tested policies; multi-tenancy verified
- No secrets committed — `.env.local` gitignored and verified before every push
- Honest stubs — unbuilt features say so; no dead buttons, no fake success states
- Phased, scoped build sessions — one deliverable per session, explicit "do not touch" fences
- Read-before-build investigation prompts used throughout to avoid duplicate work and scope creep

---

## Roadmap (Not Yet Built)

- **Google Drive integration** — steps 1–3 shipped (OAuth connection, folder creation on invite, intake-file upload); folder-sharing dropped. Remaining: publish the OAuth consent screen for production, which removes the ~weekly test-mode refresh-token expiry
- **Re-open intake for returning clients** — clients currently submit once and have no way to send files afterward, which pushes them back to email; let already-submitted clients send more files
- **Condition / Delay nodes** — branching and scheduled execution in the automation canvas
- **Task checklist templates** — depends on the Tasks feature (not started)
- **Intake form customization** — per-agency question editing
- **Multiple named workflows** — currently one workflow per agency
- **Notion status-sync** — keep the Notion row updated as client status changes
