# Sage Academy — Product Build Plan

> **Historical architecture proposal.** This document is not current authority. Supabase and the existing Academy runtimes are locked by [ADR 0001](./adr/0001-canonical-curriculum-registry.md); Payload CMS/WebContainers and prices in this file require new approved ADRs.

**Status:** planning locked, pre-build. This doc is the single source of truth for building the Academy *product* (the post-login learning app). The marketing/waitlist landing already lives at `/academy`; this plan covers everything *behind the login*.

> Build principle: **get the expensive-to-change foundations right first (model → schema → access), then prove a vertical slice end-to-end, then pour in content.** Do not author 100 lessons against an unproven model.

---

## 1. Locked decisions

| Decision | Choice |
|---|---|
| **Pricing model** | **Subscription, all-access** — $20/mo or $200/yr. One subscription unlocks the entire catalog (DataCamp model). **NOT** per-course purchases. |
| **Founding price** | $20/mo **locked for life** for founding members (dedicated Stripe price / grandfathered). |
| **Content engine** | **Payload CMS 3** — runs inside the Next.js app, stores content in our **Supabase Postgres**. One stack, own the data, no per-seat fees, full bespoke render control. |
| **Video** | **Mux** — adaptive streaming + per-lesson analytics. |
| **Labs ("build it")** | **WebContainers (StackBlitz SDK)** — real Node + npm + terminal in-browser. |
| **Billing** | **Stripe Subscriptions** + Stripe Customer Portal. |
| **Auth / data** | **Supabase** (already built — learner login + Postgres). |
| **First move** | **Vertical slice** — one lesson, fully real, end-to-end. |

### ⚠️ Migration note (current code → target)
The current code does **one-time per-track purchases ($397–$497) with 12-month access** (`academy_enrollments`, Stripe one-time checkout, `lib/academy/fulfillment.ts`). The target is **recurring all-access subscription**. Phase 1 reworks this:
- Replace one-time checkout with subscription checkout.
- New access model = active subscription unlocks everything (deprecate per-track enrollment gating).
- `academy_enrollments` is repurposed/retired in favor of `academy_subscriptions`.
- Marketing already promises "$20/mo locked for life" — so the messaging is already correct; only the code must catch up.

---

## 2. Design quality bar

The product must be **cohesive with the marketing site's premium system** (built this session):
- Type: **Bricolage Grotesque** (display), **Hanken Grotesk** (body), **JetBrains Mono** (mono). No other fonts.
- Color: dark ground, **reserved electric `#3D5AFE`** → moon `#BCD2FF`. No rainbow / no off-palette pink/purple chrome.
- Language: the "operator console / repo-card / reserved-electric" visual system. The lesson player, dashboard, code blocks, and certificates all render at the bar of the Operator Console + work cards.
- Every surface world-class — focused, premium, distraction-free.

---

## 3. Architecture

### Content model (Payload collections — get this right first)
```
Path (Foundations | AI Engineering | Ship It)
  └─ Course (title, slug, summary, level, hero, order, status)
       └─ Module (title, summary, order)
            └─ Lesson (title, slug, order, estMinutes, isFreePreview, status)
                 └─ content: Blocks[]
                      ├─ ProseBlock   (Lexical rich text → bespoke React)
                      ├─ CodeBlock     (code, language, filename, highlight)
                      ├─ VideoBlock    (Mux playbackId, poster, captions)
                      ├─ LabBlock      (WebContainer: starter files, steps, checkpoints)
                      ├─ QuizBlock     (questions, answers)
                      └─ CalloutBlock  (type, content)
```
- `isFreePreview` on a Lesson = accessible without a subscription (free-tier teaser).
- Payload runs migrations into a **dedicated Postgres schema** (e.g. `payload`) to avoid clashing with the app's Supabase tables.

### Runtime tables (Supabase — app-managed, not Payload)
- `academy_subscriptions` — `user_id` (auth), `stripe_customer_id`, `stripe_subscription_id`, `plan` (`monthly|annual|founding`), `status` (`active|trialing|past_due|canceled`), `current_period_end`, `cancel_at_period_end`.
- `academy_progress` — `user_id`, `lesson_id` (Payload lesson id/slug), `status` (`in_progress|completed`), `completed_at`, `last_position` (video seconds), `updated_at`. Unique on (`user_id`, `lesson_id`).
- `academy_certificates` — `user_id`, `course_id`, `issued_at`, `cert_code` (shareable).

### Access gate
`hasAcademyAccess(user) = active/trialing academy_subscription` → unlocks every **published** lesson. Free-preview lessons bypass the gate. Founding = a subscription on the founding price (never re-priced).

---

## 4. Phased build

- **Phase 0 — Align & scaffold**: lock model + stack (this doc), design the Payload content schema, stand up Payload 3 against Supabase Postgres, confirm admin auth (authors = admins only, separate from learner auth).
- **Phase 1 — Billing + access**: Stripe subscriptions ($20/mo, $200/yr, founding price), `academy_subscriptions` + webhook lifecycle (created/updated/canceled/past_due), all-access gating (rework per-track), Stripe Customer Portal for self-serve management.
- **Phase 2 — Content backbone**: Payload models live, migrate existing track/lesson titles, author **one full module** end-to-end as the content reference.
- **Phase 3 — Lesson player**: bespoke premium renderer (prose / code / Mux video / callout), outline sidebar with progress, next/prev, mark-complete. The classroom becomes real.
- **Phase 4 — Progress**: `academy_progress`, mark-complete/resume, course %, "continue where you left off," upgraded `/academy/my-courses` dashboard.
- **Phase 5 — Labs**: WebContainers guided projects (starter code + checkpoints + run/preview) — the "you build it" differentiator.
- **Phase 6 — Certificates + community**: completion certificates, onboarding email drip for new subscribers, Discord deepening.
- **Phase 7 — Polish + launch**: design QA (visual regression at the premium bar), performance/CWV, analytics (completion, drop-off), founding-cohort launch.

---

## 5. Vertical slice (the first concrete build) — Definition of Done

**Goal:** ONE real lesson, fully working, end-to-end — proving the entire spine before scaling content.

1. **Billing**: Stripe monthly ($20) + annual ($200) + founding monthly prices created; subscription checkout wired; webhook writes `academy_subscriptions`; Customer Portal link works.
2. **Access**: server check — active subscription unlocks; no sub → locked + subscribe CTA; free-preview lesson opens without sub.
3. **CMS**: Payload up on Supabase Postgres; Course → Module → Lesson + blocks modeled; **one lesson authored** with prose + a code block + a Mux video (real or placeholder) + (stretch) a small lab.
4. **Player**: that lesson renders in the premium player (matches the design system), outline sidebar, mark-complete button.
5. **Progress**: `academy_progress` persists; mark-complete works; dashboard shows the lesson as completed; "continue" resumes.

**Acceptance:** a real $20 test subscription → lesson unlocks → consume it → mark complete → progress persists → `/academy/my-courses` reflects it → cancel via portal → access revokes at period end.

Once the slice is green, Phases 2/5/6 scale content + labs + certs on a proven model.

---

## 6. Open items to confirm as we go
- Mux account + API keys (video).
- StackBlitz WebContainers licensing/terms for embedded labs (check commercial use).
- Founding-cohort cutoff (first N members at the locked price?).
- Free-tier scope (how many free-preview lessons).
- Where lesson drafts are authored "elsewhere" → import path into Payload.
