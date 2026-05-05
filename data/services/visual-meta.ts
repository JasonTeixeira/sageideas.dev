// Per-service visual metadata: lucide icon name + accent color.
// Keep keys stable — they map to the lucide-react icon imports in templates.

export type AccentColor = 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose'

export type LucideIconName =
  | 'Sparkles'
  | 'Database'
  | 'Shield'
  | 'Zap'
  | 'Bot'
  | 'BookOpen'
  | 'Search'
  | 'Wrench'
  | 'Workflow'
  | 'BarChart3'
  | 'FileText'
  | 'Megaphone'
  | 'Palette'
  | 'Code2'
  | 'Cpu'
  | 'Cloud'
  | 'CreditCard'
  | 'Lock'
  | 'Mic'
  | 'Headphones'
  | 'Users'
  | 'Phone'
  | 'TrendingUp'
  | 'Target'
  | 'Lightbulb'
  | 'Briefcase'
  | 'Bug'
  | 'AlertTriangle'
  | 'GitBranch'
  | 'Bell'
  | 'Inbox'
  | 'Brush'
  | 'Globe'
  | 'Package'
  | 'Building2'
  | 'Brain'
  | 'Compass'
  | 'Activity'

export type ServiceVisualMeta = {
  icon: LucideIconName
  accent: AccentColor
}

const DEFAULT: ServiceVisualMeta = { icon: 'Sparkles', accent: 'cyan' }

export const visualMeta: Record<string, ServiceVisualMeta> = {
  // Original tiers
  audit: { icon: 'Search', accent: 'cyan' },
  ship: { icon: 'Zap', accent: 'cyan' },
  automate: { icon: 'Workflow', accent: 'violet' },
  'seo-sprint': { icon: 'TrendingUp', accent: 'emerald' },
  'content-engine': { icon: 'FileText', accent: 'amber' },
  'brand-sprint': { icon: 'Palette', accent: 'rose' },
  scale: { icon: 'BarChart3', accent: 'cyan' },
  build: { icon: 'Code2', accent: 'violet' },
  operate: { icon: 'Activity', accent: 'cyan' },
  'app-development': { icon: 'Package', accent: 'violet' },

  // Site Starter
  'site-starter-landing': { icon: 'Zap', accent: 'cyan' },
  'site-starter-marketing': { icon: 'Globe', accent: 'cyan' },
  'site-starter-pro': { icon: 'Code2', accent: 'cyan' },

  // Care retainers
  'site-care': { icon: 'Globe', accent: 'cyan' },
  'brand-care': { icon: 'Brush', accent: 'rose' },
  'content-care': { icon: 'FileText', accent: 'amber' },

  // AI services
  'ai-reliability-audit': { icon: 'Activity', accent: 'cyan' },
  'rag-engineering': { icon: 'Database', accent: 'violet' },
  'agent-ops': { icon: 'Bot', accent: 'violet' },
  'internal-ai-copilot': { icon: 'Brain', accent: 'violet' },
  'prompt-eval-library': { icon: 'Bug', accent: 'cyan' },
  'rag-as-a-service': { icon: 'BookOpen', accent: 'violet' },
  'churn-prediction-model': { icon: 'TrendingUp', accent: 'emerald' },

  // Automation pipelines
  'ops-automation-sprint': { icon: 'Workflow', accent: 'cyan' },
  'incident-postmortem-pipeline': { icon: 'AlertTriangle', accent: 'amber' },
  'release-notes-automation': { icon: 'GitBranch', accent: 'cyan' },
  'customer-feedback-router': { icon: 'Inbox', accent: 'emerald' },
  'data-hygiene-bot': { icon: 'Database', accent: 'cyan' },
  'ai-meeting-notes-sync': { icon: 'FileText', accent: 'amber' },
  'stripe-integration-sprint': { icon: 'CreditCard', accent: 'violet' },
  'auth-billing-foundation': { icon: 'Lock', accent: 'violet' },

  // AI products (customer-facing)
  'docs-as-product': { icon: 'BookOpen', accent: 'amber' },
  'ai-onboarding-concierge': { icon: 'Compass', accent: 'cyan' },
  'support-deflection': { icon: 'Headphones', accent: 'emerald' },
  'ai-sdr-agent': { icon: 'Megaphone', accent: 'rose' },
  'ai-support-agent': { icon: 'Headphones', accent: 'emerald' },
  'ai-knowledge-bot': { icon: 'Brain', accent: 'violet' },

  // Retainers
  'ai-quality-retainer': { icon: 'Activity', accent: 'cyan' },
  'automation-retainer': { icon: 'Workflow', accent: 'cyan' },
  'reliability-retainer': { icon: 'Shield', accent: 'emerald' },
  'founders-tech-partner': { icon: 'Briefcase', accent: 'violet' },
  'fractional-cto-retainer': { icon: 'Briefcase', accent: 'violet' },
  'agent-operations-retainer': { icon: 'Bot', accent: 'violet' },

  // Diagnostics
  'ai-readiness-assessment': { icon: 'Compass', accent: 'cyan' },
  'stack-xray': { icon: 'Search', accent: 'cyan' },
  'hallucination-hunt': { icon: 'Bug', accent: 'amber' },

  // Bundles
  'studio-package': { icon: 'Package', accent: 'violet' },
  'bespoke-build': { icon: 'Wrench', accent: 'violet' },

  // Flagship (rendered by FlagshipPageContent, but still listed for grid)
  'ai-implementation-consulting': { icon: 'Lightbulb', accent: 'violet' },
  'ai-agent-development': { icon: 'Bot', accent: 'violet' },
  'ai-voice-agent': { icon: 'Mic', accent: 'violet' },
  'ai-lead-engine': { icon: 'Target', accent: 'rose' },

  // Compliance
  'soc2-readiness-sprint': { icon: 'Shield', accent: 'emerald' },
  'hipaa-readiness-audit': { icon: 'Shield', accent: 'emerald' },

  // Growth
  'seo-foundation-sprint': { icon: 'TrendingUp', accent: 'emerald' },
}

export function getVisualMeta(slug: string): ServiceVisualMeta {
  return visualMeta[slug] ?? DEFAULT
}

export const accentClasses: Record<
  AccentColor,
  {
    text: string
    bg: string
    border: string
    borderStrong: string
    gradient: string
    iconBg: string
    glow: string
  }
> = {
  cyan: {
    text: 'text-[#06B6D4]',
    bg: 'bg-[#06B6D4]/10',
    border: 'border-[#06B6D4]/20',
    borderStrong: 'border-[#06B6D4]/40',
    gradient: 'from-[#06B6D4]/20 via-[#0891B2]/10 to-transparent',
    iconBg: 'bg-[#06B6D4]/10 ring-1 ring-[#06B6D4]/30',
    glow: 'shadow-[0_0_60px_rgba(6,182,212,0.15)]',
  },
  violet: {
    text: 'text-[#8B5CF6]',
    bg: 'bg-[#8B5CF6]/10',
    border: 'border-[#8B5CF6]/20',
    borderStrong: 'border-[#8B5CF6]/40',
    gradient: 'from-[#8B5CF6]/20 via-[#7C3AED]/10 to-transparent',
    iconBg: 'bg-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]/30',
    glow: 'shadow-[0_0_60px_rgba(139,92,246,0.15)]',
  },
  emerald: {
    text: 'text-[#10B981]',
    bg: 'bg-[#10B981]/10',
    border: 'border-[#10B981]/20',
    borderStrong: 'border-[#10B981]/40',
    gradient: 'from-[#10B981]/20 via-[#059669]/10 to-transparent',
    iconBg: 'bg-[#10B981]/10 ring-1 ring-[#10B981]/30',
    glow: 'shadow-[0_0_60px_rgba(16,185,129,0.15)]',
  },
  amber: {
    text: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
    border: 'border-[#F59E0B]/20',
    borderStrong: 'border-[#F59E0B]/40',
    gradient: 'from-[#F59E0B]/20 via-[#D97706]/10 to-transparent',
    iconBg: 'bg-[#F59E0B]/10 ring-1 ring-[#F59E0B]/30',
    glow: 'shadow-[0_0_60px_rgba(245,158,11,0.15)]',
  },
  rose: {
    text: 'text-[#F43F5E]',
    bg: 'bg-[#F43F5E]/10',
    border: 'border-[#F43F5E]/20',
    borderStrong: 'border-[#F43F5E]/40',
    gradient: 'from-[#F43F5E]/20 via-[#E11D48]/10 to-transparent',
    iconBg: 'bg-[#F43F5E]/10 ring-1 ring-[#F43F5E]/30',
    glow: 'shadow-[0_0_60px_rgba(244,63,94,0.15)]',
  },
}
