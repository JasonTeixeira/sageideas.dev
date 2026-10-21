/**
 * Prototype presentation fixture. It is not an authority for Academy identity,
 * counts, publication, or certification.
 *
 * Academy catalog — the learner-facing curriculum for the bright "/learn"
 * experience. Seeded with real, credible topics that match the studio's actual
 * stack (Python, JS/TS, LLM engineering, RAG, agents, shipping full-stack SaaS).
 * Structured as Paths (ordered journeys) → Courses, plus standalone guided Labs.
 */

export type Level = 'Beginner' | 'Intermediate' | 'Builder'

export type Course = {
  slug: string
  title: string
  blurb: string
  level: Level
  hours: number
  lessons: number
  free?: boolean
  /** Emoji/glyph stand-in until real cover art lands. */
  glyph: string
}

export type Path = {
  slug: string
  name: string
  tagline: string
  level: Level
  courseCount: number
  labCount: number
  /** Gradient stops for the path's accent ribbon. */
  gradient: [string, string]
  outcomes: readonly string[]
}

export type Lab = {
  slug: string
  title: string
  blurb: string
  level: Level
  minutes: number
  stack: string
  free?: boolean
}

export const paths: readonly Path[] = [
  {
    slug: 'code-foundations',
    name: 'Code Foundations',
    tagline: 'From zero to writing real programs — Python, JavaScript, the terminal, and how the web actually works.',
    level: 'Beginner',
    courseCount: 6,
    labCount: 8,
    gradient: ['#3D5AFE', '#7C3AED'],
    outcomes: ['Write & run real code', 'Think in functions & data', 'Use Git and the terminal', 'Read other people’s code'],
  },
  {
    slug: 'ai-engineering',
    name: 'AI Engineering',
    tagline: 'Build with LLMs for real — prompts, the API, RAG, vector search, and agents that do useful work.',
    level: 'Intermediate',
    courseCount: 7,
    labCount: 10,
    gradient: ['#7C3AED', '#FF2D9B'],
    outcomes: ['Ship features on the LLM API', 'Design prompts that hold up', 'Build a RAG pipeline', 'Wire up tool-using agents'],
  },
  {
    slug: 'ship-real-products',
    name: 'Ship Real Products',
    tagline: 'Turn ideas into deployed apps — Next.js, Supabase, auth, payments, and going live.',
    level: 'Builder',
    courseCount: 6,
    labCount: 9,
    gradient: ['#3D5AFE', '#00C2A8'],
    outcomes: ['Build a full-stack app', 'Add auth & a database', 'Take real payments', 'Deploy to production'],
  },
]

export const courses: readonly Course[] = [
  { slug: 'python-from-zero', title: 'Python From Zero', blurb: 'Your first language — variables, logic, functions, and your first real script.', level: 'Beginner', hours: 6, lessons: 28, free: true, glyph: '🐍' },
  { slug: 'javascript-typescript', title: 'JavaScript & TypeScript', blurb: 'The language of the web, plus the types that keep big apps sane.', level: 'Beginner', hours: 8, lessons: 34, glyph: '⬡' },
  { slug: 'llm-api', title: 'Build With the LLM API', blurb: 'Call models, stream responses, handle tools, and ship your first AI feature.', level: 'Intermediate', hours: 5, lessons: 22, free: true, glyph: '✦' },
  { slug: 'prompt-engineering', title: 'Prompt Engineering for Builders', blurb: 'Prompts that are reliable in production — structure, evals, and guardrails.', level: 'Intermediate', hours: 4, lessons: 18, glyph: '◆' },
  { slug: 'rag-vector-search', title: 'RAG & Vector Search', blurb: 'Ground a model in your own data with embeddings, retrieval, and citations.', level: 'Intermediate', hours: 6, lessons: 24, glyph: '⬢' },
  { slug: 'saas-nextjs-supabase', title: 'Ship a SaaS: Next.js + Supabase', blurb: 'Auth, database, Stripe payments, and a real deploy — the whole machine.', level: 'Builder', hours: 10, lessons: 40, glyph: '▲' },
]

export const labs: readonly Lab[] = [
  { slug: 'first-ai-chatbot', title: 'Build your first AI chatbot', blurb: 'A working chat app on the LLM API, start to finish.', level: 'Beginner', minutes: 45, stack: 'Python · LLM API', free: true },
  { slug: 'cli-weather-app', title: 'A CLI weather app', blurb: 'Call a real API, parse JSON, and print a clean forecast.', level: 'Beginner', minutes: 30, stack: 'Python', free: true },
  { slug: 'rag-docs-search', title: 'RAG-powered docs search', blurb: 'Embed a docs set and answer questions with citations.', level: 'Intermediate', minutes: 60, stack: 'Python · pgvector' },
  { slug: 'deploy-fullstack', title: 'Deploy a full-stack app', blurb: 'From localhost to a live URL with a database behind it.', level: 'Builder', minutes: 50, stack: 'Next.js · Supabase · Vercel' },
]
