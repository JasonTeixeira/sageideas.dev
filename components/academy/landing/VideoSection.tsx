'use client'

import { useState } from 'react'
import { useT } from '@/components/i18n/locale-provider'

/**
 * "The ideas in motion" — the three AI-engineering concept explainers (RAG,
 * Evals, Agents), narrated in the founder's voice. Tabbed single-player;
 * videos are preload="none" behind a poster so nothing downloads until a
 * visitor actually presses play (keeps the landing light).
 */

const INK = '#F2EFE9'
const LINE = '#1E1E24'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

type Clip = { key: string; tab: string; dur: string; title: string; blurb: string; src: string; poster: string; captions: string }

const CLIPS: Clip[] = [
  {
    key: 'founder',
    tab: 'Welcome',
    dur: '0:45',
    title: 'A note from the founder',
    blurb: 'Why Sage Academy exists — judgment over syntax, proof over paper — in the founder’s own voice. Under a minute, no fluff.',
    src: '/video/academy/sa-founder.mp4',
    poster: '/video/academy/sa-founder.jpg',
    captions: '/video/academy/sa-founder.vtt',
  },
  {
    key: 'rag',
    tab: 'RAG',
    dur: '0:47',
    title: 'RAG — how AI reads your data',
    blurb: 'Retrieval-augmented generation: give a model the right context on demand, so it answers from your sources instead of guessing.',
    src: '/video/academy/sa-rag.mp4',
    poster: '/video/academy/sa-rag.jpg',
    captions: '/video/academy/sa-rag.vtt',
  },
  {
    key: 'evals',
    tab: 'Evals',
    dur: '0:45',
    title: 'Evals — how you know it works',
    blurb: 'Stop vibe-checking. Score AI output against a rubric and a golden set, so a regression fails loudly instead of shipping quietly.',
    src: '/video/academy/sa-evals.mp4',
    poster: '/video/academy/sa-evals.jpg',
    captions: '/video/academy/sa-evals.vtt',
  },
  {
    key: 'agents',
    tab: 'Agents',
    dur: '0:52',
    title: 'Agents — how AI takes action',
    blurb: 'The think → act → observe loop, plus the human-approval guardrail that turns a chatbot into something that safely does the work.',
    src: '/video/academy/sa-agents.mp4',
    poster: '/video/academy/sa-agents.jpg',
    captions: '/video/academy/sa-agents.vtt',
  },
]

export function VideoSection() {
  const t = useT()
  const [active, setActive] = useState(0)
  const clip = CLIPS[active]

  return (
    <section id="watch" style={{ borderTop: `1px solid ${LINE}` }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF' }}>{t('The ideas in motion')}</div>
          <h2 style={{ ...serif, margin: '14px 0 0', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 48px)', lineHeight: 1.04, letterSpacing: '-0.025em', textWrap: 'balance' }}>
            {t('The concepts behind modern AI —')} <em style={{ fontStyle: 'italic', color: '#8FA0FF' }}>{t('explained')}</em>{t(', not name-dropped.')}
          </h2>
          <p style={{ margin: '18px 0 0', color: '#9C9CA6', fontSize: 16.5, maxWidth: '58ch', textWrap: 'pretty' }}>
            {t("The same clarity every lesson is built for — the ideas you'll actually use, each explained in under a minute.")}
          </p>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label={t('Concept explainers')} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 36 }}>
          {CLIPS.map((c, i) => {
            const on = i === active
            return (
              <button
                key={c.key}
                role="tab"
                id={`watch-tab-${c.key}`}
                aria-selected={on}
                aria-controls="watch-panel"
                onClick={() => setActive(i)}
                style={{
                  ...mono,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  border: `1px solid ${on ? 'rgba(61,90,254,0.5)' : LINE}`,
                  background: on ? 'rgba(61,90,254,0.08)' : 'transparent',
                  color: on ? INK : '#9598A2',
                  fontSize: 13,
                  fontWeight: on ? 600 : 400,
                  padding: '10px 18px',
                  borderRadius: 22,
                  cursor: 'pointer',
                  transition: 'border-color 160ms ease, background 160ms ease, color 160ms ease',
                }}
              >
                {t(c.tab)}
                <span style={{ fontSize: 10.5, color: on ? '#8FA0FF' : '#5A5A64' }}>{c.dur}</span>
              </button>
            )
          })}
        </div>

        <div role="tabpanel" id="watch-panel" aria-labelledby={`watch-tab-${clip.key}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(24px, 4vw, 48px)', alignItems: 'center', marginTop: 24 }}>
          <figure style={{ margin: 0, minWidth: 0, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', background: '#0B0B0E', boxShadow: '0 32px 80px -32px rgba(0,0,0,0.85)' }}>
            <video
              key={clip.key}
              controls
              preload="none"
              aria-label={`${t(clip.title)} — narrated`}
              poster={clip.poster}
              style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', background: '#0B0B0E' }}
            >
              <source src={clip.src} type="video/mp4" />
              <track kind="captions" srcLang="en" label="English" src={clip.captions} default />
            </video>
          </figure>

          <div style={{ minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#8FA0FF' }}>{t(clip.tab)} · {clip.dur}</div>
            <h3 style={{ ...serif, margin: '12px 0 0', fontWeight: 600, fontSize: 'clamp(22px, 2.4vw, 30px)', lineHeight: 1.15, letterSpacing: '-0.02em', color: INK }}>{t(clip.title)}</h3>
            <p style={{ margin: '14px 0 0', color: '#9C9CA6', fontSize: 15.5, lineHeight: 1.6, maxWidth: '46ch' }}>{t(clip.blurb)}</p>
            <div style={{ ...mono, fontSize: 11, color: '#5A5A64', marginTop: 20 }}>{t('narrated by the founder · no faces, no fluff')}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
