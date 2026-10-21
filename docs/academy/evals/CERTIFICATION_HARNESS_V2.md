# Academy Certification Harness V2 — Eval Contract

Status: active implementation contract for Step 2.

## Capability evals

1. `npm run academy:audit:all` audits exactly the 32 canonical registry courses as independent bundles.
2. Every lesson and course scorecard carries the canonical registry version and Harness V2 tool version.
3. The harness evaluates structure, pedagogy, assessments, sources, labs, accessibility, media, references, metadata, duplication, visual review, UX review, performance, and consistency.
4. Deterministic checks, supplied evidence, and human/expert judgments remain distinct in every artifact.
5. H1 unsupported claims, H2 failed or untrusted labs, H3 missing promised media, H4 serious/critical accessibility violations, and H5 dead references are non-buy-downable.
6. Required pending dimensions and `lab_trust=untrusted_current_runtime` prevent certification eligibility.
7. One run writes per-lesson scorecards, per-course scorecards, an Academy quality board, a ranked remediation backlog, and a provisional flagship-path readiness report.

## Regression evals

1. Registry generation and drift tests remain green.
2. The authoring content audit remains a component; it does not publish a competing certification board.
3. A deliberately good controlled fixture is eligible.
4. A deliberately broken fixture surfaces H1–H5 and is blocked regardless of other passing checks.
5. Re-running unchanged content produces identical semantic output after timestamps and run IDs are removed.

## Release criteria

- Capability tests: 100% pass at `pass@1`.
- Regression tests: `pass^3 = 100%` for fixture and determinism tests.
- No real course is labeled certified by this step.
- No network, production database, or current authored-lab execution is required by the default command.
