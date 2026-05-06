# Sage Ideas Studio

The operating system of an AI-native B2B studio. A single Next.js app that runs the
entire client lifecycle: marketing, lead capture, contracts, e-signature, billing,
client portal, project delivery, time tracking, and audit logging.

**Live:** https://www.sageideas.dev

---

## What this is

This repository is the production codebase for [Sage Ideas LLC](https://www.sageideas.dev) —
a digital studio that builds AI-native software, telemetry platforms, and trading
systems for B2B operators. The app is the studio's go-to-market site, its CRM, and
its delivery platform — all in one.

Outside studios typically stitch together five SaaS tools to do this (HoneyBook +
DocuSign + Stripe + Notion + ClientPortal.io). This is the integrated version.

---

## Architecture

| Layer | Stack |
|---|---|
| Framework | Next.js 16 (App Router, RSC, Server Actions) |
| UI | React 19, Tailwind 4, Radix Primitives, Framer Motion |
| Auth | Supabase Auth (email + magic link + OAuth: Google, GitHub, LinkedIn) |
| Database | Supabase Postgres 17 with Row Level Security |
| Payments | Stripe Checkout + Subscriptions + Webhooks |
| Email | Resend + AWS SES SDK |
| E-signature | In-house signature pad + tamper-evident hash + audit trail |
| Hosting | Vercel (Edge + Node runtimes) |
| Observability | Sentry, PostHog, Vercel Analytics |
| Testing | Playwright (E2E + UI), axe-core (a11y), Lighthouse CI, k6 (load) |

---

## Surface area

- **Public:** marketing site, services × industries matrix, pricing, capabilities,
  blog, lab, comparison pages, legal hub (MSA, NDA, SOW template, DPA, Privacy,
  Terms, Cookies)
- **Auth:** email/password, magic link, OAuth (Google, GitHub, LinkedIn), forgot
  password, multi-step signup wizard, role-based redirect, approval queue
- **Admin dashboard** (`/admin`): pipeline kanban, CRM, document templates,
  contract generation + e-sign, invoicing, time tracking, profitability,
  workload, audit log, user management, studio settings
- **Client portal** (`/portal`): home, engagements, projects, deliverables,
  documents (view + sign), invoices, billing, calendar, messages, inbox,
  notification preferences, help center, service catalog

105 routes, 57 API endpoints, 38 database tables, ~75K lines of TypeScript.

---

## Local development

```bash
# Install
npm install

# Configure env (see .env.example)
cp .env.example .env.local

# Run dev server (port 3040)
npm run dev

# Run tests
npm run test:e2e         # Playwright E2E against local dev server
npm run test:rls         # Supabase RLS isolation suite
npm run lint             # ESLint
npm run build            # Production build

# Seed test data (Phase 0)
npm run seed:test
```

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_SITE_URL=https://www.sageideas.dev
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

See `docs/AUTH_SETUP.md` for OAuth provider configuration and
`docs/AUTH_EMAIL_HOOK_SETUP.md` for the custom email hook setup.

---

## Documentation

- `docs/ADMIN_RUNBOOK.md` — every admin workflow end-to-end
- `docs/AGENCY_OPERATIONS.md` — day-to-day operations
- `docs/TEST_ACCOUNTS.md` — seeded test users (Phase 0)
- `docs/sops/` — standard operating procedures (onboarding, invoicing,
  delivery, retainer, incident response)
- `content/legal/` — MSA, NDA, SOW template, Privacy, Terms, Cookies (MDX)

---

## Status

- ✅ Public site live at https://www.sageideas.dev
- ✅ Auth (password + magic link + 3 OAuth providers) — verified
- ✅ Admin dashboard — 12 routes, all wired to Supabase
- ✅ Client portal — 16 routes, all wired to Supabase
- ✅ End-to-end pipeline: lead → contract → e-sign → invoice → payment → delivery
- ✅ Stripe subscriptions + 7 webhook events handled
- ✅ Audit log on every admin action
- ✅ Row Level Security verified by isolation tests (10/10)
- ✅ E2E suite passing against production (28/28)
- ✅ CI green on every push (lint + build + content validation + E2E + RLS)

The **Phased Game Plan to 95+** lives in the project tracker and ships in
6 phases: Pre-flight → Security/DB → Pipeline → BI → Enterprise Readiness →
Performance → Pen Test & Launch.

---

## Security

See [`SECURITY.md`](./SECURITY.md) and `/.well-known/security.txt` for
responsible disclosure.

RLS isolation tests run on every push. Supabase advisor sweep is a release
gate. External pen test is performed annually.

---

## License

© 2026 Sage Ideas LLC. All rights reserved. This codebase is proprietary.
