import {
  createHash,
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
  verify,
  type KeyLike,
} from 'node:crypto'
import { constants } from 'node:fs'
import { lstat, open, readdir, realpath } from 'node:fs/promises'
import { isIP } from 'node:net'
import { dirname, isAbsolute, resolve, sep } from 'node:path'

import {
  EVALUATOR_VERSION,
  evaluatorPolicyHash,
  privateSpecDigest,
  validatePrivateSpec,
  type LabLanguage,
  type PrivateLabSpec,
} from '../../../../lib/academy/lab-evaluator/contract'

const SHA256_RE = /^[0-9a-f]{64}$/
const REGISTRY_VERSION_RE = /^sha256:[0-9a-f]{64}$/
const RELEASE_ID_RE = /^[a-z0-9][a-z0-9._-]{2,95}$/
const REVISION_RE = /^[a-zA-Z0-9._-]{1,64}$/
const LAB_KEY_RE = /^[a-z0-9][a-z0-9_-]{1,95}\/[a-z0-9][a-z0-9_-]{1,95}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PINNED_IMAGE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._/:@-]*@sha256:[0-9a-f]{64}$/
const UNPROVISIONED = 'unprovisioned'
const MAX_ATTESTATION_LIFETIME_MS = 24 * 60 * 60 * 1_000
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000

export const REQUIRED_ADVERSARIAL_PROBES = Object.freeze([
  'incorrect_submission',
  'substring_cheat',
  'timeout',
  'output_bomb',
  'memory_bomb',
  'fork_bomb',
  'filesystem_write',
  'network_access',
  'signature_tamper',
  'replay',
  'hidden_test_disclosure',
] as const)

export const STAGING_READINESS_GATES = Object.freeze([
  'manifest_valid',
  'private_pack_valid',
  'isolated_runtime',
  'digest_pinned_images',
  'migrations_applied',
  'managed_runtime_binding',
  'reference_solutions_passed',
  'adversarial_probes_passed',
  'receipts_reconciled',
  'monitoring_ready',
  'kill_switch_ready',
] as const)

export function isPrivateNetworkAddress(address: string): boolean {
  const normalized = address.toLowerCase()
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split('.').map(Number)
    return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)
  }
  return isIP(normalized) === 6 && (normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd'))
}

type RegistryInput = {
  registryVersion: string
  courses: Array<{
    slug: string
    lessons: Array<{ slug: string; labBlocks?: number }>
  }>
}

export type FlagshipActivationLab = {
  labKey: string
  blockIndex: number
  language: LabLanguage
  specRevision: string
  specDigest: string
}

export type FlagshipActivationManifest = {
  schemaVersion: 1
  releaseId: string
  registryVersion: string
  status: 'candidate'
  authority: {
    signerPublicKeySha256: string
    environmentId: string
    managedProjectIdSha256: string
    databaseOriginSha256: string
  }
  labs: FlagshipActivationLab[]
}

export type ProbeId = 'correct_reference' | typeof REQUIRED_ADVERSARIAL_PROBES[number]

export type ActivationAttestationPayload = {
  schemaVersion: 1
  releaseId: string
  registryVersion: string
  evaluatorVersion: string
  policyHash: string
  issuedAt: string
  expiresAt: string
  runtimeImages: Record<LabLanguage, string>
  environment: {
    environmentId: string
    managedProjectIdSha256: string
    databaseOriginSha256: string
    isolatedRuntime: 'passed'
    migrations: readonly ['0116', '0117', '0118', '0119', '0120']
    managedRuntimeBinding: 'passed'
    monitoring: 'passed'
    masteryWriteKillSwitch: 'passed'
  }
  labs: Array<Pick<FlagshipActivationLab, 'labKey' | 'blockIndex' | 'specRevision' | 'specDigest'> & {
    evaluationId: string
    receiptEvaluationId: string
    receiptId: string
    submissionDigest: string
    probes: Record<string, unknown>
  }>
}

export type SignedActivationAttestation = {
  payload: ActivationAttestationPayload
  signature: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} has unexpected or private fields`)
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function parseActivationLab(value: unknown): FlagshipActivationLab {
  if (!isRecord(value)) throw new Error('activation lab must be an object')
  exactKeys(value, ['labKey', 'blockIndex', 'language', 'specRevision', 'specDigest'], 'activation lab')
  if (typeof value.labKey !== 'string' || !LAB_KEY_RE.test(value.labKey)) throw new Error('invalid activation lab key')
  if (!Number.isSafeInteger(value.blockIndex) || (value.blockIndex as number) < 0) throw new Error('invalid activation block index')
  if (!['python', 'javascript', 'sql'].includes(String(value.language))) throw new Error('invalid activation language')
  if (typeof value.specRevision !== 'string' || !REVISION_RE.test(value.specRevision)) throw new Error('invalid spec revision')
  if (typeof value.specDigest !== 'string' || !SHA256_RE.test(value.specDigest)) throw new Error('invalid spec digest')
  return value as FlagshipActivationLab
}

export function parseFlagshipActivationManifest(
  value: unknown,
  registry: RegistryInput,
): FlagshipActivationManifest {
  if (!isRecord(value)) throw new Error('activation manifest must be an object')
  exactKeys(value, ['schemaVersion', 'releaseId', 'registryVersion', 'status', 'authority', 'labs'], 'activation manifest')
  if (value.schemaVersion !== 1) throw new Error('unsupported activation manifest schema')
  if (typeof value.releaseId !== 'string' || !RELEASE_ID_RE.test(value.releaseId)) throw new Error('invalid activation release id')
  if (
    typeof value.registryVersion !== 'string' ||
    !REGISTRY_VERSION_RE.test(value.registryVersion) ||
    value.registryVersion !== registry.registryVersion
  ) {
    throw new Error('activation registry version mismatch')
  }
  if (value.status !== 'candidate') throw new Error('activation manifest must remain candidate until attested')
  if (!isRecord(value.authority)) throw new Error('activation authority must be an object')
  exactKeys(value.authority, [
    'signerPublicKeySha256', 'environmentId', 'managedProjectIdSha256', 'databaseOriginSha256',
  ], 'activation authority')
  const authorityPin = (pin: unknown, label: string) => {
    if (typeof pin !== 'string' || (pin !== UNPROVISIONED && !SHA256_RE.test(pin))) {
      throw new Error(`invalid activation ${label}`)
    }
  }
  authorityPin(value.authority.signerPublicKeySha256, 'signer pin')
  authorityPin(value.authority.managedProjectIdSha256, 'managed project pin')
  authorityPin(value.authority.databaseOriginSha256, 'database origin pin')
  if (typeof value.authority.environmentId !== 'string' || !RELEASE_ID_RE.test(value.authority.environmentId)) {
    throw new Error('invalid activation environment id')
  }
  if (!Array.isArray(value.labs) || value.labs.length < 3 || value.labs.length > 5) {
    throw new Error('activation manifest requires 3-5 labs')
  }
  const labs = value.labs.map(parseActivationLab)
  if (new Set(labs.map((lab) => lab.labKey)).size !== labs.length) throw new Error('activation labs must be unique')
  if (new Set(labs.map((lab) => lab.language)).size !== 3) throw new Error('activation labs must span Python, JavaScript, and SQL')

  const registryLabs = new Set(
    registry.courses.flatMap((course) => course.lessons
      .filter((lesson) => (lesson.labBlocks ?? 0) > 0)
      .map((lesson) => `${course.slug}/${lesson.slug}`)),
  )
  for (const lab of labs) if (!registryLabs.has(lab.labKey)) throw new Error(`activation lab is not canonical: ${lab.labKey}`)
  return { ...(value as Omit<FlagshipActivationManifest, 'labs'>), labs }
}

export function validatePrivateSpecRoot(
  repoRoot: string,
  privateSpecRoot: string,
  info: { isDirectory: boolean; isSymbolicLink: boolean },
): string {
  if (!isAbsolute(repoRoot) || !isAbsolute(privateSpecRoot)) throw new Error('private spec roots must be absolute')
  const repo = resolve(repoRoot)
  const root = resolve(privateSpecRoot)
  if (root === repo || root.startsWith(`${repo}${sep}`)) throw new Error('private spec root must live outside the repository')
  if (!info.isDirectory) throw new Error('private spec root must be a directory')
  if (info.isSymbolicLink) throw new Error('private spec root must not be a symbolic link')
  return root
}

export async function resolvePrivateSpecRoot(repoRoot: string, privateSpecRoot: string): Promise<string> {
  if (!isAbsolute(repoRoot) || !isAbsolute(privateSpecRoot)) throw new Error('private spec roots must be absolute')
  const [physicalRepo, physicalRoot] = await Promise.all([realpath(repoRoot), realpath(privateSpecRoot)])
  const info = await lstat(physicalRoot)
  return validatePrivateSpecRoot(physicalRepo, physicalRoot, {
    isDirectory: info.isDirectory(),
    isSymbolicLink: info.isSymbolicLink(),
  })
}

export { privateSpecDigest }

export async function validatePrivatePack(
  manifest: FlagshipActivationManifest,
  privateSpecRoot: string,
): Promise<{ specs: Map<string, PrivateLabSpec> }> {
  const rootInfo = await lstat(privateSpecRoot)
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error('private pack root must be a real directory')
  const physicalRoot = await realpath(privateSpecRoot)
  const physicalRootInfo = await lstat(physicalRoot)
  const expectedFiles = new Set(manifest.labs.map((lab) => `${lab.labKey.replace('/', '--')}.json`))
  const actualFiles = await readdir(physicalRoot)
  if (actualFiles.length !== expectedFiles.size || actualFiles.some((name) => !expectedFiles.has(name))) {
    throw new Error('private pack contains missing or unexpected spec files')
  }

  const specs = new Map<string, PrivateLabSpec>()
  for (const lab of manifest.labs) {
    const filename = `${lab.labKey.replace('/', '--')}.json`
    const path = resolve(physicalRoot, filename)
    const beforeOpen = await realpath(path)
    if (dirname(beforeOpen) !== physicalRoot) throw new Error(`private spec escapes pack root: ${lab.labKey}`)
    const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    let spec: PrivateLabSpec
    try {
      const info = await handle.stat()
      if (!info.isFile()) throw new Error(`private spec must be a real file: ${lab.labKey}`)
      const [afterOpen, rootAfterOpen, rootPathInfo, pathInfo] = await Promise.all([
        realpath(path),
        realpath(physicalRoot),
        lstat(physicalRoot),
        lstat(path),
      ])
      if (
        afterOpen !== beforeOpen ||
        rootAfterOpen !== physicalRoot ||
        rootPathInfo.dev !== physicalRootInfo.dev ||
        rootPathInfo.ino !== physicalRootInfo.ino ||
        pathInfo.isSymbolicLink() ||
        pathInfo.dev !== info.dev ||
        pathInfo.ino !== info.ino
      ) throw new Error(`private spec changed during validation: ${lab.labKey}`)
      spec = validatePrivateSpec(JSON.parse(await handle.readFile('utf8')))
    } finally {
      await handle.close()
    }
    if (spec.labKey !== lab.labKey || spec.language !== lab.language) throw new Error(`private spec identity mismatch: ${lab.labKey}`)
    if (spec.specRevision !== lab.specRevision) throw new Error(`private spec revision mismatch: ${lab.labKey}`)
    if (privateSpecDigest(spec) !== lab.specDigest) throw new Error(`private spec digest mismatch: ${lab.labKey}`)
    specs.set(lab.labKey, spec)
  }
  const finalFiles = await readdir(physicalRoot)
  if (finalFiles.length !== actualFiles.length || finalFiles.some((name) => !expectedFiles.has(name))) {
    throw new Error('private pack changed during validation')
  }
  return { specs }
}

export function buildStagingProbePlan(): Array<{ id: ProbeId; expected: 'passed' | 'blocked' }> {
  return [
    { id: 'correct_reference', expected: 'passed' },
    ...REQUIRED_ADVERSARIAL_PROBES.map((id) => ({ id, expected: 'blocked' as const })),
  ]
}

export function evaluateStagingReadiness(
  gates: Record<string, boolean>,
): { status: 'ready' | 'blocked'; blockedGates: string[] } {
  const blockedGates = STAGING_READINESS_GATES.filter((gate) => gates[gate] !== true)
  return { status: blockedGates.length ? 'blocked' : 'ready', blockedGates }
}

function normalizePrivateKey(key: KeyLike) {
  return typeof key === 'string' || Buffer.isBuffer(key) ? createPrivateKey(key) : key
}

function normalizePublicKey(key: KeyLike) {
  if (key instanceof KeyObject && key.type === 'public') return key
  return createPublicKey(key)
}

export function publicKeyFingerprint(key: KeyLike): string {
  const der = normalizePublicKey(key).export({ type: 'spki', format: 'der' })
  return createHash('sha256').update(der).digest('hex')
}

export function signActivationAttestation(
  payload: ActivationAttestationPayload,
  privateKey: KeyLike,
): SignedActivationAttestation {
  const signature = sign(null, Buffer.from(stableStringify(payload)), normalizePrivateKey(privateKey)).toString('base64')
  return { payload, signature }
}

function assertAttestationPayload(
  payload: ActivationAttestationPayload,
  manifest: FlagshipActivationManifest,
  now: number,
): void {
  if (!isRecord(payload)) throw new Error('activation attestation payload must be an object')
  exactKeys(payload, [
    'schemaVersion', 'releaseId', 'registryVersion', 'evaluatorVersion', 'policyHash',
    'issuedAt', 'expiresAt', 'runtimeImages', 'environment', 'labs',
  ], 'activation attestation payload')
  if (payload.schemaVersion !== 1) throw new Error('unsupported activation attestation schema')
  if (payload.releaseId !== manifest.releaseId) throw new Error('activation release mismatch')
  if (payload.registryVersion !== manifest.registryVersion) throw new Error('activation registry version mismatch')
  if (payload.evaluatorVersion !== EVALUATOR_VERSION) throw new Error('activation evaluator version mismatch')
  if (payload.policyHash !== evaluatorPolicyHash()) throw new Error('activation policy mismatch')
  const issuedAt = Date.parse(payload.issuedAt)
  const expiresAt = Date.parse(payload.expiresAt)
  if (!Number.isFinite(issuedAt)) throw new Error('invalid activation issuedAt')
  if (!Number.isFinite(expiresAt) || expiresAt <= issuedAt || expiresAt - issuedAt > MAX_ATTESTATION_LIFETIME_MS) {
    throw new Error('invalid activation expiresAt')
  }
  if (issuedAt > now + MAX_CLOCK_SKEW_MS) throw new Error('activation attestation is not yet valid')
  if (expiresAt < now) throw new Error('activation attestation expired')
  if (!isRecord(payload.runtimeImages)) throw new Error('activation runtime images must be an object')
  exactKeys(payload.runtimeImages, ['python', 'javascript', 'sql'], 'activation runtime images')
  for (const image of Object.values(payload.runtimeImages)) {
    if (typeof image !== 'string' || !PINNED_IMAGE_RE.test(image)) throw new Error('activation runtime image must be digest-pinned')
  }
  if (!isRecord(payload.environment)) throw new Error('activation environment proof must be an object')
  exactKeys(payload.environment, [
    'environmentId', 'managedProjectIdSha256', 'databaseOriginSha256',
    'isolatedRuntime', 'migrations', 'managedRuntimeBinding', 'monitoring', 'masteryWriteKillSwitch',
  ], 'activation environment proof')
  if (payload.environment.environmentId !== manifest.authority.environmentId) throw new Error('activation environment id mismatch')
  if (
    manifest.authority.managedProjectIdSha256 === UNPROVISIONED ||
    payload.environment.managedProjectIdSha256 !== manifest.authority.managedProjectIdSha256
  ) throw new Error('activation managed project pin is unprovisioned or mismatched')
  if (
    manifest.authority.databaseOriginSha256 === UNPROVISIONED ||
    payload.environment.databaseOriginSha256 !== manifest.authority.databaseOriginSha256
  ) throw new Error('activation database origin is unprovisioned or mismatched')
  if (payload.environment.isolatedRuntime !== 'passed') throw new Error('activation isolated runtime proof failed')
  if (
    !Array.isArray(payload.environment.migrations) ||
    payload.environment.migrations.length !== 5 ||
    payload.environment.migrations[0] !== '0116' ||
    payload.environment.migrations[1] !== '0117' ||
    payload.environment.migrations[2] !== '0118' ||
    payload.environment.migrations[3] !== '0119' ||
    payload.environment.migrations[4] !== '0120'
  ) throw new Error('activation migration proof is incomplete')
  if (payload.environment.managedRuntimeBinding !== 'passed') throw new Error('activation managed runtime binding proof failed')
  if (payload.environment.monitoring !== 'passed') throw new Error('activation monitoring proof failed')
  if (payload.environment.masteryWriteKillSwitch !== 'passed') throw new Error('activation mastery kill-switch proof failed')
  if (!Array.isArray(payload.labs) || payload.labs.length !== manifest.labs.length) throw new Error('activation lab proof coverage mismatch')

  const manifestByKey = new Map(manifest.labs.map((lab) => [lab.labKey, lab]))
  const observed = new Set<string>()
  for (const lab of payload.labs) {
    if (!isRecord(lab)) throw new Error('activation lab proof must be an object')
    exactKeys(lab, [
      'labKey', 'blockIndex', 'specRevision', 'specDigest', 'evaluationId',
      'receiptEvaluationId', 'receiptId', 'submissionDigest', 'probes',
    ], 'activation lab proof')
    const expected = typeof lab.labKey === 'string' ? manifestByKey.get(lab.labKey) : undefined
    if (!expected || observed.has(expected.labKey)) throw new Error('activation includes unknown or duplicate lab proof')
    observed.add(expected.labKey)
    if (lab.blockIndex !== expected.blockIndex || lab.specRevision !== expected.specRevision || lab.specDigest !== expected.specDigest) {
      throw new Error('activation lab proof does not match manifest')
    }
    if (typeof lab.evaluationId !== 'string' || !UUID_RE.test(lab.evaluationId)) throw new Error('invalid activation evaluation id')
    if (lab.receiptEvaluationId !== lab.evaluationId) throw new Error('activation receipt does not reconcile to evaluation')
    if (typeof lab.receiptId !== 'string' || !UUID_RE.test(lab.receiptId)) throw new Error('invalid activation receipt id')
    if (typeof lab.submissionDigest !== 'string' || !SHA256_RE.test(lab.submissionDigest)) throw new Error('invalid activation submission digest')
    if (!isRecord(lab.probes)) throw new Error('activation probes must be an object')
    exactKeys(lab.probes, ['correct_reference', ...REQUIRED_ADVERSARIAL_PROBES], 'activation probes')
    if (lab.probes.correct_reference !== 'passed') throw new Error('activation reference solution did not pass')
    for (const probe of REQUIRED_ADVERSARIAL_PROBES) {
      if (lab.probes[probe] !== 'blocked') throw new Error(`activation adversarial probe did not block: ${probe}`)
    }
  }
}

export function verifyActivationAttestation(
  envelope: SignedActivationAttestation,
  publicKey: KeyLike,
  manifest: FlagshipActivationManifest,
  options: { now?: number } = {},
): {
  trustedLabKeys: ReadonlySet<string>
  evidenceByLesson: ReadonlyMap<string, { lab: { trust: 'controlled_evaluator'; results: Array<{ blockIndex: number; status: 'pass' }> } }>
} {
  if (!isRecord(envelope) || typeof envelope.signature !== 'string' || !isRecord(envelope.payload)) {
    throw new Error('invalid activation attestation envelope')
  }
  if (
    manifest.authority.signerPublicKeySha256 === UNPROVISIONED ||
    publicKeyFingerprint(publicKey) !== manifest.authority.signerPublicKeySha256
  ) throw new Error('activation signer is unprovisioned or does not match the pinned authority')
  const authentic = verify(
    null,
    Buffer.from(stableStringify(envelope.payload)),
    normalizePublicKey(publicKey),
    Buffer.from(envelope.signature, 'base64'),
  )
  if (!authentic) throw new Error('invalid activation attestation signature')
  assertAttestationPayload(envelope.payload as ActivationAttestationPayload, manifest, options.now ?? Date.now())
  const trustedLabKeys = new Set(envelope.payload.labs.map((lab) => lab.labKey))
  const evidenceByLesson = new Map(envelope.payload.labs.map((lab) => [lab.labKey, {
    lab: {
      trust: 'controlled_evaluator' as const,
      results: [{ blockIndex: lab.blockIndex, status: 'pass' as const }],
    },
  }]))
  return { trustedLabKeys, evidenceByLesson }
}
