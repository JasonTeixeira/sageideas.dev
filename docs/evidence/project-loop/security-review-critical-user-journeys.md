# Critical user journeys security review

Date: 2026-09-04
Scope: marketing-to-signup, Studio and Academy registration, email verification, callback origin handling, self-serve and portal checkout entry, payment-return messaging, account gating, browser-test isolation, and failure recovery.

## Decision

PASS for the safe-local `critical-user-journeys` implementation checkpoint. There are no unresolved critical or high findings in the local implementation. Email delivery, hosted authentication, signed Stripe checkout/webhook reconciliation, and authenticated portal journeys remain explicit staging approval gates; this review does not claim they occurred.

Academy certification remains `uncertified`. Lab runtime remains `untrusted_current_runtime`, lab evidence remains `practice_only`, and Academy paid enrollment remains fail-closed.

## Threats reviewed

- Passwords or other credentials leaking through URLs, history, referrers, logs, or hidden query state.
- Public server actions using the Supabase service role to bypass email ownership verification.
- Signup/referral rewards being granted before identity verification.
- Host-header injection into authentication, invite, and payment callback URLs.
- URL parameters being treated as proof that a payment succeeded.
- GET requests, crawlers, or link previews creating Stripe checkout sessions.
- Dead care-plan links and checkout cancellation/error paths with no recovery.
- Client-controlled catalog price, recurrence, return URL, or idempotency state.
- Accidental E2E execution against production or live payment creation during a routine test.
- Private account content becoming accessible when auth configuration is missing.
- Provider errors or internal details being reflected into public callback URLs.

## Findings and disposition

1. **Resolved — password disclosure in Studio signup.** The three-step wizard previously transported the password through GET query strings and back links. One client-side form now preserves state in memory and submits credentials only in the final server-action POST.
2. **Resolved — privileged public Academy signup.** The public action no longer uses `admin.createUser` or `email_confirm: true`. It now uses Supabase's public signup and email-confirmation path.
3. **Resolved — pre-verification referral credit.** Academy referral attribution moved to the verified auth callback and the referral cookie is cleared only after successful attribution.
4. **Resolved — untrusted callback origins.** Auth, admin invite, invoice checkout, and portal catalog checkout use one canonical origin policy. Production ignores request-controlled host headers and accepts only HTTPS configured origins.
5. **Resolved — forged payment success.** The public return page no longer treats `slug` or `session_id` as payment evidence. It displays confirmation and fires completion analytics only when the server finds a matching webhook-owned fulfillment receipt; pending, invalid, partial-refund, and refund states are distinct.
6. **Resolved — mutation on GET.** `/checkout/[slug]` is now a review page requiring an explicit button action. Crawlers and link previews cannot create Stripe sessions. The page supports both one-time service and recurring care products and redirects consultation-only offers safely.
7. **Resolved — portal checkout dead ends and coarse idempotency.** Portal catalog forms use a request-scoped UUID, the server binds it to verified user and allowlisted price state, Stripe failures are handled, and success/cancel URLs now return to `/portal/billing` and `/portal/catalog`.
8. **Resolved — unsafe test defaults.** Legacy E2E defaults to loopback and refuses remote targets without explicit approval. Payment-producing tests additionally require `RUN_LIVE_CHECKOUT=1`. The canonical browser proof blanks integration credentials, blocks non-loopback requests, and never submits an external mutation.
9. **Resolved — reflected provider detail.** Authentication callback failures now log server-side detail and return a generic user-safe message.
10. **Verified — missing-auth fail closure.** The isolated browser suite proves `/portal` returns 503 and no private content when Supabase authentication is unavailable.

## Proof reviewed

- `npm run test:critical-journeys`: 11/11 contracts passed, including known-good and deliberately broken journey fixtures.
- `npm run test:critical-journeys:e2e`: 6/6 loopback-only Chromium journeys passed from a fresh production build with external requests blocked and integration credentials blanked.
- `npm run test:security`: 15/15 application-security contracts passed.
- `npm run test:unit`: 334/334 repository tests passed.
- `npm run test:billing`: 11/11 billing contracts passed.
- `npm run test:billing:sql`: disposable PostgreSQL 17 billing integration passed.
- `npm run test:data-integrity`: 8/8 data-integrity contracts passed.
- Canonical Program Loop observer: all 15 commands passed; typecheck, zero-warning lint, production build, desktop/mobile Lighthouse, approval-boundary audit, and diff check were GREEN.
- Dependency audits: zero production and development vulnerabilities.
- `critical-user-journeys-audit.json`: 7 journeys, 12 steps, zero structural findings, local browser and contract proof GREEN.
- Staged Gitleaks scan: approximately 124.2 KB scanned, zero findings.

## Residual limitations

Local proof cannot verify email-provider delivery, Supabase confirmation cookies, hosted tenant data, Stripe's signed delivery behavior, or Discord/provider configuration. Those require isolated staging credentials, migration 0121 applied to staging, and explicit approval. The legacy credential-backed E2E suites remain classified as approval-bound. No signup, email, checkout, payment, refund, database, credential, deployment, or other external mutation was performed in this checkpoint.
