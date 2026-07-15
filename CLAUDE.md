# Onboardly — Project Constitution

## Product
- Onboardly: automated client onboarding SaaS for agencies/freelancers.
- Two user types: Admin (agency owner, full dashboard) and Client
  (magic-link experience, no account).

## Stack
- Next.js 15 (App Router) + Tailwind CSS + TypeScript
- Supabase: database + auth. Client lives in lib/supabase.ts.
- Icons: lucide-react only. No new packages without asking me first.

## Hard rules
- NEVER use or reference the service_role key. Anon key only, via
  NEXT_PUBLIC_ env vars in .env.local (gitignored).
- Never commit secrets. Never log emails/passwords to console.
- All new tables get Row Level Security enabled with explicit policies.
- No fabricated content anywhere: no fake stats, testimonials, or logos.
- Respect prefers-reduced-motion in all animations.
- Do not modify files outside the scope of the current task. If a
  change elsewhere seems needed, ask first.
- Design system: white bg, indigo-600 accent, Inter, rounded-2xl,
  soft shadows. Match existing components.

## Workflow
- Give me SQL as snippets to run in Supabase SQL Editor — never
  assume DB access.
- After each task: report files created/changed + a test plan.
- Front-end-only stubs must say so honestly (no fake success states).
