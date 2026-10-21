# Communications and Jobs Security Review

- Reviewed: 2026-09-04
- Scope: canonical email delivery, Resend webhooks, Academy nurture cron, direct provider call sites, Discord durable jobs, and migration `0122`
- Result: PASS for safe local code and disposable-database evidence
- Unresolved critical/high local findings: none

## Threat model and controls

Communications process personal data and create externally visible side effects. The relevant threats are duplicate delivery, false success or queue claims, retry storms, permanent poison messages, webhook forgery/replay/races, oversized payload denial of service, swallowed persistence failures, header injection, and unapproved Discord publishing.

The local implementation now:

- validates recipient, sender, reply-to, subject, body, header, attachment, and metadata bounds before provider calls;
- derives content-bound idempotency keys and supplies them to every direct Resend email delivery path;
- records one logical email attempt ledger keyed by idempotency, with bounded exponential backoff and a three-attempt/non-retryable dead-letter transition;
- stops calling missing provider configuration a durable queue and prevents failed/queued attempts from suppressing later Academy sequence delivery;
- counts nurture delivery only when the canonical sender confirms success;
- caps email webhook bodies at 1 MB, verifies the existing signed timestamp boundary, and atomically leases each provider event before processing;
- fails provider events for retry when persistence fails and acknowledges only completed duplicates;
- retains Discord approval gates plus its existing registry, idempotency, retry, dead-letter, privacy, and observability contracts;
- keeps all live publishing, provider delivery, database migration application, and credentials outside safe-local execution.

## Deterministic proof

- `npm run test:communications`: 4 communication contracts passed, the source audit reported zero findings, and three Discord readiness validators passed.
- Deliberately broken fixtures prove detection of false queues, missing idempotency, unbounded retry, bad sequence dedup, absent webhook replay/body controls, direct unsafe provider calls, and incomplete delivery schema.
- `npm run test:communications:sql`: migration `0122` passed against disposable PostgreSQL 17, including unique delivery keys, retry/dead-letter indexes, active webhook leases, and processed-event deduplication.
- `npm run test:data-integrity`: 117 ordered migrations, 133 schema files, and 297/297 created tables with RLS passed the immutable chain contract.
- `npm run test:unit`: 334 passed, 0 failed.
- `npm run test:security`: 15 passed, 0 failed.
- `npm run typecheck` and `npm run lint`: passed.

## Evidence not claimed

Migration `0122` was not applied to a hosted Supabase project. No Resend email, signed live webhook, Discord post, scheduled hosted job, credential change, deployment, or other external mutation was performed. Provider behavior, hosted alert delivery, and real dead-letter operations remain staging/operating proof.
