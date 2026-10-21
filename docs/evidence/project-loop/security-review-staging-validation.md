# Security Review — Staging Validation

- Date: 2026-09-05
- Scope: immutable Vercel Preview targeting, hosted HTTP/browser evidence, isolated alias rollback/restore, aggregate production-readiness classification
- Result: PASS for the local harness implementation; hosted database, controlled-lab, human-review, and production boundaries remain closed

## Threat model

The relevant threats are accidental production targeting, deployment/commit substitution, bypass-secret leakage, unbounded or attacker-selected probes, external browser requests, fabricated pass labels, incomplete browser suites, false rollback restoration, hidden-test disclosure, and Academy/lab trust promotion without evidence.

## Controls verified

- HTTP and browser execution accept only immutable HTTPS Preview hostnames for the isolated `sageideas-academy-staging` project.
- HTTP proof validates the provider deployment ID, project, READY state, non-production target, immutable URL, full Git SHA, and branch before sending a request.
- Hosted probes are a fixed allowlist of 22 route/method/status contracts; arbitrary URLs, methods, and payloads are not accepted.
- The Vercel protection bypass is scoped to the exact approved origin or the single drill alias, is never serialized, and is removed from Vercel subprocess environments.
- Browser proof disables traces and video, blocks cross-host requests, and persists only normalized static test titles, status, and duration.
- Security-header and public access-protection contracts fail closed.
- The rollback tool can mutate only `sageideas-academy-staging-drill.vercel.app`, validates both deployments as READY non-production staging Previews, checks provider alias bindings at all three transitions, and restores the baseline in a `finally` path.
- The readiness audit rejects incomplete pass labels, deployment identity disagreement, incomplete rollback proof, fabricated lab readiness, and any Academy/lab trust promotion.
- Known-broken fixtures exercise each fail-closed path.

## Verification evidence

- `npm run project:program:observe`: 24/24 commands passed; production and development dependency audits found 0 vulnerabilities.
- `npm run test:staging:contracts`: 15/15 tests passed.
- `npm run typecheck`: passed.
- `npm run lint -- --quiet`: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: passed.

## Residual boundaries

No production deployment, production alias, production database, customer communication, paid action, credential change, Academy certification, or lab-trust promotion is authorized by this review. Hosted migrations, database recovery, authenticated integrations, controlled lab execution/receipts, assistive-technology review, expert curriculum review, learner beta, and production deployment remain separate evidence or approval gates.
