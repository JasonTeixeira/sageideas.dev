# Sage Ideas — Agency Operations

Free-tier-first operations stack. Every tool listed here has a no-cost or pay-only-when-you-grow path. Upgrades are noted where they make sense.

---

## 1. Day-to-day workflow

The standard engagement lifecycle:

1. **Lead** — inbound via `/contact`, `/inquiry`, or referral. Captured in Supabase `engagement_inquiries`.
2. **Discovery** — 30-minute call. Confirm fit, scope, timeline. Output: a one-page summary in `engagements`.
3. **Proposal** — fixed-fee scope of work. Created from a `contract_template`, e-signed via `/sign`, audit trail in `signature_audits` + `documents`.
4. **Active** — work executed. Status transitions via `engagement_status_history`. Daily/weekly status notes in the engagement record.
5. **Delivery** — handoff session, runbook, Loom walkthrough. Mark engagement `delivered`.
6. **Invoicing** — Stripe invoice for milestone or final. Card/ACH. Tracked in `invoices` table.
7. **Care retainer** — convert clients to Site Care / Brand Care / Content Care monthly retainer post-launch.

Every transition has an admin UI under `/admin/crm` and `/admin/pipeline`.

---

## 2. Banking

**Tool:** [Mercury](https://mercury.com) — free business banking.

**Why Mercury:** $0/month, no minimum balance, virtual cards on demand, native Stripe payout integration, native bookkeeping export, FDIC-insured up to $5M via sweep.

**Setup steps:**
1. Apply at https://mercury.com — takes ~10 minutes.
2. Verify EIN (have it ready from IRS letter).
3. Once approved, link Mercury account to Stripe under Stripe Dashboard → Settings → Payouts.
4. Issue virtual cards for SaaS subscriptions (Vercel, Resend, etc.) so card spend is auto-categorized.
5. Connect Mercury to Wave (bookkeeping) via "Add an account" → search Mercury → OAuth.

**Standard accounts:** primary checking (operating), savings (tax reserve — auto-transfer 30% of every Stripe payout).

---

## 3. Bookkeeping

**Tool:** [Wave](https://waveapps.com) — free accounting + free invoicing.

**Why Wave:** $0/month for accounting and bank-feed sync. Generates Profit & Loss, Balance Sheet, and tax-ready summaries. Wave does charge for payment processing and payroll, neither of which we use here (Stripe handles money in, owner draws handle money out).

**Setup steps:**
1. Create a Wave business at https://waveapps.com.
2. Connect Mercury bank feed.
3. Connect Stripe (Wave imports Stripe payouts and fees automatically).
4. Set up chart of accounts: Revenue (Engagements / Care Retainers), Cost of Services, SaaS, Marketing, Travel, Owner Draw.
5. Monthly task: log into Wave, categorize transactions (~15 min), reconcile against Mercury statement.
6. Quarterly: export P&L, hand to accountant or use for estimated taxes.

**Important:** Stripe is the source of truth for revenue. Wave receives Stripe deposits as bank transactions; we do NOT issue invoices from Wave. The `invoices` table in Supabase mirrors Stripe invoices for client portal display.

---

## 4. Tax setup

US sole proprietor or single-member LLC default — disregarded entity, profit flows to personal 1040 Schedule C.

**Quarterly estimated taxes (Form 1040-ES):**
- Q1 due April 15
- Q2 due June 15
- Q3 due September 15
- Q4 due January 15 (of following year)
- Reference: https://www.irs.gov/payments/estimated-taxes

**Set aside 30% of every Stripe payout** to a Mercury savings account. That covers federal income tax + self-employment tax (15.3%) for most brackets. Adjust higher in your top bracket.

**Forms:**
- Sole prop / single-member LLC: Schedule C (attached to your 1040).
- S-corp election (recommended once net profit > $80k/yr to save on SE tax): Form 1120-S annually + W-2 from your own payroll.

**Recommended:** hire a CPA once revenue > $100k/yr. For < $100k, TurboTax Self-Employed + Wave-generated P&L is enough.

---

## 5. Customer support inbox

**Now (free):** Gmail filters + labels.

**Setup:**
1. Forward `sage@sageideas.dev` to your primary Gmail.
2. Create label "Clients" with sub-labels per active client (e.g. `Clients/Nexural`, `Clients/AlphaStream`).
3. Filter: any email matching a client domain → auto-apply that client's label + skip inbox.
4. Daily routine: triage "Clients" label first thing. Anything urgent → reply within 4 business hours. Anything that needs work → create a `tasks` row in admin or a Linear issue.

**Migrate when client count > 30:** [Plain](https://plain.com) — purpose-built B2B support inbox with shared visibility, customer profiles, escalation. Plain has a free tier for small teams.

---

## 6. SOPs / Wiki

**Tool:** this `docs/` folder + GitHub. Free, version-controlled, searchable, no SaaS lock-in.

**Structure:**
- `docs/AGENCY_OPERATIONS.md` — this file. The top-level operations playbook.
- `docs/ADMIN_RUNBOOK.md` — admin app workflows (login, settings, pipeline, invoicing).
- `docs/sops/` — one markdown file per repeatable procedure.
- `docs/sops/00-README.md` — index.

**Why not Notion:** Notion is fine, but every doc you put there is a doc you cannot link from a `git blame` and a doc that vendor-locks the studio. Markdown in the repo means search works in your editor, AI tools can read it, and PRs can edit operations alongside code.

---

## 7. Contract storage

**Already in place.** Confirmed sufficient for 100+ customers without a separate tool.

- `signature_audits` — append-only audit trail (IP, user agent, timestamp, document version, signer identity).
- `documents` — the signed PDFs, stored in Supabase Storage with RLS so only the signer + admins can read.
- `contract_templates` — reusable scopes of work.

When client count grows past ~100 or you take on regulated industries, evaluate Documenso self-hosted (see below).

---

## 8. E-sign

**Now (DIY):** `/api/sign` — owned in-house. Captures signer name, IP, user agent, draws signature canvas, hashes the document, writes to `signature_audits`.

**Flow:**
1. Admin creates a contract from a template under `/admin/crm/[client]`.
2. System generates a tokenized signing URL: `/sign/[token]`.
3. Client visits URL, reviews PDF, draws signature, confirms.
4. `/api/sign` verifies token, captures audit fields, writes signed PDF to Supabase Storage, marks engagement `signed`.
5. Both parties receive a copy by email (Resend).

**Optional upgrade:** [Documenso](https://documenso.com) — open-source, self-hostable on Vercel + Supabase or any Postgres. Adds: legal-grade audit trails (PAdES compliant), bulk signing, multi-signer flows, embedded signing widgets. Free if self-hosted; pay only if you use their hosted plan. Worth considering if you start signing 50+ contracts/month or take on regulated clients.

---

## 9. Quick reference — tool stack

| Function | Tool | Cost | Migrate to |
|---|---|---|---|
| Banking | Mercury | $0 | — |
| Bookkeeping | Wave | $0 | QuickBooks at >$200k revenue |
| Money in | Stripe | 2.9% + 30¢ | — |
| E-sign | DIY (`/api/sign`) | $0 | Documenso self-host (free) |
| Contracts | Supabase | included | — |
| Inbox | Gmail | $0 | Plain at >30 clients |
| Wiki / SOPs | This `docs/` folder | $0 | — |
| Tax software | TurboTax SE | ~$120/yr | CPA at >$100k revenue |
| Quarterly taxes | Form 1040-ES | $0 | — |

---

## 10. SOPs index

See `docs/sops/00-README.md`.
