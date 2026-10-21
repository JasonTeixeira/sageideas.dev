import type { TopicKey } from '@/lib/academy/topics'
import type { IconName } from '@/components/academy/ui/Icon'

/**
 * Academy taxonomy — the scalable navigational spine.
 *
 *   Category  →  Track  →  Course  →  Sprint
 *
 * Categories are broad navigation domains, not course identity or publication
 * authority; those live in data/academy/registry.json. Software & AI Engineering
 * is current; Design and Mobile come later. Tracks within a category (the 12
 * canonical engineering tracks live under "Software & AI Engineering"). Courses
 * reference a track by id. This file is the source of truth for the catalog's
 * structure; content (courses/sprints) is data and arrives later.
 */

export type TaxonomyStatus = 'live' | 'building' | 'upcoming'

export type AcademyTrack = {
  id: string
  name: string
  blurb: string
  glyph: IconName
  topic: TopicKey
  categoryId: string
  status: TaxonomyStatus
  /** what the learner can do after the track */
  outcome: string
}

export type AcademyCategory = {
  id: string
  name: string
  tagline: string
  glyph: IconName
  status: TaxonomyStatus
}

export const CATEGORIES: AcademyCategory[] = [
  { id: 'software-ai', name: 'Software & AI Engineering', tagline: 'Become the engineer who ships AI products', glyph: 'compass', status: 'live' },
  { id: 'design', name: 'Design & Product', tagline: 'Interface, systems, and taste', glyph: 'sparkle', status: 'upcoming' },
  { id: 'mobile', name: 'Mobile Development', tagline: 'Native and cross-platform apps', glyph: 'users', status: 'upcoming' },
]

/** The 12 canonical engineering tracks (Sage Learning Engine V2), under Software & AI. */
export const TRACKS: AcademyTrack[] = [
  { id: 'foundations', name: 'Programming & CS Foundations', blurb: 'The bedrock: syntax, data structures, the terminal, how computers actually run your code.', glyph: 'book', topic: 'foundations', categoryId: 'software-ai', status: 'live', outcome: 'Write, run, and reason about real programs from first principles.' },
  { id: 'backend', name: 'Backend Engineering', blurb: 'APIs, services, auth, and the server-side patterns that hold products together.', glyph: 'bolt', topic: 'ship-it', categoryId: 'software-ai', status: 'building', outcome: 'Design and ship production-grade backend services.' },
  { id: 'frontend', name: 'Frontend & Fullstack', blurb: 'Modern UI, state, and the full request-to-render path with React and Next.js.', glyph: 'play', topic: 'ship-it', categoryId: 'software-ai', status: 'building', outcome: 'Build fast, accessible, full-stack web apps end to end.' },
  { id: 'databases', name: 'Databases & Data Modeling', blurb: 'Schemas, queries, indexes, and modeling data so it stays correct at scale.', glyph: 'target', topic: 'data', categoryId: 'software-ai', status: 'building', outcome: 'Model and query data that stays correct under load.' },
  { id: 'cloud', name: 'Cloud, DevOps & Operations', blurb: 'Deploys, pipelines, infra, and running software you can actually operate.', glyph: 'refresh', topic: 'ship-it', categoryId: 'software-ai', status: 'building', outcome: 'Ship, deploy, and operate systems in production.' },
  { id: 'architecture', name: 'Architecture & System Design', blurb: 'Tradeoffs, boundaries, and designing systems that survive growth.', glyph: 'compass', topic: 'ai-engineering', categoryId: 'software-ai', status: 'building', outcome: 'Design systems and defend the tradeoffs in an interview.' },
  { id: 'ai-engineering', name: 'AI Engineering · RAG & Eval', blurb: 'LLM APIs, retrieval, agents, evals — building AI features that actually work.', glyph: 'sparkle', topic: 'ai-engineering', categoryId: 'software-ai', status: 'live', outcome: 'Build, evaluate, and ship reliable AI features.' },
  { id: 'data-engineering', name: 'Data Engineering & Analytics', blurb: 'Pipelines, warehouses, and turning raw data into decisions.', glyph: 'search', topic: 'data', categoryId: 'software-ai', status: 'building', outcome: 'Build pipelines and analytics that drive decisions.' },
  { id: 'security', name: 'Security & Identity', blurb: 'Auth, secrets, the OWASP top 10, and thinking like an attacker.', glyph: 'shield', topic: 'foundations', categoryId: 'software-ai', status: 'building', outcome: 'Find and fix the vulnerabilities before they ship.' },
  { id: 'reliability', name: 'Observability & Reliability', blurb: 'Metrics, logs, traces, performance — keeping systems fast and up.', glyph: 'target', topic: 'ship-it', categoryId: 'software-ai', status: 'building', outcome: 'Diagnose and prevent production incidents.' },
  { id: 'career', name: 'Interview, Career & Portfolio', blurb: 'System design rounds, the portfolio that lands offers, the story that closes them.', glyph: 'trophy', topic: 'growth', categoryId: 'software-ai', status: 'building', outcome: 'Pass the loop and land the role.' },
  { id: 'product', name: 'Product Execution & Market', blurb: 'Shipping the right thing, reading feedback, and proving impact.', glyph: 'star', topic: 'growth', categoryId: 'software-ai', status: 'building', outcome: 'Ship products that move real metrics.' },
]

export function tracksByCategory(categoryId: string): AcademyTrack[] {
  return TRACKS.filter((t) => t.categoryId === categoryId)
}

export function getTrack(id: string): AcademyTrack | undefined {
  return TRACKS.find((t) => t.id === id)
}

export function getCategory(id: string): AcademyCategory | undefined {
  return CATEGORIES.find((c) => c.id === id)
}
