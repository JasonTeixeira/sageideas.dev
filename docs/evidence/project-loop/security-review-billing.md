# Billing and entitlement security review

Date: 2026-09-04
Scope: Stripe checkout and webhook processing, invoice lifecycle, recurring subscriptions, refunds, entitlement fulfillment and revocation, Discord premium roles, database authority, and Academy commerce gates.

## Decision

PASS for the safe-local `billing` checkpoint. There are no unresolved critical or high findings in the local implementation. Live Stripe, Supabase, and Discord reconciliation remains an explicit external-approval gate; this review does not claim that any hosted resource was changed or tested.

Academy certification remains `uncertified`. Lab runtime remains `untrusted_current_runtime`, and lab evidence remains `practice_only`. Paid Academy enrollment fails closed unless the Academy is explicitly certified and commerce is separately enabled.

## Threats reviewed

- Forged, replayed, concurrent, failed, or out-of-order Stripe webhook deliveries.
- A failed webhook being acknowledged as successfully processed.
- Client-controlled prices, currencies, invoice state, subscription ownership, or entitlements.
- Shared checkout sessions, duplicate customers, duplicate subscriptions, and duplicate payment receipts.
- Fractional-dollar, tax, and unit-conversion errors that undercharge an invoice.
- Partial refunds or late payment events incorrectly restoring paid state.
- Checkout completion without durable fulfillment evidence.
- Entitlement grants or revocations being reported as successful when persistence failed.
- Unauthorized subscription cancellation or invoice mutation.
- Non-transactional invoice creation, manual settlement, and dunning advancement.
- Privilege escalation through row-level-security gaps or unsafe `SECURITY DEFINER` functions.
- Sale of uncertified Academy material or promotion of untrusted labs.

## Findings and disposition

1. **Resolved — replay and failed-delivery ambiguity.** Webhooks now use a service-only database claim function that distinguishes first delivery, successful duplicate, retryable failure, and an in-progress delivery. Failed processing is persisted and returns a retryable response instead of being acknowledged as complete.
2. **Resolved — payment and refund ordering.** A database-owned payment receipt state machine records the Stripe event, preserves partial/full refund state under late events, and prevents duplicate receipts. Academy enrollment refund totals are tracked explicitly.
3. **Resolved — client and schema authority.** Checkout routes derive products, prices, invoice totals, currencies, subscription ownership, and entitlement targets from server-owned records. Invoice routes now use the canonical schema instead of divergent aliases.
4. **Resolved — unsafe checkout idempotency.** Browser clients generate a request UUID; public checkout validates and hashes it. Direct checkout no longer keys sessions by a shared IP/day bucket. Invoice sessions are reused or replaced according to durable session state.
5. **Resolved — non-atomic billing workflows.** Invoice creation with line items, dunning advancement, and manual settlement are transactional database functions. Persistence failures propagate instead of returning false success.
6. **Resolved — incomplete fulfillment evidence.** Service and care checkouts write a durable fulfillment record before best-effort lead capture. Recurring payments and refunds update the payment ledger and applicable entitlements.
7. **Resolved — duplicate recurring state.** Customer, product, and subscription creation use stable idempotency keys, and an active engagement subscription blocks duplicate creation.
8. **Resolved — entitlement failure concealment.** Academy membership and Discord premium persistence now fail closed. Discord role assignment cannot report success without configured roles.
9. **Resolved — unauthorized cancellation.** Cancellation validates the Stripe identifier and proves local subscription ownership before calling Stripe.
10. **Resolved — premature Academy commerce.** Academy paid enrollment requires both an explicit commerce flag and the canonical `certified` state. Current Academy product status remains closed.

## Proof reviewed

- `npm run test:billing`: 11/11 focused billing and entitlement contracts passed.
- `npm run test:billing:sql`: migration `0121_billing_integrity.sql` passed against disposable PostgreSQL 17, including claims, grants, atomic invoice operations, idempotent settlement/dunning, partial refunds, and refund-before-payment ordering.
- `npm run test:unit`: 334/334 tests passed.
- `npm run test:security`: 13/13 security contracts passed.
- `npm run test:data-integrity`: 8/8 contracts passed, including known-good and deliberately broken fixtures.
- `npm run audit:data-integrity`: `local_static_green`; 116 incremental migrations, 132 SQL files, 296/296 created tables with RLS, and 18 definer functions covered.
- Canonical program observer: all 13 commands passed, including typecheck, zero-warning lint, production build, desktop/mobile Lighthouse, approval-boundary audit, and diff check.
- Dependency audit: zero production and development vulnerabilities.
- Staged Gitleaks scan: approximately 117.7 KB scanned, zero findings.

## Residual limitations

Local code, contract tests, and disposable PostgreSQL prove the implementation boundary but cannot prove provider delivery semantics or hosted configuration. Applying migration 0121, exercising signed Stripe test-mode events (including concurrency and retry), reconciling hosted receipts, and verifying live Discord role behavior require explicit approval and isolated staging credentials. No checkout, refund, subscription, database, Discord, credential, or deployment mutation was performed in this checkpoint.
