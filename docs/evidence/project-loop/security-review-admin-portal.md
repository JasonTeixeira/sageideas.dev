# Admin Portal Security Review

- Reviewed: 2026-09-04
- Scope: `/admin`, `/academy-admin`, all `app/api/admin` routes, Academy content server actions, and status-report generation
- Result: PASS for safe local code evidence
- Unresolved critical/high local findings: none

## Threat model and controls

The privileged surfaces can expose user, customer, billing, project, and curriculum data or mutate production-facing content. The relevant threats are role-source divergence, authentication or MFA bypass, unbounded service-role input, stored active content, missing audit evidence, error-detail disclosure, retry duplication, and falsely trusted lab evidence.

The local implementation now:

- routes both admin page families through one `profiles.app_role = admin` boundary;
- requires AAL2 in production (and whenever `MFA_REQUIRED_FOR_ADMIN=true`) with a shared 30-minute idle session;
- validates course, lesson, certificate, and status-report inputs with bounded strict schemas;
- validates every authored lesson block against the Academy runtime block contract before persistence;
- emits audit-log events for Academy content, certificate, and status-report mutations;
- returns stable generic persistence errors instead of database-provider details;
- treats status-report cursor reconciliation as a non-retryable secondary operation after the immutable report is created;
- retains `uncertified`, `untrusted_current_runtime`, and `practice_only` Academy trust states.

## Deterministic proof

- `npm run test:admin`: 5 contract tests passed; source audit checked 36 privileged files with zero findings.
- Deliberately broken fixtures prove the audit rejects missing admin guards, missing mutation audit calls, role-source splits, absent MFA integration, unvalidated authoring actions, and substring-verifier copy.
- `npm run test:security`: 15 application-boundary tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero errors and zero warnings.

## Evidence not claimed

No real Supabase session, production MFA factor, hosted audit-log insert, content mutation, deployment, credential change, or external system was exercised. Those require isolated staging and explicit approval. Audit writes use the existing best-effort platform contract; hosted alerting and delivery verification remain operations work.
