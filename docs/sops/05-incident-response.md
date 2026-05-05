# SOP 05 — Incident response

**Trigger:** site goes down, payment fails repeatedly, security alert, or client escalation.
**Owner:** studio principal (you are on call).
**Inputs:** the alert (page, email, Slack ping, client message).
**Outputs:** incident resolved, client communicated, postmortem if Sev1/Sev2.

---

## Severity ladder

| Sev | Definition | Response time | Communication |
|---|---|---|---|
| 1 | Production site down for paying client | 30 minutes | Live status updates every 15 min |
| 2 | Payment processing broken, signup broken, data integrity issue | 2 hours | Update on resolution within 2 hours |
| 3 | Single-feature broken, single-user issue | Next business day | Acknowledge same day |
| 4 | Cosmetic, low-priority bug | Next sprint | Acknowledge within 48 hours |

## Step 1 — Triage (first 5 minutes)

1. Acknowledge the alert. Stop whatever you're doing if Sev1.
2. Confirm scope: who is affected? One client? All? Public site? Admin only?
3. Set severity.
4. If Sev1 or Sev2: post a status update in the affected client's Slack Connect / email immediately:
   ```
   Heads up — investigating [issue] right now. Will update by [time + 15 min].
   ```
5. Open an `incidents` row in the admin (or a Linear issue tagged `incident`).

## Step 2 — Diagnose

Common entry points:
- **Site down:** check Vercel deployment status, then Supabase status, then DNS.
- **Payment broken:** check Stripe dashboard for webhook failures; check `stripe_webhook_events` table for delivery failures.
- **Auth broken:** check Supabase auth status, recent migrations, env vars on Vercel.
- **Cron not running:** check `cron_runs` table; verify `CRON_SECRET` matches Vercel env.
- **Data integrity:** read RLS audit log (`audit_log` table). DO NOT mutate data without a documented hypothesis.

## Step 3 — Fix

Default to a **safe, reversible fix** first:
- Vercel rollback (Deployments → previous → "Promote to production") if a recent deploy caused it. 30 seconds.
- Stripe dashboard re-send a webhook from `Developers → Events`.
- Supabase: never run destructive SQL during incident response. Read-only investigation first.

If the fix requires a code change:
1. Branch off `main`, write the fix, run tests, open PR, merge, deploy.
2. Verify in production.
3. Update the incident record with the commit SHA.

## Step 4 — Communicate resolution

When fixed:
1. Post update to affected clients:
   ```
   Resolved at [time]. Cause: [one sentence in plain English]. Mitigation: [one sentence]. Postmortem to follow [if Sev1/Sev2].
   ```
2. Update the `incidents` row with `resolved_at`, `root_cause`, `mitigation`.

## Step 5 — Postmortem (Sev1/Sev2 only, within 5 business days)

Write a one-page postmortem to `docs/incidents/[YYYY-MM-DD]-[short-name].md`:
1. **Summary** — what broke, how long, who was affected.
2. **Timeline** — UTC timestamps from detection to resolution.
3. **Root cause** — the single underlying reason. Be honest.
4. **Mitigation** — what was done to fix.
5. **Prevention** — what changes (test, monitor, code, process) prevent recurrence.
6. **Action items** — concrete tasks with owners + due dates.

Postmortems are blameless. The goal is to make the system more resilient, not assign fault.

## Common scenarios

### Site went down — checklist

1. Vercel deployment status (Dashboard → Deployments).
2. Vercel build logs for the last successful deploy.
3. DNS — was the domain just transferred? Did SSL renew?
4. Supabase status (https://status.supabase.com) and project dashboard.
5. Recent merges to `main` — anything risky in the last hour?
6. If nothing obvious: roll back to previous deploy first, diagnose with breathing room.

### Payment failed for a client — checklist

1. Stripe Dashboard → Payments → search by customer email.
2. Read the failure reason (declined, insufficient funds, expired card, fraud).
3. If actionable on client side: send them the Stripe billing portal link to update.
4. If actionable on our side: check `stripe_webhook_events` for delivery failures, replay if needed.
5. Smart Retries are on — let Stripe handle the retry cadence. Don't manually retry.

### Client escalation — process

1. Hear them out. Don't defend; listen.
2. Acknowledge what's wrong: "You're right that X happened, and that's not the bar."
3. Propose a concrete fix + timeline.
4. Document the agreement in writing (email).
5. Deliver. Then over-communicate until trust is restored.
6. After resolution: postmortem with yourself — what process change prevents recurrence?
