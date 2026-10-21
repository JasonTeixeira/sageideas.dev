# Academy Certification Harness V2 — Verification

Date: 2026-08-27
Branch: `academy/02-certification-harness`
Base: `db6c15e456452ca8a49572010557eaccde96b166`
Registry: `sha256:6d54d95a42e89c796e7e6cd96c26107aaac298374d570bbf6888b20c66f0108a`

## Proven in this slice

- `npm run academy:audit:all` audited 32 independent course bundles and 632 lessons.
- It produced 32 course scorecards, 632 lesson scorecards, the Academy board, ranked remediation backlog, and provisional flagship-readiness report.
- The real-corpus decision board is: 19 `blocked`, 13 `needs_remediation`, 0 `pending_review`, 0 `eligible_for_certification`, and 0 certified.
- Real-corpus hard-fail findings are H1=0, H2=448, H3=0, H4=0, H5=143. The H2 total consists of 354 untrusted-current-runtime lab findings, 86 missing reference-solution findings, and 8 missing deterministic-check findings.
- All 143 H5 findings are missing checked-in narration assets referenced by the 20 `the-llm-api` lessons under `/academy/voice/the-llm-api/*.mp3`. The original dirty worktree contains 144 untracked files under that path, but untracked local files are not reproducible certification evidence and were not copied into this isolated Step 2 branch.
- Deterministic source checks found 632/632 valid runtime block schemas, 632/632 structurally valid assessment sets, valid diagram/lesson-route references, 632/632 complete canonical metadata records, and no high-confidence exact/near duplicates at the configured threshold. Local asset-reference integrity fails for the 20 `the-llm-api` lessons above.
- Pedagogy structure is failing for 450 lessons and structurally passing but awaiting expert review for 182 lessons.
- Claim-level correctness/source coverage, rendered accessibility, visual quality, UX, production-like performance, and consistency remain pending for all 632 lessons.
- 184 lessons promise remote narration/media and remain pending integrity evidence; 448 lessons correctly mark media not applicable.
- No current authored lab code was executed by the V2 command.

Zero real-corpus H1/H3/H4 findings means no defect in those classes was proven by the available offline evidence. It does not mean source correctness, remote media, or rendered accessibility is complete; those dimensions remain pending and prevent eligibility. H5 has 143 proven missing checked-in asset references and is a concrete remediation item.

## Passing commands

- `npm run academy:audit:verify` — 12/12 Harness V2 contract tests passed; registry drift check and typecheck passed.
- Harness contract suite repeated three times — `pass^3 = 100%`.
- Known-good controlled fixture — eligible but still `uncertified`.
- Known-bad fixture — H1, H2, H3, H4, and H5 all detected and non-buy-downable.
- `npm run academy:registry:verify` — 8 registry core tests, 1 application-adapter test, and drift check passed.
- `npm run typecheck` — passed against the repository's existing dependency install.
- Targeted ESLint over the V2 runner, artifact writer, core, legacy boundary, and tests — zero warnings/errors.
- `git diff --check` — passed.
- Static security scan — no user-specific absolute paths, Supabase service-role literals, or Stripe key literals in Step 2 code/evidence.

## Security review

- The default V2 command is offline and reads only the checked-in registry and repository evidence.
- Registry paths are rejected when absolute or when resolution escapes the repository root.
- Generated filenames require already-validated lowercase canonical slugs.
- The command does not load environment credentials, call Supabase/Stripe, mutate remote systems, or execute authored Python/JavaScript/SQL/shell code.
- Current lab output and reference solutions cannot contribute points, mastery, eligibility, or certification.
- Controlled lab evidence must contain exactly one passing, server-owned result for every unique lab block index; duplicate, unknown, failed, and missing results hard-fail H2.
- A declared factual claim with empty or unresolved source IDs hard-fails H1; declaring coverage complete cannot buy down an uncited claim.
- Generated evidence contains content hashes and repository-relative identifiers, not credentials or local user paths.

## Independent review closure

The independent correctness/security review found and this slice closed:

- an H1 false-eligibility path for claim records with no source IDs;
- an H2 false-eligibility path where duplicate results could stand in for multiple labs;
- an opaque missing-registered-lesson crash;
- stale generated scorecards surviving a later run; and
- omission of typecheck from the public audit verification command.

Each closure has a focused regression test in `tests/academy/certification-harness-v2.test.ts`.

## Repository-level blockers not caused by Step 2

- `npm run test:unit` still prints 16 pre-existing failures in Sprout/Discord/ops suites, including modules that exist only as untracked files in the original dirty worktree. The custom runner exits 0 despite printed failures, which is itself a verification-harness weakness. The Academy auth-aware unit assertion passes.
- `npm audit --omit=dev --audit-level=high` reports 12 existing vulnerabilities: 10 high and 2 moderate. Affected packages include `adm-zip`, `brace-expansion`, `dompurify`, `fast-uri`, `js-yaml`, `nanoid`, `next`, `postcss`, `protobufjs`, and `sharp`.
- The package manifest/lock/install drift remains. An unlocked install selects a newer Stripe type whose API date rejects `lib/stripe/client.ts`; the repository's existing install typechecks. Dependency remediation belongs in a separate reviewed slice.
- Step 1 recorded existing production-build CSS-module purity blockers. Step 2 changes no application CSS or build configuration and does not claim the production build is green.
- Live Supabase publication reconciliation remains unavailable/unverified and no database reads or writes occurred here.

## Remaining certification work

The next trust-critical slice is Step 4A: controlled lab evaluation with private checks/solutions, resource and network limits, server-owned results, negative fixtures, and mastery writes only from trusted evidence. Step 3 source governance and rendered/expert/human evidence adapters remain required before any course can become eligible. Immutable release certification remains Step 8.
