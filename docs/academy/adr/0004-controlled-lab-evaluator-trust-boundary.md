# ADR 0004: Controlled lab evaluator trust boundary

- Status: Superseded for staging by ADR 0005
- Date: 2026-08-27
- Scope: Academy lab execution and mastery evidence

## Context

The previous lab flow executed learner code in the browser and sent stdout to a server action. The server granted `lab_verified` when that learner-controlled string contained an authored substring. Moving the comparison to a server action hid the expected string but did not make the execution or output trustworthy.

Arbitrary learner code must also be treated as hostile. Executing it inside the Next.js process would put application secrets, learner data, and the production network in the same failure domain.

## Decision

The original implementation used a separately deployed, rootless-Docker evaluator
with a private spec store. ADR 0005 preserves this trust boundary while replacing
the self-managed host in staging with Vercel Sandbox and Supabase-managed private
specs and receipts. The self-managed design below remains a supported fallback,
not a staging requirement.

Each execution uses an ephemeral, digest-pinned container with:

- no network;
- a read-only root filesystem and read-only source mount;
- a non-root UID;
- all Linux capabilities dropped and `no-new-privileges`;
- wall-clock, CPU, memory, PID, file, writable-tmpfs, and output limits;
- no application environment or secrets;
- forced cleanup after timeout or output overflow.

The evaluator returns only aggregate counts, resource usage, version identifiers, and a verdict. Expected outputs, hidden inputs, private cases, and reference solutions never enter the browser, the Next.js response, or mastery evidence.

The application verifies the response signature and exact request ID, lab key, and submission digest. A branded in-process receipt then becomes the only input accepted by the atomic `record_trusted_academy_lab_result` database function. That function stores an append-only evaluation receipt and writes `lab_verified` plus the lab artifact event in one transaction. Generic evidence writes reject `lab_verified`.

## Certification policy

The infrastructure existing does not make current labs trusted. A lab remains `untrusted_current_runtime` until all of the following are proven for its immutable release:

1. A private spec and reference solution exist.
2. The reference solution passes at least two hidden cases, including a negative case, in the controlled evaluator.
3. The evaluator service, runtime image digests, policy hash, spec revision, and database migration are deployed.
4. A signed live receipt is reconciled to the evidence ledger.

Therefore the current 354 labs remain practice-only and cannot produce new mastery evidence until their private packs are authored and the runtime is deployed.

## Alternatives rejected

- Browser execution plus server-side substring comparison: learner controls the claimed output.
- `node:vm`, child processes, or language runtimes inside Next.js: same host, secrets, filesystem, and network failure domain.
- Sending hidden tests to the sandbox container: learner code could read them.
- Trusting a boolean from an evaluator endpoint: not bound to the source digest and replayable.
- Making Docker privileged or exposing the Docker socket to learner containers: host compromise risk.

## Rollback

Unset the evaluator URL/secret in the application or stop the service. The UI fails closed to `practice_only`; no mastery event is written. Existing append-only receipts remain auditable.
