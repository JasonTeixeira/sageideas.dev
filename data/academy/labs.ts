/**
 * The Sage Labs catalog — the workshop of real, resume-ready builds.
 *
 * Adding a project = adding one entry to LABS. Every lab is framed by the Sage
 * Method (frame → route → map → decide → prove), carries a real spec and
 * runnable acceptance checks (the proof), and states exactly what it signals to
 * an employer. `addedMonth` powers the "new this month" feed so the catalog can
 * grow on a monthly cadence without any code changes.
 */

import generatedRaw from './labs-generated.json'

export type SageMethodPhase = 'frame' | 'route' | 'map' | 'decide' | 'prove'

export type LabTrack =
  | 'ai-engineering'
  | 'backend'
  | 'frontend'
  | 'data'
  | 'cloud'
  | 'quality'
  | 'security'
  | 'foundations'

/** 1 = first real build · 5 = senior-level judgment under ambiguity. */
export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface AcceptanceCheck {
  /** Short, verifiable statement of what must hold for the build to pass. */
  label: string
  /** How the proof is confirmed. `test`/`output` are machine-checked. */
  kind: 'test' | 'output' | 'artifact' | 'review'
}

export interface LabProject {
  slug: string
  title: string
  track: LabTrack
  difficulty: Difficulty
  /** Estimated focused build time, in hours. */
  hours: number
  /** One-line hook. */
  tagline: string
  /** 2–3 sentences on what the learner actually builds. */
  whatYouBuild: string
  /** The exact line a learner can put on a résumé or portfolio. */
  resumeLine: string
  /** What finishing this signals to a hiring manager. */
  proves: string[]
  stack: string[]
  /** Concept slugs / lab slugs a learner should have first. */
  prerequisites: string[]
  /** Which Sage Method phases this build exercises. */
  phases: SageMethodPhase[]
  /** The brief, as ordered requirements. */
  spec: string[]
  /** The runnable/verifiable proof the build actually works. */
  acceptanceChecks: AcceptanceCheck[]
  /** The portfolio deliverable the learner keeps. */
  artifact: string
  /** True when there's an in-browser lab (LabRunner / Pyodide). */
  interactive?: boolean
  /** 'YYYY-MM' — powers the "new this month" feed. */
  addedMonth: string
  status: 'live' | 'coming-soon'
  featured?: boolean
}

export const LAB_TRACKS: Record<LabTrack, { label: string; tint: string }> = {
  'ai-engineering': { label: 'AI Engineering', tint: '#8FA0FF' },
  backend: { label: 'Backend', tint: '#8FA0FF' },
  frontend: { label: 'Frontend', tint: '#18B663' },
  data: { label: 'Data', tint: '#22C7A9' },
  cloud: { label: 'Cloud', tint: '#E0A93E' },
  quality: { label: 'Quality', tint: '#F472B6' },
  security: { label: 'Security', tint: '#E5484D' },
  foundations: { label: 'Foundations', tint: '#B6B6C0' },
}

const FLAGSHIP_LABS: LabProject[] = [
  {
    slug: 'rag-grounded-docs-qa',
    title: 'Ground a chatbot in your own docs',
    track: 'ai-engineering',
    difficulty: 3,
    hours: 6,
    tagline: 'A retrieval-augmented Q&A service that answers from your sources — and refuses when it can’t.',
    whatYouBuild:
      'A small RAG service: you index a folder of documents into a vector store, retrieve the top-k passages for a question, and have the model answer strictly from that context — citing the source and abstaining when the answer isn’t present. You finish with a service that turns "the model guessed" into "the model looked it up."',
    resumeLine:
      'Built a retrieval-augmented Q&A service (chunking, embeddings, top-k retrieval, grounded generation with citations and abstention) and proved grounding with an automated faithfulness check.',
    proves: [
      'Understands the retrieve → ground → cite loop, not just the buzzword',
      'Can make an LLM answer from sources instead of hallucinating',
      'Designs for the failure case (abstain when context is missing)',
    ],
    stack: ['Python', 'a vector store', 'an embeddings model', 'an LLM API'],
    prerequisites: ['what-is-rag', 'embeddings-basics'],
    phases: ['frame', 'map', 'decide', 'prove'],
    spec: [
      'Ingest a folder of .md/.txt docs; split each into overlapping chunks.',
      'Embed every chunk and store vectors with their source metadata.',
      'For a question, embed it and retrieve the top-k nearest chunks.',
      'Prompt the model to answer ONLY from the retrieved context, cite the source file, and say "not in the docs" when the answer is absent.',
      'Expose one function answer(question) → { text, sources[] }.',
    ],
    acceptanceChecks: [
      { label: 'A question answerable from the docs returns the correct fact AND cites the right source file', kind: 'test' },
      { label: 'A question NOT covered by the docs returns an explicit abstention, not a guess', kind: 'test' },
      { label: 'Retrieval returns k chunks ranked by similarity (order is deterministic for a fixed query)', kind: 'test' },
    ],
    artifact: 'A working RAG service + a passing grounding test suite',
    interactive: true,
    addedMonth: '2026-08',
    status: 'live',
    featured: true,
  },
  {
    slug: 'llm-eval-harness',
    title: 'Build an eval harness for your AI',
    track: 'ai-engineering',
    difficulty: 3,
    hours: 5,
    tagline: 'Turn "seems better" into a number — catch a regression before your users do.',
    whatYouBuild:
      'A test suite for an AI feature: a golden set of real inputs with known-good answers, a scorer (rubric or judge) that grades each output, and a single aggregate score. You change a prompt and watch the number move — the way a real team ships model changes without breaking things.',
    resumeLine:
      'Built an evaluation harness (golden set, rubric/LLM-judge scoring, aggregate metric with regression threshold) that gates prompt/model changes on measured quality.',
    proves: [
      'Replaces vibe-checking with a measured, repeatable score',
      'Understands golden sets, scoring, and regression thresholds',
      'Can defend a model change with evidence, not opinion',
    ],
    stack: ['Python', 'an LLM API', 'a scoring rubric'],
    prerequisites: ['what-is-an-eval'],
    phases: ['frame', 'decide', 'prove'],
    spec: [
      'Assemble a golden set: ≥15 real inputs, each with a known-good answer or rubric.',
      'Run the AI over every case and capture its output.',
      'Score each output 0–1 with a rubric or an LLM judge; average to one number.',
      'Add a threshold: fail the run if the aggregate drops below the baseline.',
      'Print a diff of which cases regressed between two runs.',
    ],
    acceptanceChecks: [
      { label: 'Scoring the golden set against its own known-good answers yields a near-perfect aggregate', kind: 'test' },
      { label: 'A deliberately degraded output lowers the aggregate below the threshold and fails the run', kind: 'test' },
      { label: 'The run reports exactly which cases regressed, by id', kind: 'output' },
    ],
    artifact: 'An eval harness + a golden set + a passing/failing run report',
    interactive: true,
    addedMonth: '2026-08',
    status: 'live',
    featured: true,
  },
  {
    slug: 'idempotent-charge-api',
    title: 'A payment endpoint that can’t double-charge',
    track: 'backend',
    difficulty: 2,
    hours: 3,
    tagline: 'The retry-safe charge API every real payments system needs — and most tutorials skip.',
    whatYouBuild:
      'A charge endpoint that stays correct when the network retries. You add an idempotency key, a store of handled keys, and a guard that makes a repeated request a no-op returning the original result — so three retries still charge the card once.',
    resumeLine:
      'Designed and tested an idempotent payment endpoint (idempotency-key guard, exactly-once semantics under retries) with a suite proving repeat requests never double-charge.',
    proves: [
      'Understands exactly-once semantics and why at-least-once delivery breaks naïve handlers',
      'Designs for the retry, not just the happy path',
      'Writes the test that a skeptic can run',
    ],
    stack: ['Python', 'a key/value store'],
    prerequisites: ['http-methods', 'state-and-storage'],
    phases: ['frame', 'map', 'prove'],
    spec: [
      'Accept a charge request carrying a unique Idempotency-Key.',
      'On first sight of a key: perform the charge, store { key → result }.',
      'On a repeat of a seen key: skip the charge, return the stored result.',
      'Guarantee: N identical requests ⇒ exactly one charge, N identical responses.',
    ],
    acceptanceChecks: [
      { label: 'Three identical requests with the same key produce exactly one charge', kind: 'test' },
      { label: 'The repeated requests each return the original charge result', kind: 'test' },
      { label: 'Different keys produce independent charges', kind: 'test' },
    ],
    artifact: 'A retry-safe charge endpoint + a passing idempotency test suite',
    interactive: true,
    addedMonth: '2026-08',
    status: 'live',
    featured: true,
  },
]

/**
 * The full catalog: hand-authored flagships + machine-generated builds (each
 * validated against LabProject before merge). Add a project by appending to
 * FLAGSHIP_LABS or dropping an entry into labs-generated.json.
 */
export const LABS: LabProject[] = [...FLAGSHIP_LABS, ...(generatedRaw as LabProject[])]

/** Newest-first, live labs only. */
export const liveLabs = (): LabProject[] =>
  LABS.filter((l) => l.status === 'live').sort((a, b) => b.addedMonth.localeCompare(a.addedMonth))

export const labBySlug = (slug: string): LabProject | undefined => LABS.find((l) => l.slug === slug)
