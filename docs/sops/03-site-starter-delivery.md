# SOP 03 — Site Starter delivery

**Trigger:** Stripe checkout completed for `site-starter-landing`, `site-starter-marketing`, or `site-starter-pro`.
**Owner:** studio principal.
**Inputs:** Stripe `checkout.session.completed` event with `tier_slug` metadata.
**Outputs:** live production site, handoff doc, Loom walkthrough, repo transferred or invited.

This SOP is templated so it runs the same way every time. The only difference between Landing / Marketing / Pro is page count and CMS — the workflow is identical.

---

## Hour 0 — Auto-acknowledgment (already wired)

Stripe webhook handler:
1. Verifies signature.
2. Writes `engagements` row with `stripe_session_id`, `tier_slug`, `contract_value`.
3. Sends client confirmation email via Resend with: payment receipt, intake form link, "next steps" content.
4. Sends studio notification to `sage@sageideas.dev`.

Verify the webhook fired in `stripe_webhook_events`. If not, re-process via `/admin/stripe`.

---

## Day 0 (same business day) — Intake

1. Within 4 business hours of payment, send personal email:
   - Welcome by name.
   - Confirm tier purchased + turnaround SLA.
   - Link to intake form (Tally or in-house Supabase form): brand, content, integrations, examples of sites you like, timeline preferences.
   - Calendar link for optional 30-min kickoff call.
2. Mark engagement `intake_sent`.

---

## Day 1 — Kickoff

When intake comes back:
1. Read it all. Look for missing pieces — chase if needed.
2. Open `/admin/crm/[engagement-id]` and write a 1-paragraph plan: pages, IA, design direction, integrations, risk areas.
3. Spin up:
   - New repo from `site-starter-template` (Next.js 15 + Tailwind v4 + Sanity for Pro tier).
   - Vercel project pointed at the repo.
   - Sanity project (Pro tier only) — free tier covers 3 users, 10k docs.
4. Send "Day 1 status" Loom (90 seconds): here's the plan, here's the preview URL (will populate as builds land), here's when you'll hear from me next.

---

## Day 2-3 (Landing) / Day 2-6 (Marketing) / Day 2-9 (Pro) — Build

Each day:
1. Pull intake, work the IA top-down.
2. Commit to a feature branch, open a PR against `main` for self-review.
3. Merge → Vercel auto-deploys to a preview URL.
4. End-of-day status note: "Today shipped X, tomorrow shipping Y, blockers if any."

**Per-tier scope:**
- **Landing:** one page (Hero, Features, Social proof, CTA, Footer), contact form, analytics.
- **Marketing:** 4 pages (Home, Services, About, Contact), Schema.org Org/Service/Breadcrumb, sitemap.
- **Pro:** 6 pages + Sanity-backed `/blog` index + post template, full schema, sitemap, robots, OG.

**Quality bar (every tier):**
- Lighthouse 95+ across Performance, A11y, SEO, Best Practices.
- LCP < 1.5s on 4G mobile (Vercel Speed Insights).
- Mobile-first responsive (test 320px, 768px, 1024px, 1920px, 4K).
- Working contact form with spam protection (honeypot + rate limit).
- Working analytics (Plausible script or GA4 tag verified in DevTools).

---

## Day 4 (Landing) / Day 7-8 (Marketing) / Day 10-12 (Pro) — Revisions

1. Send "ready for revisions" email with preview URL + screen-recording walkthrough of every page.
2. Client reviews, sends consolidated feedback (NOT scattered Slack DMs — push back if they try).
3. Apply revisions. One round for Landing, two for Marketing/Pro.
4. Re-send for sign-off.

If the client requests scope expansion (extra pages, CMS for Marketing, etc.):
- Quote it in writing.
- Don't start until they say yes.
- Add as a `change_orders` row in the engagement.

---

## Final day — Launch

1. DNS cutover: client points domain to Vercel.
2. Production deploy verified — visit live URL on phone + desktop.
3. Final Lighthouse run, save report to `docs/launches/[client]-[YYYY-MM-DD].json`.
4. Loom handoff video (5-7 min): how to update content (Pro), where analytics live, how to reach you.
5. Send handoff email:
   - Live URL.
   - Repo URL (if transferring) or GitHub invite (if hosting).
   - Vercel project URL + how to add team.
   - Sanity Studio URL + how to log in (Pro).
   - "Add Site Care for $300/mo to keep it tuned" upsell.
6. Mark engagement `delivered`.

---

## Day +30 — Post-launch check (Pro only)

For Pro tier (which includes 30 days of post-launch support):
1. Calendar reminder.
2. Email: "Anything broken? Anything you want changed? You've got [X] days of support left."
3. Address any reasonable requests.
4. At day 30, send "support window closed; here's Site Care if you want continued ongoing help."

---

## What to NOT do

- Don't send the final invoice — payment was already collected at checkout. Sending another invoice confuses bookkeeping.
- Don't accept scope expansion without a written change order.
- Don't ship without the Lighthouse 95+ baseline. If you can't hit it, fix it before launch — that's the bar.
- Don't transfer the repo before payment clears (relevant for ACH or wire payments — N/A for Stripe Checkout cards).
