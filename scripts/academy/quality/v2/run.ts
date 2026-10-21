import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import activationManifestJson from '../../../../data/academy/lab-evaluator/flagship-activation.json'
import {
  parseFlagshipActivationManifest,
  verifyActivationAttestation,
} from '../../lab-evaluator/staging/core'
import { auditAcademy } from './core'
import { writeAuditArtifacts } from './artifacts'

function loadActivation(registry: Parameters<typeof parseFlagshipActivationManifest>[1]) {
  const attestationPath = process.env.ACADEMY_LAB_STAGING_ATTESTATION_PATH
  const publicKeyPath = process.env.ACADEMY_LAB_STAGING_PUBLIC_KEY_PATH
  if (!attestationPath && !publicKeyPath) return undefined
  if (!attestationPath || !publicKeyPath) {
    throw new Error('Activation attestation and public key paths must be configured together')
  }
  // Content-only audits intentionally run with no activation evidence. When
  // evidence is supplied, parse it against the current registry and fail closed
  // on stale, malformed, or incorrectly signed activation material.
  const manifest = parseFlagshipActivationManifest(activationManifestJson, registry)
  return verifyActivationAttestation(
    JSON.parse(readFileSync(resolve(attestationPath), 'utf8')),
    readFileSync(resolve(publicKeyPath), 'utf8'),
    manifest,
  )
}

function main(): void {
  const repoRoot = process.cwd()
  const registryPath = resolve(repoRoot, 'data/academy/registry.json')
  const outputDir = resolve(repoRoot, 'docs/evidence/academy/certification-v2')
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const generatedAt = new Date().toISOString()
  const activation = loadActivation(registry)
  const report = auditAcademy({ registry, repoRoot, generatedAt, activation })
  const artifacts = writeAuditArtifacts(report, outputDir)

  console.log('Academy Certification Harness V2')
  console.log(`registry: ${report.registryVersion}`)
  console.log(`coverage: ${report.summary.coursesAudited} courses / ${report.summary.lessonsAudited} lessons`)
  console.log(`decisions: ${report.summary.coursesEligible} eligible / ${report.summary.coursesBlocked} blocked / ${report.summary.coursesNeedsRemediation} remediation / ${report.summary.coursesPendingReview} pending`)
  console.log(`certified: ${report.summary.coursesCertified}`)
  console.log(`lab trust: ${report.labTrust}`)
  console.log(`artifacts: ${artifacts.outputDir}`)
}

main()
