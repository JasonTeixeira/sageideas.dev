'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Home, 
  User, 
  Briefcase, 
  FolderKanban, 
  FileText,
  Mail,
  FileDown,
  Code2,
  Rocket,
  BookOpen,
  X,
  Command
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const navigate = useCallback((path: string) => {
    router.push(path)
    setIsOpen(false)
    setSearch('')
  }, [router])

  const commands: CommandItem[] = [
    {
      id: 'home',
      label: 'Home',
      description: 'Go to homepage',
      icon: <Home className="h-4 w-4" />,
      action: () => navigate('/'),
      keywords: ['homepage', 'main', 'start']
    },
    {
      id: 'about',
      label: 'About',
      description: 'Learn about me',
      icon: <User className="h-4 w-4" />,
      action: () => navigate('/about'),
      keywords: ['bio', 'background', 'story']
    },
    {
      id: 'services',
      label: 'Services',
      description: 'View my services',
      icon: <Briefcase className="h-4 w-4" />,
      action: () => navigate('/services'),
      keywords: ['consulting', 'work']
    },
    {
      id: 'how-it-works',
      label: 'How It Works',
      description: 'Visual pipelines for every service — intro chat to handoff',
      icon: <Briefcase className="h-4 w-4" />,
      action: () => navigate('/how-it-works'),
      keywords: ['pipeline', 'journey', 'process', 'flow', 'visual']
    },
    {
      id: 'projects',
      label: 'Projects',
      description: 'Browse all projects',
      icon: <FolderKanban className="h-4 w-4" />,
      action: () => navigate('/projects'),
      keywords: ['portfolio', 'work', 'apps']
    },
    {
      id: 'case-studies',
      label: 'Case Studies',
      description: 'Deep dive into projects',
      icon: <FileText className="h-4 w-4" />,
      action: () => navigate('/case-studies'),
      keywords: ['details', 'analysis', 'featured']
    },
    {
      id: 'blog',
      label: 'Blog',
      description: 'Read articles',
      icon: <BookOpen className="h-4 w-4" />,
      action: () => navigate('/blog'),
      keywords: ['articles', 'posts', 'writing']
    },
    {
      id: 'capabilities',
      label: 'Capabilities',
      description: 'What we build and how we operate',
      icon: <Code2 className="h-4 w-4" />,
      action: () => navigate('/capabilities'),
      keywords: ['platform', 'capabilities', 'infrastructure', 'cicd', 'security', 'ops']
    },
    {
      id: 'work',
      label: 'Work',
      description: 'Case studies and engagement outcomes',
      icon: <Code2 className="h-4 w-4" />,
      action: () => navigate('/work'),
      keywords: ['work', 'case', 'studies', 'projects', 'evidence']
    },
    {
      id: 'founder',
      label: 'Founder',
      description: 'Background, capabilities, certifications',
      icon: <Code2 className="h-4 w-4" />,
      action: () => navigate('/founder'),
      keywords: ['founder', 'about', 'background', 'capabilities', 'jason']
    },
    {
      id: 'pov',
      label: 'POV',
      description: 'The 30-second rollback rule and how the studio thinks',
      icon: <Code2 className="h-4 w-4" />,
      action: () => navigate('/pov'),
      keywords: ['pov', 'opinion', 'manifesto', 'rollback', 'philosophy', 'essay']
    },
    {
      id: 'stack',
      label: 'Tech Stack',
      description: 'Technologies I use',
      icon: <Code2 className="h-4 w-4" />,
      action: () => navigate('/stack'),
      keywords: ['technologies', 'tools', 'skills']
    },
    {
      id: 'contact',
      label: 'Contact',
      description: 'Get in touch',
      icon: <Mail className="h-4 w-4" />,
      action: () => navigate('/contact'),
      keywords: ['email', 'message', 'reach']
    },
    {
      id: 'pricing',
      label: 'Pricing',
      description: 'Productized tiers and care retainers',
      icon: <FileDown className="h-4 w-4" />,
      action: () => navigate('/pricing'),
      keywords: ['pricing', 'tiers', 'cost', 'rates']
    },
    {
      id: 'start',
      label: 'Start a Project',
      description: 'Begin a new project together',
      icon: <Rocket className="h-4 w-4" />,
      action: () => navigate('/contact'),
      keywords: ['begin', 'new', 'project', 'engagement']
    },
  ]

  const filteredCommands = commands.filter((command) => {
    const searchLower = search.toLowerCase()
    return (
      command.label.toLowerCase().includes(searchLower) ||
      command.description?.toLowerCase().includes(searchLower) ||
      command.keywords?.some(k => k.toLowerCase().includes(searchLower))
    )
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      
      // Close with Escape
      if (e.key === 'Escape') {
        setIsOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        )
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        )
      }
      if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault()
        filteredCommands[selectedIndex].action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex])

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="command-palette-backdrop"
            onClick={() => {
              setIsOpen(false)
              setSearch('')
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[101] px-4"
          >
            <div className="bg-[#18181B] border border-[#3F3F46] rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 border-b border-[#27272A]">
                <Search className="h-5 w-5 text-[#71717A]" />
                <input
                  type="text"
                  placeholder="Search commands..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 py-4 bg-transparent text-[#FAFAFA] placeholder:text-[#71717A] outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className="p-1 text-[#71717A] hover:text-[#FAFAFA] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Commands List */}
              <div className="max-h-80 overflow-y-auto p-2">
                {filteredCommands.length > 0 ? (
                  filteredCommands.map((command, index) => (
                    <button
                      key={command.id}
                      onClick={command.action}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors',
                        selectedIndex === index
                          ? 'bg-[#27272A] text-[#FAFAFA]'
                          : 'text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]'
                      )}
                    >
                      <span className={cn(
                        'p-2 rounded-lg',
                        selectedIndex === index ? 'bg-[#06B6D4]/20 text-[#06B6D4]' : 'bg-[#27272A]'
                      )}>
                        {command.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{command.label}</div>
                        {command.description && (
                          <div className="text-sm text-[#71717A] truncate">
                            {command.description}
                          </div>
                        )}
                      </div>
                      {selectedIndex === index && (
                        <span className="text-xs text-[#71717A] px-2 py-1 bg-[#3F3F46] rounded">
                          Enter
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-[#71717A]">
                    No commands found
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#27272A] text-xs text-[#71717A]">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[#27272A] rounded text-[#A1A1AA]">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[#27272A] rounded text-[#A1A1AA]">↵</kbd>
                    Select
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-[#27272A] rounded text-[#A1A1AA]">Esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Keyboard shortcut hint for navigation
export function CommandPaletteHint() {
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  return (
    <button
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          metaKey: true,
          ctrlKey: true,
          bubbles: true
        })
        document.dispatchEvent(event)
      }}
      className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-[#71717A] bg-[#18181B] border border-[#27272A] rounded-lg hover:border-[#3F3F46] hover:text-[#A1A1AA] transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Search</span>
      <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-[#27272A] rounded">
        {isMac ? <Command className="h-3 w-3" /> : 'Ctrl'}
        <span>K</span>
      </kbd>
    </button>
  )
}
