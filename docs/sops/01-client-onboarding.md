# SOP 01 — Client onboarding

**Trigger:** new inquiry lands in `/admin/inbox` (from `/contact`, `/inquiry`, referral, or DM).
**Owner:** studio principal.
**Inputs:** inquiry record in `engagement_inquiries`.
**Outputs:** signed engagement, kickoff scheduled, payment received.

---

## Step 1 — Triage (within 4 business hours)

1. Open `/admin/inbox`. Read the inquiry.
2. Decide:
   - **Fit + ready** → schedule discovery call. Reply with 2-3 calendar slots.
   - **Fit + not ready** → reply with a "what to think about before we talk" note + offer a future window.
   - **Wrong fit** → reply with an honest no + a referral if you have one.
3. Mark the inquiry `triaged` in admin.

## Step 2 — Discovery call (30 minutes)

Goal: confirm it's a real engagement, scope it, set a budget band.

Questions to cover:
1. What problem are you solving? Who is it for?
2. What have you tried? What worked / didn't?
3. What's the budget envelope? (Don't accept "we'll see" — push for a band.)
4. What's the timeline pressure? Why now?
5. Who else is involved on your side? Who signs off?

After the call:
1. Write a 1-page summary into `engagements` table via `/admin/crm/new`.
2. Set `contract_value` and `budget_hours` (NOT `budget` — that field doesn't exist).
3. Mark engagement `discovery_complete`.

## Step 3 — Proposal (within 48 hours)

1. Open `/admin/crm/[engagement-id]/proposal`.
2. Pick a `contract_template` close to scope, customize.
3. Confirm: scope, deliverables, milestones, timeline, payment terms (50% kickoff / 50% delivery is the default, or milestone-based for >$10k).
4. Generate signing URL via "Send for signature" — system creates a tokenized URL and emails the client via Resend.
5. Mark engagement `proposal_sent`.

## Step 4 — Signature + kickoff invoice

1. Client signs via `/sign/[token]` — system writes to `signature_audits` and `documents`, marks engagement `signed`.
2. Send kickoff invoice via Stripe (see SOP 02).
3. Once Stripe webhook confirms paid, mark engagement `kickoff_paid`.

## Step 5 — Kickoff (within 5 business days of payment)

1. Schedule kickoff call (60 min) via Cal.com or your booking tool.
2. Send pre-read: project brief, communication preferences, access requirements.
3. Run kickoff:
   - Confirm scope + milestones.
   - Confirm communication cadence (default: Slack Connect or email, weekly status note Friday).
   - Confirm access list (repo, hosting, analytics, CMS).
4. Set engagement `active`.
5. Add client to `Clients/[ClientName]` Gmail label.

## Step 6 — Day-1 followup

Within 24 hours of kickoff:
1. Recap email summarizing what was agreed.
2. Confirm any access still pending.
3. Loom intro of yourself + how the next week will go.

The client should walk away from kickoff knowing exactly what happens next without needing to ask.
