import type { TopicKey } from '@/lib/academy/topics'

/**
 * Prototype learning-path fixture. Canonical course identities live in
 * data/academy/registry.json. This file cannot define public counts or status.
 */
export type Level = 'Beginner' | 'Intermediate' | 'Advanced'

export type PathItem = {
  slug: string
  name: string
  topic: TopicKey
  level: Level
  courses: number
  hours: number
  /** 0–1, present when the learner has started. */
  progress?: number
}

export type CourseItem = {
  slug: string
  title: string
  topic: TopicKey
  level: Level
  lessons: number
  hours: number
  /** One-line course description (from the DB `subtitle`); empty when unset. */
  subtitle?: string
}

export const paths: PathItem[] = [
  { slug: 'foundations', name: 'Foundations', topic: 'foundations', level: 'Beginner', courses: 6, hours: 18 },
  { slug: 'ai-engineering', name: 'AI Engineering', topic: 'ai-engineering', level: 'Intermediate', courses: 8, hours: 26 },
  { slug: 'ship-real-products', name: 'Ship Real Products', topic: 'ship-it', level: 'Advanced', courses: 7, hours: 22 },
]

export const courses: CourseItem[] = [
  { slug: 'python-basics', title: 'Python Basics', topic: 'foundations', level: 'Beginner', lessons: 12, hours: 3 },
  { slug: 'git-the-terminal', title: 'Git & the Terminal', topic: 'foundations', level: 'Beginner', lessons: 7, hours: 2 },
  { slug: 'data-structures', title: 'Data Structures', topic: 'foundations', level: 'Beginner', lessons: 10, hours: 4 },
  { slug: 'the-llm-api', title: 'The LLM API', topic: 'ai-engineering', level: 'Intermediate', lessons: 9, hours: 4 },
  { slug: 'prompt-engineering', title: 'Prompt Engineering', topic: 'ai-engineering', level: 'Intermediate', lessons: 8, hours: 3 },
  { slug: 'rag-retrieval', title: 'RAG & Retrieval', topic: 'ai-engineering', level: 'Intermediate', lessons: 11, hours: 5 },
  { slug: 'agents-tool-use', title: 'Agents & Tool Use', topic: 'ai-engineering', level: 'Advanced', lessons: 12, hours: 6 },
  { slug: 'nextjs-supabase', title: 'Next.js + Supabase', topic: 'ship-it', level: 'Advanced', lessons: 14, hours: 6 },
  { slug: 'stripe-auth', title: 'Stripe & Auth', topic: 'ship-it', level: 'Advanced', lessons: 8, hours: 3 },
]
