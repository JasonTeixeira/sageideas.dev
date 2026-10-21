# Auth and application security review — checkpoint 3

Date: 2026-09-04

Scope: authentication, authorization, admin/portal isolation, webhook replay, public service-role endpoints, security headers, and production MFA defaults.

Local source checkpoint: `61cdbbba293fc141fb007e57426ba41bb00b91f5`

## Decision

`PASS_LOCAL` — no unresolved critical or high finding remains in this local workstream. This is not staging or production proof. It does not certify Academy content or elevate lab trust.

## Findings remediated

| Severity | Finding | Resolution |
|---|---|---|
| High | Portal admin privilege could be inferred from a hard-coded email allowlist. | Admin privilege now derives only from `profiles.app_role` and every admin API route uses `requireAdminApi`. |
| High | Production admin MFA covered `/admin` pages but not the `/api/admin` boundary. | AAL2 is mandatory in production middleware, the canonical admin API guard, and privileged portal context. |
| High | MFA accepted a protocol-relative post-auth destination. | All sign-in, callback, and MFA return paths use one tested same-origin redirect policy. |
| High | A captured valid Supabase auth email hook could be replayed indefinitely. | The signed Unix timestamp must be no older than five minutes and no more than sixty seconds in the future. Supabase identifies this header as Unix seconds in its [Auth Hooks documentation](https://supabase.com/docs/guides/auth/auth-hooks). |
| Medium | Internal SLO data was public. | `/api/telemetry/slo` now requires the canonical admin/AAL2 guard. |
| Medium | Public waitlist and telemetry ingestion could make unbounded service-role writes. | Shared rate-limit controls now precede parsing and persistence; payload schemas remain bounded. |
| Medium | Portal health exposed database and environment detail. | The public response is reduced to `ok` and `ts`, with a generic 503 failure. |
| Medium | CSP and admin MFA depended on opt-in production environment flags. | Both controls now fail closed by default whenever `NODE_ENV=production`. |
| Low | Missing auth configuration produced framework 500 responses on guarded APIs. | The canonical admin guard returns a deterministic 503 without disclosing secrets. |

## Deterministic proof

- Security contracts: 13 passed, 0 failed.
- Admin API inventory: 32/32 routes use the canonical admin guard.
- Private portal API inventory: 22/22 routes derive a server-verified user.
- Cron inventory: 15/15 routes enforce `CRON_SECRET` or delegate to a guarded handler.
- Repository unit suite: 334 passed, 0 failed.
- TypeScript, zero-warning ESLint, production build, desktop Lighthouse, mobile Lighthouse, approval-boundary checks, and diff checks: passed in `observations-latest.json`.
- Dependency audit: 0 vulnerabilities in production and development graphs.
- Staged secret scan: gitleaks 8.30.1, 0 leaks.
- Local production-server probes: enforced `Content-Security-Policy`; `/api/telemetry/slo` and `/api/admin/settings` return explicit 503 responses when auth configuration is absent.

## Approval-bound follow-up

- Enroll and test every production admin with a real AAL2 factor.
- Configure and verify the shared Upstash rate-limit store; local fallback is per-instance only.
- Exercise valid, stale, future-skewed, and tampered Supabase hook deliveries against staging.
- Run authenticated admin/portal browser and RLS isolation suites against a staging Supabase project.
- Review CSP violation telemetry in staging before tightening `unsafe-inline` directives.

Until those live checks are approved and executed, this evidence means only that the local implementation and deterministic contracts are GREEN.
