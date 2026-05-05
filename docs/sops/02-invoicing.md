# SOP 02 — Invoicing

**Trigger:** kickoff paid, milestone hit, monthly retainer cycle, or final delivery.
**Owner:** studio principal.
**Inputs:** active engagement in `engagements`.
**Outputs:** Stripe invoice issued, payment collected, `invoices` row created, accounting reconciled.

---

## Step 1 — Decide what to invoice

| Engagement type | Invoicing schedule |
|---|---|
| Site Starter (Landing/Marketing/Pro) | Full payment via Stripe Checkout up front (already collected — no invoice needed) |
| Sage Audit ($750) | Full payment via Checkout up front |
| Ship / Brand Sprint / Automate / SEO Sprint | 50% kickoff / 50% on delivery |
| Build (custom) | 25% kickoff, milestone-based for the rest, 10% holdback released 30 days post-launch |
| Care retainers | Monthly subscription via Stripe — auto-charge, no manual invoice |
| Operate retainer | Monthly subscription via Stripe — auto-charge |
| Custom (extended catalog) | Per SOW |

## Step 2 — Send invoice via portal

1. Open `/admin/crm/[engagement-id]/invoices`.
2. Click "New invoice." System uses Stripe API to create draft.
3. Set: line items, due date (Net 14 default, Net 30 for established clients only).
4. Optionally attach SOW PDF for reference.
5. Click "Send." System emails invoice via Stripe + writes to `invoices` table.

## Step 3 — Confirm payment

When Stripe webhook fires:
1. `stripe_webhook` route updates `invoices.status` to `paid`.
2. Engagement status auto-advances if invoice was a milestone trigger.
3. Webhook event logged in `stripe_webhook_events` for audit.

Verify monthly: reconcile `invoices` (paid) against Stripe payouts in Mercury (deposits). Discrepancies → check `stripe_webhook_events` for failures.

## Step 4 — Dunning if late

**Day 1 past due:**
- Stripe sends automatic reminder.
- Mark engagement `invoice_overdue`.

**Day 3 past due:**
- Send a personal email: "Hey [name], the invoice for [scope] hit due on [date]. Anything blocking? If there's a paperwork issue or PO requirement on your end, just let me know."
- Tone: helpful, not aggressive. Many late invoices are AP processing delays, not refusal.

**Day 7 past due:**
- Pause work. Email the primary contact + their accounting alias if known: "Pausing work on [scope] until invoice [#] is paid. Happy to resume same-day once payment clears."
- Update `engagement_status_history` with `paused_unpaid`.

**Day 14 past due:**
- Final reminder. Mention the late fee from the SOW (typically 1.5% per month).
- If no response by day 21, escalate per the SOW (small claims, collections, or write off depending on amount).

## Step 5 — Care retainer dunning

Stripe handles this for subscriptions:
- Day 1 fail: retry in 3 days.
- Day 3 fail: retry + send email.
- Day 7 fail: subscription cancels.
- Smart Retries enabled in Stripe Dashboard → Settings → Subscriptions.

When a Care subscription cancels for failed payment:
1. Webhook fires, `subscriptions.status = canceled`.
2. Email client: "Your Care retainer payment failed. The card on file may have expired. Fix it here: [billing portal link]. Service paused; resumes immediately on payment."
3. Mark engagement `care_paused`.

## Step 6 — Bookkeeping

Monthly:
1. Log into Wave.
2. Categorize Stripe deposits as Revenue → "Engagements" or "Care Retainers."
3. Categorize Stripe fees as expense → "Payment Processing."
4. Reconcile against Mercury statement.
5. Generate P&L for the month, save to `docs/finance/[YYYY-MM].pdf` (gitignored — local only).

Quarterly: export YTD P&L, set aside 30% of net profit to tax savings account, file Form 1040-ES.
