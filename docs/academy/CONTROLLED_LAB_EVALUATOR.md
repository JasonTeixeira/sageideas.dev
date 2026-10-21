# Controlled Lab Evaluator — Operator Contract

The current academy staging architecture uses the Next.js server as the trusted
orchestrator and Vercel Sandbox as the separate execution boundary. Learner code
never runs in the application function or in Supabase. A dedicated Ubuntu host
is not required for this managed path.

## Required deployment boundary

- Vercel Sandbox runs each case in an ephemeral deny-all microVM using a private,
  vulnerability-scanned image pinned by digest.
- The application sends learner source and one hidden stdin fixture into the
  sandbox as read-only files. Expected output and reference solutions never enter it.
- Supabase stores immutable private specs, active-release bindings, append-only
  evaluation receipts, and mastery events behind the service-role boundary.
- The sandbox receives no Supabase credential, evaluator signing secret,
  production database credential, cloud metadata credential, or learner-data mount.
- The application records mastery only after the signed response, reviewed
  activation attestation, active Supabase release binding, and kill switch agree.

The rootless-Docker service remains an optional self-managed deployment mode for
operators who need it. It is not part of the current Vercel/Supabase staging path.

## Environment

Managed Vercel application tier:

```text
ACADEMY_LAB_EVALUATOR_PROVIDER=vercel-sandbox
ACADEMY_LAB_EVALUATOR_SECRET=<shared random secret, at least 32 bytes>
ACADEMY_EVALUATOR_IMAGE_PYTHON=vcr.vercel.com/<project>/academy-python-sql@sha256:<digest>
ACADEMY_EVALUATOR_IMAGE_JAVASCRIPT=vcr.vercel.com/<project>/academy-javascript@sha256:<digest>
ACADEMY_EVALUATOR_IMAGE_SQL=vcr.vercel.com/<project>/academy-python-sql@sha256:<digest>
ACADEMY_LAB_MASTERY_WRITES_ENABLED=false
ACADEMY_LAB_ACTIVATION_RELEASE=flagship-labs-2026-08-27.1
ACADEMY_LAB_STAGING_ATTESTATION_PATH=/run/secrets/academy-activation.json
ACADEMY_LAB_STAGING_PUBLIC_KEY_PATH=/run/secrets/academy-activation-public.pem
NEXT_PUBLIC_SUPABASE_URL=https://<staging-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<staging-only service role key>
```

Self-managed evaluator tier (optional, not used by current staging):

```text
ACADEMY_LAB_EVALUATOR_SECRET=<same secret>
ACADEMY_EVALUATOR_PRIVATE_SPEC_ROOT=/srv/academy-evaluator/private-specs
ACADEMY_EVALUATOR_JOB_ROOT=/var/lib/academy-evaluator/jobs
ACADEMY_EVALUATOR_IMAGE_PYTHON=registry/image@sha256:<digest>
ACADEMY_EVALUATOR_IMAGE_JAVASCRIPT=registry/image@sha256:<digest>
ACADEMY_EVALUATOR_IMAGE_SQL=registry/image@sha256:<digest>
ACADEMY_EVALUATOR_HOST=127.0.0.1
ACADEMY_EVALUATOR_PORT=8787
```

The self-managed host is enforced as `127.0.0.1`, `::1`, or `localhost`;
startup rejects public bind addresses. Managed execution is selected only by the
exact `vercel-sandbox` provider value and fails closed if any image lacks a digest.
Never put the signing secret or service-role key in a `NEXT_PUBLIC_*` variable.

## Private spec format

The filename for `course-slug/lesson-slug` is `course-slug--lesson-slug.json` inside the private spec root.

```json
{
  "schemaVersion": 1,
  "labKey": "python-basics/variables",
  "language": "python",
  "specRevision": "2026-08-27.1",
  "referenceSolution": "value = int(input())\nprint(value * 2)",
  "cases": [
    { "id": "happy", "kind": "happy", "stdin": "21\n", "expectedStdout": "42\n" },
    { "id": "negative", "kind": "negative", "stdin": "-2\n", "expectedStdout": "-4\n" }
  ]
}
```

Expected output is exact. Substring matching is prohibited. At least two cases and one negative case are mandatory.

## Build and run

Build runtime images with digest-pinned base images, publish them to the private registry, scan them, then configure their resulting digests. The Dockerfiles deliberately require `BASE_IMAGE` so an operator cannot silently build from a floating tag.

```bash
docker build --build-arg BASE_IMAGE=alpine@sha256:<digest> \
  -f services/academy-lab-evaluator/runtimes/python-sql/Dockerfile.vercel-sandbox \
  -t registry/academy-python-sql:<release> \
  services/academy-lab-evaluator/runtimes/python-sql

docker build --build-arg BASE_IMAGE=alpine@sha256:<digest> \
  -f services/academy-lab-evaluator/runtimes/javascript/Dockerfile.vercel-sandbox \
  -t registry/academy-javascript:<release> \
  services/academy-lab-evaluator/runtimes/javascript

docker push registry/academy-python-sql:<release>
docker push registry/academy-javascript:<release>
```

Managed evaluator startup fails if the provider, signing secret, or any digest-pinned
image is missing. The optional self-managed service retains its rootless-Docker preflight.

## Activation gates

Do not change the academy-wide `labTrust` state or enable mastery writes in production until:

1. migrations `0116` through `0120` are applied in order and their RLS/execute grants are verified;
2. the application and evaluator share a rotated production secret;
3. the exact managed Vercel project and digest-pinned images are bound by the reviewed activation attestation;
4. timeout, output bomb, fork bomb, filesystem write, network access, signature tamper, replay, and hidden-case failure probes all fail as designed;
5. at least one flagship lab has a reviewed private pack and a reconciled live receipt;
6. each receipt is reconciled to the active Supabase release, spec digest, runtime image, evaluator version, and policy hash;
7. monitoring covers latency, 429s, resource-limit terminations, spec failures, and evidence-persistence errors.

Until then, the UI deliberately reports practice-only and no new `lab_verified` event can be written through the application.

## Step 4B readiness command

The first candidate is deliberately limited to five labs spanning Python, JavaScript, and SQL. Keep its private directory outside the checkout, owned by the evaluator operator, mode `0700`, and never place it in deployment artifacts.

```bash
ACADEMY_EVALUATOR_PRIVATE_SPEC_ROOT=/absolute/private/flagship-labs-2026-08-27.1 \
  npm run academy:lab-evaluator:staging-verify
```

The command writes a redacted report to `docs/evidence/academy/step-4b/`. It exits successfully when it can produce an honest readiness board; add `-- --require-ready` in a release gate to return a non-zero status while any gate is blocked. A report is ready only when the managed Vercel project binding, exact release kill switch, and unexpired signed activation attestation all agree. The public key path is only a location: its SPKI SHA-256 fingerprint must match the reviewed manifest, so a caller cannot supply a self-signed trust root. The managed project ID and live `NEXT_PUBLIC_SUPABASE_URL` origin must also hash to the manifest pins. Environment strings alone cannot assert migration, monitoring, isolation, adversarial-probe, or receipt proof.

The initial candidate manifest deliberately uses `unprovisioned` authority pins. Generate and protect the signer key, provision the staging Supabase project, then update the public signer, managed-project, and database-origin digests through review. Do not enable mastery writes while any authority pin remains unprovisioned.

Certification Harness V2 reads the same attestation and public key paths. If neither is configured, every lab stays untrusted. If only one path is configured or the signature/release/registry/policy does not match, the audit fails closed.

## Policy upgrades

The application trust check and migration intentionally pin the evaluator version and the SHA-256 hash of its resource-limit policy. Changing `EVALUATOR_LIMITS` or `EVALUATOR_VERSION` requires a reviewed release that updates the application and adds a new migration/allowlist entry. A service running stale or unknown policy remains practice-only and cannot write mastery evidence.

Migrations 0117, 0119, and 0120 advance the policy pin. Migration 0120 also
requires the active release, private-spec digest, and runtime image on every
receipt. If a database contains legacy or unknown-policy receipts, it deliberately
fails so an operator can investigate before retrying; do not bypass the constraint.
