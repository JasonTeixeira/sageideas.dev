# Academy Step 4B — Local Verification

Date: 2026-08-27

## Proven locally

- One candidate release selects five canonical labs spanning Python, JavaScript, and SQL.
- The public manifest contains identities, revisions, digests, and reviewed authority pins only; private cases, expected outputs, and reference solutions remain outside the repository.
- The private pack is mode `0700`, its files are mode `0600`, and all five specs match the public digests.
- The five private reference solutions passed 23 local smoke cases. This confirms pack coherence but is not claimed as controlled-runtime proof.
- Public starters now consume variable input, and the SQL runner replaces the public practice fixture with private setup data.
- Only candidate labs can reach the mastery path. Exact private-spec revision, a fresh signed activation attestation, the manifest-pinned signer, evaluator origin, database origin, release switch, and passing evaluator response must all agree before persistence.
- Attestations bind the registry, release, evaluator version/policy, runtime image digests, environment identity, evaluator/database origins, migrations 0116/0117, probe results, and reconciled receipt IDs. They expire within 24 hours.
- Certification Harness V2 promotes only explicitly attested lab keys. Every other lab remains `untrusted_current_runtime`.
- Private-root ancestry is resolved physically; the validator detects parent symlinks, leaf symlinks, inode/device changes, directory swaps, and unexpected pack contents.
- Private ingress requires HTTPS, the reviewed origin digest, and DNS results that are all literal private/loopback addresses.

## Verification results

| Gate | Result |
| --- | --- |
| `npm run academy:lab-evaluator:verify` | PASS — 39/39 tests, registry current, TypeScript clean |
| `npm run academy:audit:verify` | PASS — 14/14 tests, registry current, TypeScript clean |
| Node test coverage | PASS — 95.56% lines, 81.76% branches, 94.29% functions |
| Targeted ESLint | PASS — zero findings |
| `python3 -m py_compile .../run_sql.py` | PASS |
| Private pack smoke | PASS — 5 specs / 23 cases |
| `gitleaks git` over the Step 4B commit range | PASS — no leaks |
| Independent security review | PASS after remediation — no remaining findings |
| `npm run academy:lab-evaluator:staging-verify` | HONEST BLOCK — manifest and private pack pass; nine live gates remain blocked |

## Deliberately blocked

The public signer fingerprint, evaluator-origin digest, and database-origin digest are `unprovisioned`. This is an intentional reviewed trust state, not a placeholder that can be bypassed with environment variables. Mastery writes remain disabled.

No external infrastructure was mutated. In particular:

- no signing credential was generated or changed;
- no runtime image was built, published, or scanned;
- no rootless staging evaluator or private ingress was provisioned;
- migrations 0116/0117 were not applied to a remote database;
- no live adversarial probe or learner receipt was claimed;
- no monitoring or alerts were configured.

The available Docker daemon is not rootless, so controlled execution correctly remains blocked. `npm run build` also stops on the worktree's ignored external `node_modules` symlink before compilation. `npm audit --omit=dev --audit-level=high` reports the repository's existing 12 dependency advisories (10 high, 2 moderate).

The Academy board therefore remains honest: 32 courses, 632 lessons, 354 labs, zero certified courses, and academy-wide `untrusted_current_runtime`.
