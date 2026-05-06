# Test Accounts (Phase 0 Seed)

Deterministic test fixtures created by `scripts/seed-test-data.ts` and consumed by Playwright E2E + RLS suites.

> **Scope:** these accounts live in the same Supabase project as production. They are intentionally tagged so they can be wiped any time via `tests/db/cleanup.ts`. Do **not** rename or remove the `+test`/`+admin`/`+pending` markers in the email — cleanup matches on those.

## Credentials

| Role             | Email                              | Password             | App role  | Approval status |
|------------------|------------------------------------|----------------------|-----------|-----------------|
| Admin            | `sage+admin@sageideas.org`         | `Test!Admin#2026`    | `admin`   | `approved`      |
| Client (primary) | `client1+test@sageideas.org`       | `Test!Client#2026`   | `client`  | `approved`      |
| Client (member)  | `client2+test@sageideas.org`       | `Test!Client#2026`   | `client`  | `approved`      |
| Pending user     | `pending+test@sageideas.org`       | `Test!Pending#2026`  | `pending` | `pending`       |

The admin email pattern (`+admin@sageideas.org`) hits the auto-promote rule in `lib/auth/roles.ts` so the `app_role` will land on `admin` even on a fresh boot.

## Seeded fixtures

After running `npm run seed:test-data` you should see:

- 1 organization — **Acme Test Co** (slug `acme-test-co`)
- 2 memberships — `client1+test@` (owner) + `client2+test@` (member)
- 2 engagements — `Acme — Brand Refresh (Discovery)` and `Acme — Website Redesign (Active)`
- 4 documents — 2 signed + 2 unsigned across the two engagements
- 2 invoices — `INV-TEST-001` (paid, $10,500) + `INV-TEST-002` (open, $10,500), with line items + a recorded payment
- 5 calendar events on the active engagement (kickoff → retro)
- 3 deliverables in mixed statuses
- 1 thread + 2 messages between admin and client1

## Tagging conventions (for cleanup)

Cleanup walks down from these markers, no schema changes required:

- `profiles.email` ends with one of `+admin@sageideas.org`, `+test@sageideas.org`, `+pending@sageideas.org`
- `organizations.slug = 'acme-test-co'` and `organizations.notes = 'TEST_RUN_ID:phase-0-seed'`
- `engagements.tags @> ARRAY['test_run_id:phase-0-seed']`
- `invoices.number` matches `INV-TEST-%`
- `payments.stripe_payment_intent_id` starts with `pi_test_INV-TEST-`

## Running

```bash
# Required env (copy from `vercel env pull` or your local .env.local)
export NEXT_PUBLIC_SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...

npm run seed:test-data    # idempotent — safe to run repeatedly
npm run test:cleanup      # removes everything seeded above
```

## Playwright integration

E2E tests grab a session for any of these accounts via the helper at `tests/fixtures/auth.ts`. The fixture mints a session through the Supabase Admin API instead of round-tripping through OAuth, so tests stay fast and deterministic.

## Rotating passwords

Edit the `ACCOUNTS` block in `scripts/seed-test-data.ts`, re-run `npm run seed:test-data`, and update this doc. The seed script calls `auth.admin.updateUserById` so password rotation is just a re-run.
