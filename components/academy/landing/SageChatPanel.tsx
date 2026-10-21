'use client'

import { useRef, useState, type FormEvent } from 'react'
import { captureAcademyEvent } from './academyAnalytics'

type Message = { who: 'bot' | 'me'; text: string }

const REPLIES: [RegExp, string][] = [
  [/start|begin|first|which course|donde|empez|开始|शुरू/i, 'Start with Engineering Judgment (Course 00). It’s the loop every other course runs on — and in about 25 minutes you’ll ship your first artifact. No prerequisites.'],
  [/proof|prove|artifact|certificat|prueba|证明|प्रमाण/i, 'A proof is a check a skeptic can run — a passing eval, a decision memo, a repaired case. Every course ends in one, and they stack into a ledger you can share with anyone.'],
  [/pric|cost|\$|pay|precio|价格|मूल्य|tarif/i, 'One membership: $25/month or $250/year, every course as it ships — labs, proofs, recall, leagues, certificates. Every plan starts with a 7-day free trial, cancel anytime.'],
  [/refund|guarantee|cancel|garant/i, 'No lock-in: cancel anytime and you keep access through the end of the period you paid for. Your ledger and certificates stay yours. Start with a 7-day free trial, and you can read a full lesson free before you pay.'],
  [/interview|mock|behavioral|system design round/i, 'Interview Mastery is the add-on: unlimited voice-first mocks scored against a consistent bar, +$39/mo ($24/mo annual) on top of membership. The /interview page has the full picture.'],
  [/human|person|contact|email|talk|support|help/i, 'A real person reads everything at hello@sageideas.dev — usually same-day. For account things, that’s the fastest path.'],
  [/^(hi|hey|hello|hola|olá|salut|你好|नमस्ते)\b/i, 'Hey! Happy you’re here. What can I help you figure out — courses, proofs, or pricing?'],
  [/hard|difficult|beginner|new to|junior/i, 'It meets you where you are — the pretest in each lesson calibrates, and the starter labs fail on purpose so the first win is guaranteed. Plenty of career-switchers here.'],
  [/time|hours|week|long/i, 'Most people do one lesson (~30 min) a few times a week, plus a 6-minute recall queue. A course is a 4–6 week sprint at that pace.'],
]
const FALLBACK = 'Good question — I don’t want to guess at that one. Send it to hello@sageideas.dev and a human will answer today. Meanwhile: courses, proofs, or pricing — I know those cold.'
const GREETING = 'Hey — I’m Sprout. Questions about courses, proofs, or where to start? Ask away. A human reads everything too.'
const CHIPS = ['Where do I start?', 'What’s a proof?', 'How does pricing work?']
const mono = { fontFamily: 'var(--font-mono), monospace' } as const

export function SageChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ who: 'bot', text: GREETING }])
  const [input, setInput] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)

  function send(raw: string) {
    const text = raw.trim()
    if (!text) return
    setInput('')
    const hit = REPLIES.find(([pattern]) => pattern.test(text))
    setMessages((current) => [...current, { who: 'me', text }, { who: 'bot', text: hit ? hit[1] : FALLBACK }])
    void captureAcademyEvent(hit ? 'chat_message' : 'chat_unanswered', {
      matchedTopic: hit ? REPLIES.indexOf(hit) : null,
      questionLength: text.length,
      page: window.location.pathname,
    })
    requestAnimationFrame(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send(input)
  }

  return (
    <div
      id="sprout-chat-panel"
      role="dialog"
      aria-label="Sage helper"
      style={{ position: 'fixed', right: 20, bottom: 86, width: 'min(330px, calc(100vw - 40px))', maxHeight: 'min(480px, calc(100vh - 120px))', background: '#141418', border: '1px solid #2A2A33', borderRadius: 16, boxShadow: '0 32px 80px -24px rgba(0,0,0,0.9)', zIndex: 95, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'var(--font-sans), sans-serif' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #1E1E24' }}>
        <span aria-hidden style={{ width: 26, height: 26, borderRadius: 8, background: '#3D5AFE', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, flexShrink: 0 }}>◆</span>
        <span>
          <b style={{ fontSize: 13.5, color: '#F2EFE9', fontWeight: 700, display: 'block' }}>Sprout</b>
          <small style={{ ...mono, fontSize: 9, color: '#18B663', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: '#18B663' }} />
            usually replies in seconds
          </small>
        </span>
        <button type="button" onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9598A2', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>×</button>
      </div>
      <div ref={messagesRef} aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 180 }}>
        {messages.map((message, index) => (
          <div key={`${message.who}-${index}`} style={{ maxWidth: '85%', padding: '10px 14px', fontSize: 13.5, lineHeight: 1.55, alignSelf: message.who === 'me' ? 'flex-end' : 'flex-start', background: message.who === 'me' ? '#3D5AFE' : '#1A1A20', color: message.who === 'me' ? '#fff' : '#D6D6DE', borderRadius: message.who === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }}>
            {message.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '0 16px 12px' }}>
        {CHIPS.map((chip) => (
          <button type="button" key={chip} onClick={() => send(chip)} style={{ border: '1px solid #2A2A33', background: 'transparent', borderRadius: 16, padding: '7px 13px', fontSize: 12, color: '#B6B6C0', cursor: 'pointer', fontFamily: 'inherit' }}>{chip}</button>
        ))}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #1E1E24' }}>
        <input value={input} onChange={(event) => setInput(event.target.value)} aria-label="Message for Sprout" placeholder="Ask me anything…" style={{ flex: 1, background: '#0F0F13', border: '1px solid #2A2A33', borderRadius: 10, padding: '10px 13px', fontSize: 13.5, color: '#F2EFE9', fontFamily: 'inherit', outline: 'none', minWidth: 0 }} />
        <button type="submit" aria-label="Send message" style={{ background: '#3D5AFE', color: '#fff', border: 'none', borderRadius: 10, padding: '0 15px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>→</button>
      </form>
    </div>
  )
}
