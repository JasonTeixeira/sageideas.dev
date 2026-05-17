'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ArrowRight } from 'lucide-react'

interface TerminalLine {
  text: string
  type: 'command' | 'output' | 'success' | 'info' | 'blank'
}

const terminalLines: TerminalLine[] = [
  { text: '$ sage status --all', type: 'command' },
  { text: '', type: 'blank' },
  { text: '▸ Nexural Platform', type: 'info' },
  { text: '185 database tables migrated', type: 'success' },
  { text: '69 API endpoints verified', type: 'success' },
  { text: '61 test suites passing', type: 'success' },
  { text: 'Stripe billing live', type: 'success' },
  { text: '', type: 'blank' },
  { text: '▸ Testing Frameworks', type: 'info' },
  { text: '13 frameworks built (API, E2E, mobile, security, BDD...)', type: 'success' },
  { text: '500+ tests in production', type: 'success' },
  { text: '82% pipeline time reduction', type: 'success' },
  { text: '', type: 'blank' },
  { text: '▸ AlphaStream ML Engine', type: 'info' },
  { text: '200+ indicators | 5 ML models | real-time signals', type: 'success' },
  { text: '', type: 'blank' },
  { text: '▸ Cloud Infrastructure', type: 'info' },
  { text: 'AWS Landing Zone + Terraform + CI gates deployed', type: 'success' },
  { text: '', type: 'blank' },
  { text: 'All systems operational. Ready for deployment.', type: 'output' },
]

export function TypingTerminal() {
  const [visibleLines, setVisibleLines] = useState<number>(0)
  const [typedText, setTypedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)
  const [showCursor, setShowCursor] = useState(true)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const typeCommand = async () => {
      const command = terminalLines[0].text
      for (let i = 0; i <= command.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 35))
        setTypedText(command.slice(0, i))
      }
      setIsTyping(false)

      // Show output lines with varied timing
      for (let i = 1; i < terminalLines.length; i++) {
        const line = terminalLines[i]
        const delay = line.type === 'blank' ? 150 : line.type === 'info' ? 350 : 250
        await new Promise(resolve => setTimeout(resolve, delay))
        setVisibleLines(i)
      }
    }

    const timer = setTimeout(typeCommand, 800)
    return () => clearTimeout(timer)
  }, [])

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="w-full bg-[#1A1917] border border-[#2A2826] rounded-2xl overflow-hidden shadow-2xl">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#09090B] border-b border-[#2A2826]">
        <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
        <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
        <div className="w-3 h-3 rounded-full bg-[#10B981]" />
        <span className="ml-2 text-xs text-[#78716C] font-mono">sage@sageideas ~ /portfolio</span>
      </div>

      {/* Terminal Content */}
      <div className="p-5 font-mono text-sm space-y-1.5 min-h-[380px]">
        {/* Command Line */}
        <div className="text-[#78716C]">
          <span className="text-[#0ED3CF]">$</span>{' '}
          <span className="text-[#A8A29E]">
            {isTyping ? typedText : terminalLines[0].text.slice(2)}
          </span>
          {isTyping && (
            <span className={`inline-block w-2 h-4 bg-[#0ED3CF] ml-0.5 ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
          )}
        </div>

        {/* Output Lines */}
        <AnimatePresence>
          {!isTyping && (
            <div className="space-y-1.5">
              {terminalLines.slice(1, visibleLines + 1).map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {line.type === 'blank' ? (
                    <div className="h-2" />
                  ) : line.type === 'info' ? (
                    <div className="flex items-center gap-2 pt-1">
                      <ArrowRight className="h-3 w-3 text-[#E85D3A]" />
                      <span className="text-[#FAFAFA] font-semibold">{line.text.slice(2)}</span>
                    </div>
                  ) : line.type === 'success' ? (
                    <div className="flex items-center gap-2 pl-5">
                      <Check className="h-3.5 w-3.5 text-[#10B981] flex-shrink-0" />
                      <span className="text-[#A8A29E]">{line.text}</span>
                    </div>
                  ) : (
                    <div className="pt-1 text-[#10B981] font-semibold">
                      {line.text}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Final cursor */}
        {visibleLines >= terminalLines.length - 1 && !isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="pt-2 text-[#78716C]"
          >
            <span className="text-[#0ED3CF]">$</span>{' '}
            <span className={`inline-block w-2 h-4 bg-[#0ED3CF] ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
          </motion.div>
        )}
      </div>
    </div>
  )
}
