# ADR 0002: Academy Packaging and Pricing

**Status:** blocked external decision
**Date:** 2026-08-27
**Decision owner:** Academy operator

## Context

Repository copy and plans currently reference incompatible models, including low-cost monthly memberships and higher-priced one-time tracks. Checkout code cannot make those business decisions authoritative, and changing live Stripe objects requires explicit approval.

## Decision required

Before Step 9 commerce hardening, approve one canonical model covering:

- product/package names;
- subscription, one-time, cohort, or hybrid structure;
- exact prices and currencies;
- free preview and trial policy;
- included courses or immutable path releases;
- cancellation, refund, grace, and past-due behavior;
- founding-beta versus public pricing; and
- the canonical Stripe account and price IDs.

Until approved:

- no repository price is treated as commercial truth;
- live Stripe objects must not be created or changed;
- pricing copy drift remains a launch blocker;
- commerce capability status remains `externally_blocked`; and
- paid enrollment must not open.

## Evidence to reconcile

- `lib/academy/plans.ts`
- `app/academy/pricing/page.tsx`
- `components/academy/course/CourseLandingFallback.tsx`
- `docs/ACADEMY_COMMERCE_ACTIVATION.md`
- `docs/academy/BUILD_PLAN.md`

## Exit criteria

The operator approves a written package matrix, price policy, and Stripe environment. Step 9 then derives all application copy and entitlement behavior from one plan configuration and verifies the complete test-mode lifecycle.
