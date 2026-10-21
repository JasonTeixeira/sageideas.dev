import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'

import flagshipActivation from '@/data/academy/lab-evaluator/flagship-activation.json'
import registry from '@/data/academy/registry.json'
import {
  parseFlagshipActivationManifest,
  verifyActivationAttestation,
} from '@/scripts/academy/lab-evaluator/staging/core'

const RELEASE_ID_RE = /^[a-z0-9][a-z0-9._-]{2,95}$/

export const FLAGSHIP_ACTIVATION_RELEASE_ID = flagshipActivation.releaseId

const FLAGSHIP_LABS = new Map(flagshipActivation.labs.map((lab) => [lab.labKey, lab]))

/** Only labs in the immutable public candidate manifest may reach staging. */
export function isFlagshipLabCandidate(courseSlug: string, lessonSlug: string): boolean {
  return FLAGSHIP_LABS.has(`${courseSlug}/${lessonSlug}`)
}

export function flagshipLabSpecRevision(courseSlug: string, lessonSlug: string): string | null {
  return FLAGSHIP_LABS.get(`${courseSlug}/${lessonSlug}`)?.specRevision ?? null
}

export function flagshipLabSpecDigest(courseSlug: string, lessonSlug: string): string | null {
  return FLAGSHIP_LABS.get(`${courseSlug}/${lessonSlug}`)?.specDigest ?? null
}

function identityDigest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

/**
 * Runtime authority check. The caller chooses file locations, but cannot choose
 * the signer or deployment: those hashes are pinned in the reviewed manifest.
 */
export function activationAttestationAllowsMastery(
  env: Record<string, string | undefined>,
  courseSlug: string,
  lessonSlug: string,
  runtimeImage: string,
): boolean {
  const attestationPath = env.ACADEMY_LAB_STAGING_ATTESTATION_PATH
  const publicKeyPath = env.ACADEMY_LAB_STAGING_PUBLIC_KEY_PATH
  if (!attestationPath || !publicKeyPath || !isAbsolute(attestationPath) || !isAbsolute(publicKeyPath)) return false
  try {
    const manifest = parseFlagshipActivationManifest(flagshipActivation, registry)
    const lab = FLAGSHIP_LABS.get(`${courseSlug}/${lessonSlug}`)
    if (!lab) return false
    if (env.ACADEMY_LAB_EVALUATOR_PROVIDER !== 'vercel-sandbox') return false
    const projectId = env.VERCEL_PROJECT_ID?.trim() ?? ''
    if (!projectId || identityDigest(projectId) !== manifest.authority.managedProjectIdSha256) return false
    const databaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    if (identityDigest(databaseUrl.origin) !== manifest.authority.databaseOriginSha256) return false
    const envelope = JSON.parse(readFileSync(attestationPath, 'utf8'))
    const verified = verifyActivationAttestation(
      envelope,
      readFileSync(publicKeyPath, 'utf8'),
      manifest,
    )
    return verified.trustedLabKeys.has(`${courseSlug}/${lessonSlug}`) &&
      envelope.payload.runtimeImages[lab.language] === runtimeImage
  } catch {
    return false
  }
}

/**
 * Mastery persistence is a two-part, fail-closed operator switch. Both values
 * must match exactly; unset, malformed, or case-varied values remain disabled.
 */
export function masteryPersistenceEnabled(
  env: Record<string, string | undefined>,
  expectedReleaseId: string,
): boolean {
  if (!RELEASE_ID_RE.test(expectedReleaseId)) return false
  return env.ACADEMY_LAB_MASTERY_WRITES_ENABLED === 'true' &&
    env.ACADEMY_LAB_ACTIVATION_RELEASE === expectedReleaseId
}
