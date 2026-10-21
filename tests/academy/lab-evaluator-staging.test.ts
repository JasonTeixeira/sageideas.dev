import assert from 'node:assert/strict'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'

import { evaluatorPolicyHash, EVALUATOR_VERSION } from '../../lib/academy/lab-evaluator/contract'
import {
  activationAttestationAllowsMastery,
  flagshipLabSpecRevision,
  masteryPersistenceEnabled,
} from '../../lib/academy/lab-evaluator/activation'
import * as stagingCore from '../../scripts/academy/lab-evaluator/staging/core'

const {
  REQUIRED_ADVERSARIAL_PROBES,
  buildStagingProbePlan,
  evaluateStagingReadiness,
  isPrivateNetworkAddress,
  parseFlagshipActivationManifest,
  publicKeyFingerprint,
  resolvePrivateSpecRoot,
  signActivationAttestation,
  validatePrivateSpecRoot,
  verifyActivationAttestation,
} = stagingCore

const {
  privateSpecDigest,
  validatePrivatePack,
} = stagingCore as unknown as {
  privateSpecDigest: (spec: unknown) => string
  validatePrivatePack: (
    activationManifest: ReturnType<typeof manifest>,
    root: string,
  ) => Promise<{ specs: Map<string, unknown> }>
}

const REGISTRY_VERSION = `sha256:${'a'.repeat(64)}`
const RELEASE_ID = 'flagship-labs-2026-08-27.1'
const LABS = [
  ['programming-fundamentals/input-validation', 'python'],
  ['programming-fundamentals/functions-basics', 'python'],
  ['the-llm-api/token-cost-model', 'javascript'],
  ['the-llm-api/function-tool-calling', 'javascript'],
  ['career-databases_data_modeling/query-design-joins', 'sql'],
] as const

function identityDigest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

const registry = {
  registryVersion: REGISTRY_VERSION,
  courses: [
    {
      slug: 'programming-fundamentals',
      lessons: [
        { slug: 'input-validation', labBlocks: 1 },
        { slug: 'functions-basics', labBlocks: 1 },
      ],
    },
    {
      slug: 'the-llm-api',
      lessons: [
        { slug: 'token-cost-model', labBlocks: 1 },
        { slug: 'function-tool-calling', labBlocks: 1 },
      ],
    },
    {
      slug: 'career-databases_data_modeling',
      lessons: [{ slug: 'query-design-joins', labBlocks: 1 }],
    },
  ],
}

function manifest(authority: Partial<{
  signerPublicKeySha256: string
  managedProjectIdSha256: string
  databaseOriginSha256: string
}> = {}) {
  return {
    schemaVersion: 1 as const,
    releaseId: RELEASE_ID,
    registryVersion: REGISTRY_VERSION,
    status: 'candidate' as const,
    authority: {
      signerPublicKeySha256: 'a'.repeat(64),
      environmentId: 'sageideas-academy-staging',
      managedProjectIdSha256: 'b'.repeat(64),
      databaseOriginSha256: 'c'.repeat(64),
      ...authority,
    },
    labs: LABS.map(([labKey, language], index) => ({
      labKey,
      blockIndex: 7,
      language,
      specRevision: `2026-08-27.${index + 1}`,
      specDigest: String(index + 1).repeat(64),
    })),
  }
}

function attestationPayload(targetManifest = manifest()) {
  return {
    schemaVersion: 1 as const,
    releaseId: RELEASE_ID,
    registryVersion: REGISTRY_VERSION,
    evaluatorVersion: EVALUATOR_VERSION,
    policyHash: evaluatorPolicyHash(),
    issuedAt: '2026-08-27T21:00:00.000Z',
    expiresAt: '2026-08-28T21:00:00.000Z',
    runtimeImages: {
      python: `registry.example/sage-python@sha256:${'1'.repeat(64)}`,
      javascript: `registry.example/sage-js@sha256:${'2'.repeat(64)}`,
      sql: `registry.example/sage-sql@sha256:${'3'.repeat(64)}`,
    },
    environment: {
      environmentId: targetManifest.authority.environmentId,
      managedProjectIdSha256: targetManifest.authority.managedProjectIdSha256,
      databaseOriginSha256: targetManifest.authority.databaseOriginSha256,
      isolatedRuntime: 'passed' as const,
      migrations: ['0116', '0117', '0118', '0119', '0120'] as const,
      managedRuntimeBinding: 'passed' as const,
      monitoring: 'passed' as const,
      masteryWriteKillSwitch: 'passed' as const,
    },
    labs: manifest().labs.map((lab, index) => ({
      labKey: lab.labKey,
      blockIndex: lab.blockIndex,
      specRevision: lab.specRevision,
      specDigest: lab.specDigest,
      evaluationId: `018f47a2-4b8d-7f31-8c5a-1ccf64d58b2${index}`,
      receiptEvaluationId: `018f47a2-4b8d-7f31-8c5a-1ccf64d58b2${index}`,
      receiptId: `018f47a2-4b8d-7f31-8c5a-1ccf64d58b3${index}`,
      submissionDigest: String(index + 4).repeat(64),
      probes: Object.fromEntries([
        ['correct_reference', 'passed'],
        ...REQUIRED_ADVERSARIAL_PROBES.map((probe: string) => [probe, 'blocked']),
      ]),
    })),
  }
}

describe('academy Step 4B staging activation contract', () => {
  it('selects 3-5 canonical flagship labs spanning Python, JavaScript, and SQL without private material', () => {
    const parsed = parseFlagshipActivationManifest(manifest(), registry)
    assert.equal(parsed.labs.length, 5)
    assert.deepEqual(new Set(parsed.labs.map((lab: { language: string }) => lab.language)), new Set(['python', 'javascript', 'sql']))

    assert.throws(
      () => parseFlagshipActivationManifest({
        ...manifest(),
        labs: [{ ...manifest().labs[0], referenceSolution: 'print("secret")' }, ...manifest().labs.slice(1)],
      }, registry),
      /private|unexpected/i,
    )
    assert.throws(
      () => parseFlagshipActivationManifest({ ...manifest(), registryVersion: `sha256:${'b'.repeat(64)}` }, registry),
      /registry version/i,
    )
  })

  it('requires private specs to live outside the repository and rejects symlinked roots', () => {
    const repoRoot = '/srv/sageideas'
    assert.equal(validatePrivateSpecRoot(repoRoot, '/srv/private/academy-labs', { isDirectory: true, isSymbolicLink: false }), '/srv/private/academy-labs')
    assert.throws(
      () => validatePrivateSpecRoot(repoRoot, '/srv/sageideas/private-specs', { isDirectory: true, isSymbolicLink: false }),
      /outside/i,
    )
    assert.throws(
      () => validatePrivateSpecRoot(repoRoot, '/srv/private/academy-labs', { isDirectory: true, isSymbolicLink: true }),
      /symbolic link/i,
    )
  })

  it('resolves the full private-root ancestry before enforcing repository containment', async () => {
    const root = mkdtempSync(join(tmpdir(), 'academy-private-root-ancestry-'))
    try {
      const repo = join(root, 'repo')
      const nested = join(repo, 'hidden-specs')
      mkdirSync(nested, { recursive: true })
      symlinkSync(repo, join(root, 'repo-alias'))
      await assert.rejects(
        () => resolvePrivateSpecRoot(repo, join(root, 'repo-alias', 'hidden-specs')),
        /outside/i,
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('validates every private spec against its manifest revision and content digest', async () => {
    const root = mkdtempSync(join(tmpdir(), 'academy-flagship-private-pack-'))
    try {
      const specs = LABS.map(([labKey, language], index) => ({
        schemaVersion: 1 as const,
        labKey,
        language,
        specRevision: `2026-08-27.${index + 1}`,
        referenceSolution: language === 'python' ? 'print(input())' : language === 'javascript' ? 'console.log(require("fs").readFileSync(0,"utf8"))' : 'SELECT 42 AS answer;',
        cases: [
          { id: 'happy', kind: 'happy' as const, stdin: '42\n', expectedStdout: language === 'sql' ? 'answer\n42\n' : '42\n' },
          { id: 'negative', kind: 'negative' as const, stdin: '-1\n', expectedStdout: language === 'sql' ? 'answer\n42\n' : '-1\n' },
        ],
      }))
      for (const spec of specs) {
        writeFileSync(join(root, `${spec.labKey.replace('/', '--')}.json`), JSON.stringify(spec))
      }
      const packManifest = {
        ...manifest(),
        labs: manifest().labs.map((lab, index) => ({ ...lab, specDigest: privateSpecDigest(specs[index]) })),
      }
      assert.equal((await validatePrivatePack(packManifest, root)).specs.size, 5)

      writeFileSync(join(root, 'programming-fundamentals--input-validation.json'), JSON.stringify({
        ...specs[0],
        specRevision: 'tampered',
      }))
      await assert.rejects(() => validatePrivatePack(packManifest, root), /digest|revision/i)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('defines a complete adversarial plan and fails readiness closed on any missing proof gate', () => {
    const plan = buildStagingProbePlan()
    assert.deepEqual(plan.map((probe: { id: string }) => probe.id), ['correct_reference', ...REQUIRED_ADVERSARIAL_PROBES])
    assert.equal(new Set(plan.map((probe: { id: string }) => probe.id)).size, plan.length)

    const allPassed = Object.fromEntries([
      'manifest_valid', 'private_pack_valid', 'isolated_runtime', 'digest_pinned_images',
      'migrations_applied', 'managed_runtime_binding', 'reference_solutions_passed',
      'adversarial_probes_passed', 'receipts_reconciled', 'monitoring_ready', 'kill_switch_ready',
    ].map((gate) => [gate, true]))
    assert.deepEqual(evaluateStagingReadiness(allPassed), { status: 'ready', blockedGates: [] })
    assert.deepEqual(evaluateStagingReadiness({ ...allPassed, isolated_runtime: false }), {
      status: 'blocked',
      blockedGates: ['isolated_runtime'],
    })
  })

  it('recognizes only literal private network addresses, never a trusted-looking hostname suffix', () => {
    assert.equal(isPrivateNetworkAddress('10.2.3.4'), true)
    assert.equal(isPrivateNetworkAddress('172.31.1.2'), true)
    assert.equal(isPrivateNetworkAddress('192.168.1.5'), true)
    assert.equal(isPrivateNetworkAddress('fd00::1'), true)
    assert.equal(isPrivateNetworkAddress('8.8.8.8'), false)
    assert.equal(isPrivateNetworkAddress('anything.internal'), false)
  })

  it('promotes only an Ed25519-attested, policy-pinned, receipt-reconciled activation release', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const trustedManifest = manifest({ signerPublicKeySha256: publicKeyFingerprint(publicKey) })
    const envelope = signActivationAttestation(attestationPayload(trustedManifest), privateKey)
    const verified = verifyActivationAttestation(envelope, publicKey, trustedManifest, {
      now: Date.parse('2026-08-28T01:00:00.000Z'),
    })
    assert.deepEqual([...verified.trustedLabKeys].sort(), LABS.map(([labKey]) => labKey).sort())
    assert.equal(verified.evidenceByLesson.get('the-llm-api/token-cost-model')?.lab?.results?.[0]?.status, 'pass')

    assert.throws(
      () => verifyActivationAttestation({
        ...envelope,
        payload: { ...envelope.payload, policyHash: 'f'.repeat(64) },
      }, publicKey, trustedManifest, { now: Date.parse('2026-08-28T01:00:00.000Z') }),
      /signature|policy/i,
    )
    const mismatchedReceipt = {
      ...attestationPayload(trustedManifest),
      labs: attestationPayload(trustedManifest).labs.map((lab, index) => index === 0
        ? { ...lab, receiptEvaluationId: '018f47a2-4b8d-7f31-8c5a-1ccf64d58b99' }
        : lab),
    }
    assert.throws(
      () => verifyActivationAttestation(signActivationAttestation(mismatchedReceipt, privateKey), publicKey, trustedManifest, {
        now: Date.parse('2026-08-28T01:00:00.000Z'),
      }),
      /receipt/i,
    )
    assert.throws(
      () => verifyActivationAttestation(envelope, publicKey, {
        ...trustedManifest,
        authority: { ...trustedManifest.authority, signerPublicKeySha256: 'unprovisioned' as const },
      }, { now: Date.parse('2026-08-28T01:00:00.000Z') }),
      /unprovisioned|signer/i,
    )
    const wrongEnvironment = {
      ...attestationPayload(trustedManifest),
      environment: {
        ...attestationPayload(trustedManifest).environment,
        managedProjectIdSha256: 'd'.repeat(64),
      },
    }
    assert.throws(
      () => verifyActivationAttestation(signActivationAttestation(wrongEnvironment, privateKey), publicKey, trustedManifest, {
        now: Date.parse('2026-08-28T01:00:00.000Z'),
      }),
      /environment|managed project/i,
    )
    assert.throws(
      () => verifyActivationAttestation(envelope, publicKey, trustedManifest, {
        now: Date.parse('2026-08-29T01:00:00.000Z'),
      }),
      /expired/i,
    )
  })

  it('keeps mastery writes disabled unless both the release and explicit kill switch match', () => {
    assert.equal(masteryPersistenceEnabled({}, RELEASE_ID), false)
    assert.equal(masteryPersistenceEnabled({ ACADEMY_LAB_MASTERY_WRITES_ENABLED: 'true' }, RELEASE_ID), false)
    assert.equal(masteryPersistenceEnabled({
      ACADEMY_LAB_MASTERY_WRITES_ENABLED: 'true',
      ACADEMY_LAB_ACTIVATION_RELEASE: RELEASE_ID,
    }, RELEASE_ID), true)
    assert.equal(masteryPersistenceEnabled({
      ACADEMY_LAB_MASTERY_WRITES_ENABLED: 'TRUE',
      ACADEMY_LAB_ACTIVATION_RELEASE: RELEASE_ID,
    }, RELEASE_ID), false)
  })

  it('requires the managed Vercel project pin before runtime mastery can activate', () => {
    const root = mkdtempSync(join(tmpdir(), 'academy-unpinned-activation-'))
    try {
      const { privateKey, publicKey } = generateKeyPairSync('ed25519')
      const trustedManifest = manifest({
        signerPublicKeySha256: publicKeyFingerprint(publicKey),
        managedProjectIdSha256: 'unprovisioned' as const,
      })
      writeFileSync(join(root, 'public.pem'), publicKey.export({ type: 'spki', format: 'pem' }))
      writeFileSync(join(root, 'attestation.json'), JSON.stringify(
        signActivationAttestation(attestationPayload(trustedManifest), privateKey),
      ))
      assert.equal(flagshipLabSpecRevision('programming-fundamentals', 'input-validation'), '2026-08-27.1')
      assert.equal(activationAttestationAllowsMastery({
        ACADEMY_LAB_STAGING_ATTESTATION_PATH: join(root, 'attestation.json'),
        ACADEMY_LAB_STAGING_PUBLIC_KEY_PATH: join(root, 'public.pem'),
        ACADEMY_LAB_EVALUATOR_PROVIDER: 'vercel-sandbox',
        VERCEL_PROJECT_ID: 'prj_SBmFLCJVJLo7SyDx1wIjkrkc4exe',
        NEXT_PUBLIC_SUPABASE_URL: 'https://fake-project.supabase.co',
      }, 'programming-fundamentals', 'input-validation', attestationPayload(trustedManifest).runtimeImages.python), false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('feeds private SQL fixtures over stdin while stripping the public practice fixture', () => {
    const dir = mkdtempSync(join(tmpdir(), 'academy-sql-private-fixture-'))
    const sourcePath = join(dir, 'submission.sql')
    try {
      writeFileSync(sourcePath, [
        '-- academy-public-fixture:start',
        'CREATE TABLE values_to_sum (value INTEGER);',
        'INSERT INTO values_to_sum VALUES (999);',
        '-- academy-public-fixture:end',
        'SELECT SUM(value) AS total FROM values_to_sum;',
      ].join('\n'))
      const result = spawnSync('python3', [
        resolve('services/academy-lab-evaluator/runtimes/python-sql/run_sql.py'),
        sourcePath,
      ], {
        input: 'CREATE TABLE values_to_sum (value INTEGER); INSERT INTO values_to_sum VALUES (7), (8);',
        encoding: 'utf8',
      })
      assert.equal(result.status, 0, result.stderr)
      assert.equal(result.stdout, 'total\n15\n')
      assert.equal(result.stdout.includes('999'), false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('publishes one staging verification command and a public manifest with no private solutions', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    assert.match(packageJson.scripts['academy:lab-evaluator:staging-verify'], /staging\/verify\.ts/)
    assert.equal(existsSync('data/academy/lab-evaluator/flagship-activation.json'), true)
    const publicManifest = readFileSync('data/academy/lab-evaluator/flagship-activation.json', 'utf8')
    assert.equal(publicManifest.includes('referenceSolution'), false)
    assert.equal(publicManifest.includes('expectedStdout'), false)
  })

  it('pins the public activation candidate to the canonical registry and current lab blocks', () => {
    const canonicalRegistry = JSON.parse(readFileSync('data/academy/registry.json', 'utf8'))
    const publicManifest = JSON.parse(readFileSync('data/academy/lab-evaluator/flagship-activation.json', 'utf8'))
    const parsed = parseFlagshipActivationManifest(publicManifest, canonicalRegistry)
    const normalizedLanguage: Record<string, string> = { js: 'javascript', javascript: 'javascript', python: 'python', sql: 'sql' }

    for (const lab of parsed.labs) {
      const [courseSlug, lessonSlug] = lab.labKey.split('/')
      const lessons = JSON.parse(readFileSync(`data/academy/authoring/${courseSlug}.lessons.json`, 'utf8'))
      const block = lessons[lessonSlug]?.[lab.blockIndex]
      assert.equal(block?.type, 'lab', `${lab.labKey} block ${lab.blockIndex} must remain the selected lab`)
      assert.equal(normalizedLanguage[block?.language], lab.language, `${lab.labKey} language must remain pinned`)
    }
  })

  it('accepts a managed Vercel Sandbox attestation shape without any evaluator URL pin', () => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const projectId = 'prj_SBmFLCJVJLo7SyDx1wIjkrkc4exe'
    const trustedManifest = manifest({
      signerPublicKeySha256: publicKeyFingerprint(publicKey),
      managedProjectIdSha256: identityDigest(projectId),
      databaseOriginSha256: identityDigest('https://sageideas-academy-staging.supabase.co'),
    })
    const verified = verifyActivationAttestation(
      signActivationAttestation(attestationPayload(trustedManifest), privateKey),
      publicKey,
      trustedManifest,
      { now: Date.parse('2026-08-28T01:00:00.000Z') },
    )
    assert.equal(verified.trustedLabKeys.has('programming-fundamentals/input-validation'), true)
  })
})
