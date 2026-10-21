'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { loadRuntime, type LabRuntime } from '@/components/academy/lab/runtimes'
import { useT } from '@/components/i18n/locale-provider'

/**
 * The hero's "prove it live" moment: a real in-browser Python runtime a visitor
 * can run with no signup. The starter is deliberately wrong (returns the sum,
 * not the mean); running it fails the expected output, and fixing one line
 * turns the check green.
 *
 * Honesty: this is a marketing taster — the pass/fail is a CLIENT-side stdout
 * comparison, and we say so. In a real lesson the same check is re-run
 * server-side (see verifyLab), so a lesson pass is one you can actually prove.
 * Nothing here is recorded or awarded.
 *
 * Performance: Pyodide (several MB) loads only when the visitor clicks Run, not
 * on initial paint — the static code preview renders instantly.
 */

const STARTER = `def average(values):
    # BUG: this returns the sum, not the average — fix it
    return sum(values)

print(average([10, 20, 30]))
`

const EXPECTED = '20.0'

const C = {
  ink: '#F2EFE9',
  dim: '#9598A2',
  line: '#1E1E24',
  panel: '#111115',
  code: '#0B0B0E',
  accent: '#3D5AFE',
  accentInk: '#8FA0FF',
  green: '#18B663',
  red: '#E5484D',
} as const

const mono = { fontFamily: 'var(--font-mono), monospace' } as const

type Phase = 'idle' | 'booting' | 'ready' | 'running'

export function HeroLab() {
  const t = useT()
  const [code, setCode] = useState(STARTER)
  const [phase, setPhase] = useState<Phase>('idle')
  const [output, setOutput] = useState<string | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const runtimeRef = useRef<LabRuntime | null>(null)

  const run = async () => {
    if (phase === 'booting' || phase === 'running') return
    // First run: boot the runtime (Pyodide) lazily.
    if (!runtimeRef.current) {
      setPhase('booting')
      try {
        runtimeRef.current = await loadRuntime('python')
      } catch {
        setPhase('idle')
        setOutput(t('Could not start the runtime. Refresh and try again.'))
        return
      }
    }
    setPhase('running')
    let buf = ''
    try {
      buf = await runtimeRef.current.run(code)
    } catch (e: unknown) {
      buf = e instanceof Error ? e.message : String(e)
    }
    const clean = buf.trim()
    setOutput(clean.length ? clean : t('(ran with no output)'))
    setPassed(clean === EXPECTED)
    setPhase('ready')
  }

  const reset = () => {
    setCode(STARTER)
    setOutput(null)
    setPassed(null)
  }

  const statusLabel =
    phase === 'booting'
      ? t('starting python…')
      : phase === 'running'
        ? t('running…')
        : passed === true
          ? `✓ ${t('check passed')}`
          : passed === false
            ? `✗ ${t('check failed')}`
            : t('ready to run')
  const statusColor = passed === true ? C.green : passed === false ? C.red : C.dim

  return (
    <figure
      style={{
        margin: 0,
        minWidth: 0,
        border: `1px solid ${passed === true ? 'rgba(24,182,99,0.45)' : C.line}`,
        borderRadius: 16,
        background: C.panel,
        overflow: 'hidden',
        boxShadow: passed === true ? '0 32px 80px -32px rgba(0,0,0,0.85), 0 0 60px -30px rgba(24,182,99,0.5)' : '0 32px 80px -32px rgba(0,0,0,0.85)',
        transition: 'box-shadow 300ms ease, border-color 300ms ease',
      }}
    >
      <figcaption
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 18px',
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <span style={{ ...mono, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.dim }}>
          {t('In-browser Python · no signup')}
        </span>
        <span style={{ ...mono, fontSize: 10.5, color: statusColor }}>{statusLabel}</span>
      </figcaption>

      <textarea
        value={code}
        onChange={(e) => {
          setCode(e.target.value)
          if (passed !== null) setPassed(null)
        }}
        spellCheck={false}
        aria-label={t('Editable Python — fix the average function')}
        style={{
          ...mono,
          display: 'block',
          width: '100%',
          minHeight: 148,
          resize: 'vertical',
          border: 'none',
          outline: 'none',
          background: C.code,
          color: '#B6B6C0',
          padding: '16px 20px',
          fontSize: 13,
          lineHeight: 1.7,
          tabSize: 4,
        }}
      />

      <div style={{ padding: '13px 18px', borderTop: `1px solid ${C.line}`, background: C.code }}>
        {output !== null ? (
          <div style={{ ...mono, fontSize: 12.5, lineHeight: 1.6 }}>
            {passed === true ? (
              <span style={{ color: C.green }}>✓ {t('output is')} {EXPECTED} {t('— the check passes.')}</span>
            ) : (
              <span style={{ color: C.red }}>
                ✗ {t('got')} <b style={{ color: C.ink }}>{output}</b> · {t('expected')} {EXPECTED}
              </span>
            )}
          </div>
        ) : (
          <div style={{ ...mono, fontSize: 12.5, color: C.dim }}>{t('Run it. It fails. Fix line 3, run again — watch it go green.')}</div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '13px 18px',
          borderTop: `1px solid ${C.line}`,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={run}
          disabled={phase === 'booting' || phase === 'running'}
          style={{
            ...mono,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: C.accent,
            color: '#fff',
            border: 'none',
            fontSize: 12.5,
            fontWeight: 600,
            padding: '9px 18px',
            borderRadius: 18,
            cursor: phase === 'booting' || phase === 'running' ? 'wait' : 'pointer',
            opacity: phase === 'booting' || phase === 'running' ? 0.7 : 1,
          }}
        >
          {phase === 'booting' ? t('starting…') : phase === 'running' ? t('running…') : `▸ ${t('Run')}`}
        </button>
        {passed !== null ? (
          <button
            type="button"
            onClick={reset}
            style={{ ...mono, background: 'transparent', border: `1px solid ${C.line}`, color: C.dim, fontSize: 11.5, padding: '8px 14px', borderRadius: 18, cursor: 'pointer' }}
          >
            {t('reset')}
          </button>
        ) : null}

        {passed === true ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 11, color: C.green }}>{t("that's a lesson, minus the signup.")}</span>
            <Link
              href="/academy/signup"
              style={{ ...mono, fontSize: 11.5, fontWeight: 600, color: C.accentInk, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              {t('start free')} →
            </Link>
          </span>
        ) : (
          <span style={{ ...mono, fontSize: 10.5, color: C.dim, marginLeft: 'auto' }}>
            {t('real runtime · in a lesson this check is server-verified')}
          </span>
        )}
      </div>
    </figure>
  )
}
