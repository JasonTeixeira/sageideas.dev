'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { markLessonComplete } from '@/app/academy/_actions/progress'
import { verifyLab } from '@/app/academy/_actions/evidence'
import { useSound } from '@/hooks/useSound'
import { Icon } from '@/components/academy/ui/Icon'
import { loadRuntime, normalizeLanguage, RUNTIME_LABEL, RUNTIME_FILE, type LabRuntime } from './runtimes'
import { SageMark } from '@/components/academy/brand/SageMark'
import styles from './lab.module.css'

type Status = 'loading' | 'ready' | 'running' | 'error'

export function LabRunner({
  title,
  summary,
  starter,
  stdin,
  language,
  hasCheck,
  backHref,
  courseSlug,
  lessonSlug,
}: {
  title: string
  summary: string
  starter: string
  stdin?: string
  language?: string
  hasCheck?: boolean
  backHref: string
  courseSlug: string
  lessonSlug: string
}) {
  const lang = normalizeLanguage(language)
  const [code, setCode] = useState(starter)
  const [output, setOutput] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  // `passed`/`verified` are driven ONLY by the server verdict — never a client match.
  const [passed, setPassed] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [completing, startComplete] = useTransition()
  const { play } = useSound()
  const runtimeRef = useRef<LabRuntime | null>(null)
  const gutterRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      try {
        const rt = await loadRuntime(lang)
        if (cancelled) return
        runtimeRef.current = rt
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    boot()
    return () => { cancelled = true }
  }, [lang])

  const run = async () => {
    const rt = runtimeRef.current
    if (!rt || status === 'running') return
    setStatus('running')
    let buf = ''
    try {
      buf = await rt.run(code, stdin)
      setOutput(buf.length ? buf : '(ran with no output)')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setOutput(msg)
      buf = ''
    }
    // Capture the stdout for server-side verification. Running fresh code
    // invalidates any prior verdict — the learner must re-verify.
    setPassed(false)
    setVerificationMessage(null)
    setStatus('ready')
  }

  // Server-authoritative verdict: submit source code, never learner-controlled
  // stdout. The isolated evaluator executes it against private cases.
  const verify = async () => {
    if (verifying || passed) return
    setVerifying(true)
    try {
      const result = await verifyLab(courseSlug, lessonSlug, code)
      const { verified } = result
      setPassed(verified)
      setVerificationMessage(
        verified
          ? 'Private cases passed in the controlled evaluator.'
          : result.reason === 'private_spec_missing'
            ? 'Practice run saved locally. This lab has no trusted private test pack yet, so it cannot prove mastery.'
            : result.reason === 'rate_limited'
              ? 'Too many checks. Wait a minute and try again.'
              : 'Practice feedback only — no mastery evidence was recorded.',
      )
      if (verified) {
        // Subtle mobile haptic + opt-in success tone on the primary completion
        // moment. Both are no-ops under reduced-motion / when unsupported.
        navigator.vibrate?.(15)
        play('success')
      }
    } finally {
      setVerifying(false)
    }
  }

  const complete = () => {
    startComplete(async () => {
      // verifyLab already recorded the verified-lab evidence; just mark the
      // lesson done. userId is derived server-side from the session.
      const res = await markLessonComplete(courseSlug, lessonSlug)
      if (res.ok) setCompleted(true)
    })
  }

  const runnable = status === 'ready'

  // ⌘/Ctrl + Enter runs the code from inside the editor.
  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); run() }
  }

  // Purely-visual line-number gutter — derived from the real editor content, so it
  // stays in sync as the learner types. No syntax engine, no editor lib.
  const lineCount = useMemo(() => Math.max(1, code.split('\n').length), [code])

  // Keep the gutter's scroll position locked to the textarea's.
  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop
  }

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Link href={backHref} className={styles.back}>
          <SageMark size={24} radius={7} />
          <Icon name="arrow-left" size={13} /> lesson
        </Link>
        <span className={styles.crumb}>
          <span className={styles.crumbLab}>Lab · {title}</span>
          <span className={styles.crumbDot} aria-hidden="true">·</span>
          {RUNTIME_LABEL[lang]} (in-browser)
        </span>
        <span className={styles.spacer} />
        {/* Honest static chip: reflects the real ready state, not a fabricated count. */}
        <span className={styles.chip} data-ready={status === 'ready' || undefined}>
          {status === 'ready' ? 'starter loaded' : status === 'error' ? 'runtime error' : `loading ${RUNTIME_LABEL[lang]}…`}
        </span>
        <span className={styles.kbdHint} aria-hidden="true"><kbd>⌘</kbd><kbd>↵</kbd> run</span>
      </header>

      <div className={styles.grid}>
        {/* ── LEFT: editor + docked terminal output ── */}
        <section className={styles.editorPane} aria-label="Code editor">
          <div className={styles.paneBar}>
            <span className={styles.fileName}>{RUNTIME_FILE[lang]}</span>
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.reset}
                onClick={() => { setCode(starter); setOutput(null); setPassed(false); setVerificationMessage(null) }}
              >
                <Icon name="refresh" size={13} /> Reset
              </button>
              <button
                type="button"
                className={styles.run}
                onClick={run}
                disabled={!runnable}
                aria-keyshortcuts="Meta+Enter Control+Enter"
              >
                {status === 'loading' ? `Loading ${RUNTIME_LABEL[lang]}…`
                  : status === 'running' ? 'Running…'
                  : (<><Icon name="play" size={13} /> Run</>)}
              </button>
            </div>
          </div>

          <div className={styles.editorBody}>
            <div className={styles.gutter} ref={gutterRef} aria-hidden="true">
              {Array.from({ length: lineCount }, (_, i) => (
                <span key={i} className={styles.lineNo}>{i + 1}</span>
              ))}
            </div>
            <textarea
              className={styles.editor}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={onEditorKeyDown}
              onScroll={syncScroll}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              aria-label={`${RUNTIME_LABEL[lang]} code`}
            />
          </div>

          {/* Docked terminal OUTPUT strip — real run output, empty state, or load error. */}
          <div className={styles.terminal} aria-label="Output">
            <pre className={styles.output} data-state={status === 'error' ? 'error' : output != null ? 'ran' : 'empty'} role="status" aria-live="polite">
              {status === 'error'
                ? `$ could not load the ${RUNTIME_LABEL[lang]} runtime — check your connection and reload.`
                : output != null
                ? output
                : status === 'loading'
                ? `$ booting the ${RUNTIME_LABEL[lang]} runtime…`
                : '$ awaiting first run — press Run to execute your code.'}
            </pre>
          </div>
        </section>

        {/* ── RIGHT: the brief + the honest single check ── */}
        <section className={styles.briefPane} aria-label="Brief">
          <div className={styles.brief}>
            <p className={styles.kicker}>The brief</p>
            <h1 className={styles.briefTitle}>{title}</h1>
            <p className={styles.briefBody}>{summary}</p>
          </div>

          {hasCheck ? (
            <div className={styles.check} data-passed={passed || undefined} role="status" aria-live="polite">
              <p className={styles.checkKicker}>The check — can&rsquo;t be faked</p>
              {/* ONE real criterion — a lab holds exactly one server-side check. */}
              <div className={styles.checkRow}>
                <span className={styles.checkMark} data-met={passed || undefined} aria-hidden="true">
                  {passed ? <Icon name="check" size={14} /> : '○'}
                </span>
                <span className={styles.checkText}>
                  {passed
                    ? 'Solution verified by private tests in the controlled evaluator.'
                    : verificationMessage ?? 'Run your code, then check it against private server-owned tests.'}
                </span>
              </div>

              <div className={styles.checkActions}>
                {passed ? (
                  completed ? (
                    <span className={styles.cpDone}>
                      <Icon name="check" size={14} /> Saved to your progress.{' '}
                      <Link href={backHref} className={styles.cpLink}>Back to lesson <Icon name="arrow-right" size={13} /></Link>
                    </span>
                  ) : (
                    <button type="button" className={styles.cpComplete} onClick={complete} disabled={completing}>
                      {completing ? 'Saving…' : (<>Mark lesson complete <Icon name="arrow-right" size={13} /></>)}
                    </button>
                  )
                ) : (
                  <button type="button" className={styles.cpCheck} onClick={verify} disabled={verifying || status !== 'ready'}>
                    {verifying ? 'Checking…' : 'Check my solution'}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
