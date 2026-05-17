'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import {
  Menu,
  X,
  Github,
  Linkedin,
  LogIn,
  LayoutDashboard,
  ChevronDown,
  Search,
  Command,
  Sparkles,
  Briefcase,
  BookOpen,
  FlaskConical,
  Users,
  Wrench,
  ShieldCheck,
  Gauge,
  Calculator,
  FileText,
  GitCompare,
  Building2,
  History,
  Mail,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────────────────
// Mega-menu data
// ────────────────────────────────────────────────────────────────────────────

type MegaItem = {
  href: string
  label: string
  description?: string
  badge?: string
  icon?: React.ComponentType<{ className?: string }>
}

type MegaSection = {
  title: string
  items: MegaItem[]
}

const servicesMega: MegaSection[] = [
  {
    title: 'AI Flagship',
    items: [
      {
        href: '/services/ai-implementation-consulting',
        label: 'AI Implementation Consulting',
        description: 'From $1,000 · 2 weeks · Audit',
        icon: Sparkles,
      },
      {
        href: '/services/ai-agent-development',
        label: 'AI Agent Development',
        description: 'From $2,600 · 4 weeks · Build',
        icon: Sparkles,
        badge: 'POPULAR',
      },
      {
        href: '/services/ai-voice-agent',
        label: 'AI Voice Agent',
        description: 'From $1,800 · 3 weeks · Build',
        icon: Sparkles,
      },
      {
        href: '/services/ai-lead-engine',
        label: 'AI Lead Engine',
        description: 'From $2,200 · 4 weeks · Build',
        icon: Sparkles,
      },
      {
        href: '/services/agent-operations-retainer',
        label: 'Agent Operations Retainer',
        description: 'From $600/mo · Operate',
        icon: Sparkles,
      },
    ],
  },
  {
    title: 'Productized engagements',
    items: [
      {
        href: '/services',
        label: 'All services',
        description: '20+ productized engagements',
        icon: Briefcase,
      },
      {
        href: '/services#cat-ai-automation',
        label: 'AI & Automation',
        description: 'Audits · pipelines · agents',
        icon: Wrench,
      },
      {
        href: '/services#cat-care',
        label: 'Care plans',
        description: 'Site · brand · content care',
        icon: ShieldCheck,
      },
      {
        href: '/services#cat-platform',
        label: 'Platform & Cloud',
        description: 'AWS · Vercel · Supabase',
        icon: Building2,
      },
    ],
  },
  {
    title: 'By context',
    items: [
      {
        href: '/industries',
        label: 'Browse by industry',
        description: 'Bundles for 16 verticals',
        icon: Building2,
      },
      {
        href: '/capabilities',
        label: 'Capability matrix',
        description: 'What we ship, end-to-end',
        icon: Wrench,
      },
      {
        href: '/pricing',
        label: 'Pricing & comparison',
        description: 'Every tier, side-by-side',
        icon: Briefcase,
      },
    ],
  },
]

const resourcesMega: MegaSection[] = [
  {
    title: 'Read',
    items: [
      {
        href: '/blog',
        label: 'Insights',
        description: '50+ field-reports & playbooks',
        icon: BookOpen,
      },
      {
        href: '/pov',
        label: 'POV',
        description: 'Opinions, hot takes, principles',
        icon: BookOpen,
      },
      {
        href: '/changelog',
        label: 'Changelog',
        description: 'What we shipped recently',
        icon: History,
      },
      {
        href: '/compare',
        label: 'Compare',
        description: 'Sage vs in-house, Big-4, AI platforms',
        icon: GitCompare,
      },
    ],
  },
  {
    title: 'Use',
    items: [
      {
        href: '/lab/ai-readiness',
        label: 'AI Readiness Score',
        description: '10-question diagnostic with personalized roadmap',
        icon: Gauge,
      },
      {
        href: '/lab/calculators',
        label: 'ROI calculators',
        description: 'SDR, support, RAG, voice, churn',
        icon: Calculator,
      },
      {
        href: '/lab/templates',
        label: 'Free templates',
        description: 'Prompt library, eval harness, RFP, more',
        icon: FileText,
      },
      {
        href: '/lab',
        label: 'Lab products',
        description: 'What we built and operate ourselves',
        icon: FlaskConical,
      },
      {
        href: '/how-it-works',
        label: 'How it works',
        description: 'Our process, demystified',
        icon: Wrench,
      },
      {
        href: '/trust',
        label: 'Trust center',
        description: 'Security, evals, compliance',
        icon: ShieldCheck,
      },
    ],
  },
  {
    title: 'About',
    items: [
      {
        href: '/founder',
        label: 'Founder',
        description: 'Who runs this studio',
        icon: Users,
      },
      {
        href: '/studio',
        label: 'The studio',
        description: 'How we operate',
        icon: Building2,
      },
      {
        href: '/contact',
        label: 'Contact',
        description: 'Reach us directly',
        icon: Mail,
      },
    ],
  },
]

const mobileFlat: { href: string; label: string; section?: string }[] = [
  { href: '/services', label: 'Services', section: 'PRIMARY' },
  { href: '/work', label: 'Work', section: 'PRIMARY' },
  { href: '/pricing', label: 'Pricing', section: 'PRIMARY' },
  { href: '/services#cat-ai-flagship', label: 'AI Flagship', section: 'PRIMARY' },
  { href: '/blog', label: 'Insights', section: 'RESOURCES' },
  { href: '/pov', label: 'POV', section: 'RESOURCES' },
  { href: '/lab/ai-readiness', label: 'AI Readiness Score', section: 'RESOURCES' },
  { href: '/lab/calculators', label: 'ROI calculators', section: 'RESOURCES' },
  { href: '/lab/templates', label: 'Free templates', section: 'RESOURCES' },
  { href: '/lab', label: 'Lab products', section: 'RESOURCES' },
  { href: '/compare', label: 'Compare', section: 'RESOURCES' },
  { href: '/how-it-works', label: 'How it works', section: 'RESOURCES' },
  { href: '/changelog', label: 'Changelog', section: 'RESOURCES' },
  { href: '/capabilities', label: 'Capabilities', section: 'COMPANY' },
  { href: '/industries', label: 'Industries', section: 'COMPANY' },
  { href: '/trust', label: 'Trust', section: 'COMPANY' },
  { href: '/founder', label: 'Founder', section: 'COMPANY' },
  { href: '/studio', label: 'Studio', section: 'COMPANY' },
  { href: '/contact', label: 'Contact', section: 'COMPANY' },
]

// ────────────────────────────────────────────────────────────────────────────
// Mega-menu dropdown
// ────────────────────────────────────────────────────────────────────────────

function MegaDropdown({
  label,
  sections,
  isOpen,
  onOpen,
  onClose,
}: {
  label: string
  sections: MegaSection[]
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        type="button"
        onClick={() => (isOpen ? onClose() : onOpen())}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          'whitespace-nowrap inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-colors',
          isOpen
            ? 'text-[#FAFAFA] bg-[#1A1917]'
            : 'text-[#A8A29E] hover:text-[#FAFAFA] hover:bg-[#1A1917]'
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50"
          >
            <div
              className="rounded-2xl bg-[#0B0A09] border border-[#2A2826] shadow-2xl shadow-black/40 overflow-hidden"
              style={{ width: 'min(880px, 92vw)' }}
            >
              <div className="grid grid-cols-3 divide-x divide-[#1A1917]">
                {sections.map((section) => (
                  <div key={section.title} className="p-5">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#57534E] mb-3">
                      {section.title}
                    </p>
                    <ul className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={onClose}
                              className="group flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-[#141418] transition-colors"
                            >
                              {Icon && (
                                <span
                                  className="shrink-0 w-7 h-7 rounded-md bg-[#1A1917] border border-[#2A2826] flex items-center justify-center group-hover:border-[#0ED3CF]/40 transition-colors"
                                >
                                  <Icon className="w-3.5 h-3.5 text-[#A8A29E] group-hover:text-[#0ED3CF] transition-colors" />
                                </span>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13.5px] font-medium text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors whitespace-nowrap">
                                    {item.label}
                                  </span>
                                  {item.badge && (
                                    <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-[#0ED3CF]/15 text-[#0ED3CF] border border-[#0ED3CF]/30">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-[11.5px] text-[#78716C] mt-0.5 leading-snug">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#1A1917] px-5 py-3 flex items-center justify-between gap-3 bg-[#06070A]">
                <p className="text-[11px] text-[#78716C]">
                  Not sure where to start? Book a free 30-min call.
                </p>
                <Link
                  href="/book"
                  onClick={onClose}
                  className="text-[11px] font-mono uppercase tracking-widest text-[#0ED3CF] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
                >
                  Book a Call →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Top-level nav
// ────────────────────────────────────────────────────────────────────────────

type OpenMenu = null | 'services' | 'resources'

export function Navigation({ isSignedIn = false }: { isSignedIn?: boolean } = {}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [isMac, setIsMac] = useState(true)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileOpen(false)
    setOpenMenu(null)
  }, [pathname])

  useEffect(() => {
    setIsMac(
      typeof navigator !== 'undefined' &&
        navigator.platform.toUpperCase().indexOf('MAC') >= 0
    )
  }, [])

  // Hover-intent: small delay before closing so user can move into the panel
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120)
  }
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const openWith = (menu: OpenMenu) => {
    cancelClose()
    setOpenMenu(menu)
  }

  // Active state for top-level pills
  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    return pathname === path || pathname.startsWith(path + '/')
  }

  const triggerCommandPalette = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled || openMenu
          ? 'bg-[#09090B]/92 backdrop-blur-md border-b border-[#2A2826] shadow-lg shadow-black/10'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Wordmark — left */}
          <Link
            href="/"
            className="shrink-0 text-lg font-bold tracking-tight text-[#FAFAFA] hover:text-[#0ED3CF] transition-colors whitespace-nowrap"
            aria-label="Sage Ideas — Home"
          >
            SAGE IDEAS
          </Link>

          {/* Center cluster — primary nav */}
          <div className="hidden lg:flex items-center gap-0.5">
            <MegaDropdown
              label="Services"
              sections={servicesMega}
              isOpen={openMenu === 'services'}
              onOpen={() => openWith('services')}
              onClose={scheduleClose}
            />
            <Link
              href="/work"
              className={cn(
                'whitespace-nowrap px-3 py-2 text-sm rounded-lg transition-colors',
                isActive('/work')
                  ? 'text-[#0ED3CF] bg-[#1A1917]'
                  : 'text-[#A8A29E] hover:text-[#FAFAFA] hover:bg-[#1A1917]'
              )}
            >
              Work
            </Link>
            <Link
              href="/pricing"
              className={cn(
                'whitespace-nowrap px-3 py-2 text-sm rounded-lg transition-colors',
                isActive('/pricing')
                  ? 'text-[#0ED3CF] bg-[#1A1917]'
                  : 'text-[#A8A29E] hover:text-[#FAFAFA] hover:bg-[#1A1917]'
              )}
            >
              Pricing
            </Link>
            <MegaDropdown
              label="Resources"
              sections={resourcesMega}
              isOpen={openMenu === 'resources'}
              onOpen={() => openWith('resources')}
              onClose={scheduleClose}
            />
          </div>

          {/* Right cluster */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Compact search — icon-only with tooltip-style hint */}
            <button
              type="button"
              onClick={triggerCommandPalette}
              aria-label="Open search"
              className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[#78716C] hover:text-[#FAFAFA] hover:bg-[#1A1917] transition-colors"
            >
              <Search className="w-4 h-4" />
              <kbd className="hidden xl:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-[#1A1917] border border-[#2A2826] rounded text-[#78716C] group-hover:text-[#A8A29E]">
                {isMac ? <Command className="h-2.5 w-2.5" /> : 'Ctrl'}
                <span>K</span>
              </kbd>
            </button>

            {isSignedIn ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="whitespace-nowrap border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
              >
                <Link href="/auth/redirect">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Portal
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="whitespace-nowrap border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
              >
                <Link href="/login">
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Login
                </Link>
              </Button>
            )}

            <Button
              asChild
              size="sm"
              className="whitespace-nowrap bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold"
            >
              <Link href="/book">Book a Call</Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-2 text-[#FAFAFA] hover:bg-[#1A1917] rounded-lg transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isMobileOpen}
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden bg-[#09090B] border-t border-[#2A2826]"
            >
              <div className="py-4 px-2 space-y-4 max-h-[80vh] overflow-y-auto">
                {(['PRIMARY', 'RESOURCES', 'COMPANY'] as const).map((sec) => (
                  <div key={sec}>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#57534E] px-4 mb-1">
                      {sec === 'PRIMARY' ? 'Explore' : sec.charAt(0) + sec.slice(1).toLowerCase()}
                    </p>
                    <div className="space-y-0.5">
                      {mobileFlat
                        .filter((l) => l.section === sec)
                        .map((link) => {
                          const active =
                            pathname === link.href ||
                            (link.href !== '/' &&
                              pathname.startsWith(link.href.split('#')[0] + '/'))
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              className={cn(
                                'flex items-center justify-between px-4 py-2.5 text-sm rounded-lg transition-colors',
                                active
                                  ? 'text-[#0ED3CF] bg-[#1A1917]'
                                  : 'text-[#A8A29E] hover:text-[#FAFAFA] hover:bg-[#1A1917]'
                              )}
                            >
                              <span>{link.label}</span>
                            </Link>
                          )
                        })}
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-[#2A2826] mt-3 flex items-center gap-3 px-2">
                  <Link
                    href="https://github.com/JasonTeixeira"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#A8A29E] hover:text-[#FAFAFA]"
                    aria-label="GitHub"
                  >
                    <Github className="w-5 h-5" />
                  </Link>
                  <Link
                    href="https://linkedin.com/in/jason-teixeira"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#A8A29E] hover:text-[#FAFAFA]"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </Link>
                  {isSignedIn ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
                    >
                      <Link href="/auth/redirect">
                        <LayoutDashboard className="h-4 w-4 mr-1" />
                        Portal
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
                    >
                      <Link href="/login">
                        <LogIn className="h-4 w-4 mr-1" />
                        Login
                      </Link>
                    </Button>
                  )}
                  <Button
                    asChild
                    size="sm"
                    className="ml-auto bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold"
                  >
                    <Link href="/book">Book a Call</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
