# SOP 04 — Care retainer monthly cycle

**Trigger:** monthly — runs once per active Site Care / Brand Care / Content Care subscriber.
**Owner:** studio principal.
**Inputs:** active subscription in Stripe, engagement record with `care_active = true`.
**Outputs:** monthly work delivered, status note sent, hours logged.

---

## Day 1 of the month — Plan

1. Open `/admin/care` (or filter `engagements` by `tier_slug LIKE 'site-care%' AND status = 'active'`).
2. For each active Care client:
   - Review last month's status note.
   - Pull the queue from their channel (Slack Connect, email, or in-app `tasks`).
   - Sort tasks by impact / effort.
   - Pick the top items that fit the retainer's hour budget:
     - **Site Care ($300/mo):** ~3 hours of upkeep work.
     - **Brand Care ($400/mo):** ~4 hours of brand maintenance.
     - **Content Care ($800/mo):** ~6 hours of content refreshes + linking.
3. Write the month's plan into the engagement notes. Send to client as a "this month's plan" email.

## Throughout the month — Execute

For each Care tier, the standard work:

### Site Care
- Dependency upgrades (Next.js patch, deps with security advisories).
- Lighthouse re-run; fix any regressions.
- Copy edits requested by client.
- Small feature tweaks (< 2 hours each — anything bigger needs a change order).
- Uptime check via Vercel monitoring or BetterUptime free tier.
- Backup verification: confirm Supabase → S3 backup ran (cron `0 3 * * *`).

### Brand Care
- Logo / asset refreshes.
- New social asset templates as requested.
- Brand guideline edits as company evolves.
- Quarterly: brand health review (where is the brand showing up wrong / inconsistent).

### Content Care
- Refresh 2-4 existing posts (update stats, fix broken links, improve internal linking).
- Tighten internal linking + topic clusters.
- Light social repurposing of existing posts (LinkedIn carousel, X thread).
- Monthly analytics review with topic suggestions.

Log every change as a commit (`Care: [client] - [task]`) or a Linear issue — there must be a record.

## Last day of month — Status

1. Write a status note in the engagement: what was done, what was deferred, what's queued for next month.
2. Send to client by email. Format:
   ```
   Subject: [Client] — Site Care, [Month] [Year]

   Hi [name],

   This month on Site Care:
   - [bullet]
   - [bullet]
   - [bullet]

   Queued for next month:
   - [bullet]

   Anything to add to the queue? Just reply.

   — Jason
   ```
3. Confirm Stripe subscription invoice for the month was paid (auto). If failed, see SOP 02 dunning.

## Quarterly — Strategic review (30 minutes)

Once per quarter, schedule a 30-min check-in per Care client:
1. What's working / not in the cadence?
2. What's the client wishing they could add but the budget doesn't cover?
3. Should they upgrade? (Site Care → Ship, Brand Care → Brand Sprint, Content Care → Content Engine.)

Push real upgrades, not artificial ones. Honest service > more revenue this month.

## When to cancel a Care client

- Three consecutive months of underutilization (< 30% of hours used) — offer to pause or downgrade.
- Persistent payment failures (see SOP 02).
- Scope creep with no upgrade in sight — push for a change to a higher tier.
