import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  CRITICAL_JOURNEYS,
  auditCriticalJourneys,
} from '../../lib/journeys/contract'

const root = process.cwd()
const evidenceDirectory = path.join(root, 'docs/evidence/project-loop')
const outputPath = path.join(evidenceDirectory, 'critical-user-journeys-audit.json')

async function optionalJson(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

async function main() {
  const audit = auditCriticalJourneys(CRITICAL_JOURNEYS)
  const observations = await optionalJson(path.join(evidenceDirectory, 'observations-latest.json'))
  const commands = Array.isArray(observations?.commands)
    ? observations.commands as Array<{ id?: string; ok?: boolean; exitCode?: number }>
    : []
  const proofFor = (id: string) => {
    const observation = commands.find((command) => command.id === id)
    return observation
      ? { status: observation.ok ? 'pass' : 'fail', exitCode: observation.exitCode ?? null }
      : { status: 'pending', exitCode: null }
  }
  const contractProof = proofFor('critical-journey-contract')
  const browserProof = proofFor('critical-journey-browser')
  const localProofGreen = audit.ok
    && contractProof.status === 'pass'
    && browserProof.status === 'pass'

  const registryVersion = `sha256:${createHash('sha256')
    .update(JSON.stringify(CRITICAL_JOURNEYS))
    .digest('hex')}`
  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    registryVersion,
    status: localProofGreen ? 'local_journey_green' : 'proof_pending_or_failed',
    counts: {
      journeys: CRITICAL_JOURNEYS.length,
      steps: CRITICAL_JOURNEYS.reduce((total, journey) => total + journey.steps.length, 0),
      findings: audit.findings.length,
    },
    journeys: CRITICAL_JOURNEYS,
    findings: audit.findings,
    proof: {
      contract: contractProof,
      browser: browserProof,
      observationsGeneratedAt: observations?.generatedAt ?? null,
    },
    trust: {
      academyCertification: 'uncertified',
      labTrust: 'untrusted_current_runtime',
      labEvidence: 'practice_only',
      checkoutConfirmationAuthority: 'server_owned_fulfillment_receipt',
    },
    externalEvidencePending: [
      'Email confirmation delivery and callback reconciliation in isolated staging.',
      'Signed Stripe test-mode checkout and webhook reconciliation in isolated staging.',
      'Authenticated portal journey proof against seeded isolated staging tenants.',
      'No signup, checkout, email, payment, database, or deployment mutation is claimed by local browser proof.',
    ],
  }

  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(`Wrote ${path.relative(root, outputPath)} (${evidence.status})`)
  if (!audit.ok) process.exitCode = 1
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
