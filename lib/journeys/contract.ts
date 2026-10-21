export type JourneyProof = 'browser' | 'contract' | 'database' | 'none'
export type JourneyMutation = 'none' | 'local' | 'external'

export type JourneyStep = {
  id: string
  route: string
  next?: string
  recovery?: string
  proof: JourneyProof
  mutation: JourneyMutation
  approvalBoundary?: 'external_approval' | 'human_review'
}

export type CriticalJourney = {
  id: string
  audience: 'visitor' | 'studio-applicant' | 'learner' | 'client'
  entry: string
  outcome: string
  steps: JourneyStep[]
}

export type JourneyFinding = {
  code: string
  journeyId: string
  stepId?: string
  message: string
}

export function auditCriticalJourneys(journeys: CriticalJourney[]): {
  ok: boolean
  findings: JourneyFinding[]
} {
  const findings: JourneyFinding[] = []
  const journeyIds = new Set<string>()

  for (const journey of journeys) {
    if (journeyIds.has(journey.id)) {
      findings.push({
        code: 'journey_id_duplicate',
        journeyId: journey.id,
        message: `Journey id ${journey.id} is duplicated.`,
      })
    }
    journeyIds.add(journey.id)

    if (!journey.outcome.trim()) {
      findings.push({
        code: 'journey_outcome_missing',
        journeyId: journey.id,
        message: 'Journey outcome is required.',
      })
    }
    if (journey.steps.length === 0) {
      findings.push({
        code: 'journey_steps_missing',
        journeyId: journey.id,
        message: 'At least one journey step is required.',
      })
      continue
    }
    if (journey.steps[0]?.route !== journey.entry) {
      findings.push({
        code: 'journey_entry_mismatch',
        journeyId: journey.id,
        message: 'The first step route must match the journey entry.',
      })
    }

    const stepIds = new Set<string>()
    for (const step of journey.steps) {
      if (stepIds.has(step.id)) {
        findings.push({
          code: 'journey_step_duplicate',
          journeyId: journey.id,
          stepId: step.id,
          message: `Step id ${step.id} is duplicated.`,
        })
      }
      stepIds.add(step.id)
    }

    for (const step of journey.steps) {
      if (step.next && !stepIds.has(step.next)) {
        findings.push({
          code: 'journey_next_missing',
          journeyId: journey.id,
          stepId: step.id,
          message: `Next step ${step.next} does not exist.`,
        })
      }
      if (step.proof === 'none') {
        findings.push({
          code: 'journey_proof_missing',
          journeyId: journey.id,
          stepId: step.id,
          message: 'Every critical step requires deterministic proof.',
        })
      }
      if (step.mutation === 'external' && step.approvalBoundary !== 'external_approval') {
        findings.push({
          code: 'external_mutation_not_approval_bound',
          journeyId: journey.id,
          stepId: step.id,
          message: 'External mutations require an explicit approval boundary.',
        })
      }
    }

    const terminalSteps = journey.steps.filter((step) => !step.next)
    if (terminalSteps.length === 0 || terminalSteps.some((step) => !step.recovery)) {
      findings.push({
        code: 'journey_recovery_missing',
        journeyId: journey.id,
        message: 'Every terminal state requires a recovery or continuation route.',
      })
    }
  }

  return { ok: findings.length === 0, findings }
}

export const CRITICAL_JOURNEYS: CriticalJourney[] = [
  {
    id: 'marketing-to-studio-signup',
    audience: 'visitor',
    entry: '/',
    outcome: 'A visitor can understand the offer and request studio access without leaking credentials.',
    steps: [
      { id: 'marketing', route: '/', next: 'signup', proof: 'browser', mutation: 'none' },
      { id: 'signup', route: '/signup', next: 'verify', proof: 'browser', mutation: 'none' },
      { id: 'verify', route: '/onboarding', recovery: '/login', proof: 'browser', mutation: 'external', approvalBoundary: 'external_approval' },
    ],
  },
  {
    id: 'academy-signup',
    audience: 'learner',
    entry: '/academy/signup',
    outcome: 'A learner can request an email-verified account without privileged account creation.',
    steps: [
      { id: 'signup', route: '/academy/signup', next: 'verify', proof: 'browser', mutation: 'none' },
      { id: 'verify', route: '/onboarding', recovery: '/login?audience=academy', proof: 'contract', mutation: 'external', approvalBoundary: 'external_approval' },
    ],
  },
  {
    id: 'service-checkout',
    audience: 'visitor',
    entry: '/checkout/audit',
    outcome: 'A buyer explicitly confirms a server-owned service before checkout begins.',
    steps: [
      { id: 'review', route: '/checkout/audit', next: 'stripe', proof: 'browser', mutation: 'none' },
      { id: 'stripe', route: '/api/checkout', recovery: '/checkout/audit', proof: 'contract', mutation: 'external', approvalBoundary: 'external_approval' },
    ],
  },
  {
    id: 'care-checkout',
    audience: 'visitor',
    entry: '/checkout/site-care',
    outcome: 'A buyer can review a recurring care plan and recover from checkout failure.',
    steps: [
      { id: 'review', route: '/checkout/site-care', next: 'stripe', proof: 'browser', mutation: 'none' },
      { id: 'stripe', route: '/api/checkout', recovery: '/checkout/site-care', proof: 'contract', mutation: 'external', approvalBoundary: 'external_approval' },
    ],
  },
  {
    id: 'checkout-return',
    audience: 'visitor',
    entry: '/checkout/success',
    outcome: 'Payment confirmation is shown only after a durable webhook-owned fulfillment receipt exists.',
    steps: [
      { id: 'receipt', route: '/checkout/success', recovery: '/contact', proof: 'database', mutation: 'none' },
    ],
  },
  {
    id: 'checkout-cancel',
    audience: 'visitor',
    entry: '/checkout/cancel',
    outcome: 'A buyer who cancels can return to pricing or request help without ambiguity.',
    steps: [
      { id: 'cancel', route: '/checkout/cancel', recovery: '/pricing', proof: 'browser', mutation: 'none' },
    ],
  },
  {
    id: 'account-gate',
    audience: 'client',
    entry: '/portal',
    outcome: 'An unauthenticated visitor is denied private account data and receives a safe recovery path.',
    steps: [
      { id: 'gate', route: '/portal', recovery: '/login?next=/portal', proof: 'browser', mutation: 'none' },
    ],
  },
]
