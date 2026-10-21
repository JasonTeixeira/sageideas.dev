'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { saveLesson } from './_actions'
import { INTENSITIES, loopStep, type SprintIntensity } from '@/lib/academy/engine'
import { defaultBlock, mergeScaffold, checkCompleteness, SECTION_TYPES, CONTENT_TYPES } from '@/lib/academy/scaffold'
import { Icon } from '@/components/academy/ui/Icon'
import { SageMark } from '@/components/academy/brand/SageMark'
import styles from './studio.module.css'

type Block = Record<string, any> & { type: string }

const INTENSITY_KEYS: SprintIntensity[] = ['micro', 'standard', 'deep', 'capstone']

/** Human label for a block in the arc rail — loop label first, else the raw type. */
function blockLabel(type: string): string {
  return loopStep(type)?.label ?? type
}

/**
 * Real, content-derived status for the arc rail. No fabricated state — we read
 * the block's own fields. 'empty' = nothing authored yet, 'done' = has content.
 */
function blockState(b: Block): 'done' | 'empty' {
  const filled = Object.entries(b).some(([k, v]) => {
    if (k === 'type' || k === '_id' || k === 'tone' || k === 'language' || k === 'intensity' || k === 'time') return false
    if (typeof v === 'string') return v.trim().length > 0
    if (Array.isArray(v)) return v.some((x) => (typeof x === 'string' ? x.trim().length > 0 : Boolean(x)))
    if (v && typeof v === 'object') return Object.values(v).some((x) => (typeof x === 'string' ? x.trim().length > 0 : Boolean(x)))
    return false
  })
  return filled ? 'done' : 'empty'
}

const STATUS_LABEL: Record<'done' | 'empty', string> = { done: '✓', empty: 'empty' }

/** Approx word count for a block's primary text field — powers the arc word meter. */
function blockWordCount(b: Block): number {
  const text = [b.text, b.outcome, b.prompt, b.intro, b.question, b.summary, b.guidance]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .trim()
  return text ? text.split(/\s+/).length : 0
}

export function LessonEditor({
  courseSlug,
  initial,
  isNew,
}: {
  courseSlug: string
  initial: any
  isNew: boolean
}) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>(initial.slug ?? '')
  const [title, setTitle] = useState<string>(initial.title ?? '')
  const [eyebrow, setEyebrow] = useState<string>(initial.eyebrow ?? '')
  const [moduleTitle, setModuleTitle] = useState<string>(initial.module_title ?? 'Module 1')
  const [moduleSort, setModuleSort] = useState<string>(String(initial.module_sort ?? 0))
  const [sort, setSort] = useState<string>(String(initial.sort ?? 0))
  const [estMinutes, setEstMinutes] = useState<string>(String(initial.est_minutes ?? 5))
  const [isFree, setIsFree] = useState<boolean>(initial.is_free_preview ?? false)
  const [status, setStatus] = useState<string>(initial.status ?? 'published')
  const [intensity, setIntensity] = useState<SprintIntensity>(
    INTENSITY_KEYS.includes(initial.intensity) ? initial.intensity : 'standard',
  )
  // Stable, SSR-safe block ids that travel with each block through reorder, so
  // React keys never collide on move/remove. Deterministic on first render
  // (index-based), then a counter for blocks added client-side.
  const [blocks, setBlocks] = useState<Block[]>(() =>
    (initial.blocks ?? []).map((b: Block, index: number) => (b._id ? b : { ...b, _id: `blk-${index}` })),
  )
  const idRef = useRef(blocks.length)
  const withId = (b: Block): Block => (b._id ? b : { ...b, _id: `blk-${idRef.current++}` })
  const [saving, start] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const completeness = useMemo(() => checkCompleteness(blocks as any, intensity), [blocks, intensity])

  const updateBlock = (i: number, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const addBlock = (type: string) => setBlocks((bs) => [...bs, withId(defaultBlock(type, intensity) as Block)])
  const scaffoldLoop = () => setBlocks((bs) => (mergeScaffold(bs as any, intensity) as Block[]).map(withId))
  const removeBlock = (i: number) => setBlocks((bs) => bs.filter((_, j) => j !== i))
  const moveBlock = (i: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const j = i + dir
      if (j < 0 || j >= bs.length) return bs
      const n = [...bs]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  const onSave = () => {
    setMsg(null)
    start(async () => {
      // Strip the editor-only _id before persisting — it never belongs in the DB jsonb.
      const cleanBlocks = blocks.map(({ _id, ...rest }) => rest)
      const res = await saveLesson({
        courseSlug, slug, title, eyebrow, moduleTitle,
        moduleSort: Number(moduleSort) || 0, sort: Number(sort) || 0,
        estMinutes: Number(estMinutes) || 5, isFreePreview: isFree, status, intensity, blocks: cleanBlocks,
      })
      if (res.ok) {
        setMsg({ kind: 'ok', text: 'Saved' })
        if (isNew && slug) router.push(`/academy-admin/${courseSlug}/${slug}`)
      } else {
        setMsg({ kind: 'err', text: res.error ?? 'Save failed' })
      }
    })
  }

  return (
    <div className={styles.shell}>
      <header className={styles.appBar}>
        <Link href="/academy-admin" className={styles.brand}>
          <SageMark size={24} radius={7} bg="#E0A93E" fg="#0B0B0E" glow={false} />
          <span className={styles.wordmark}>Sage Studio</span>
          <span className={styles.authorPill}>Author</span>
        </Link>
        <span className={styles.appBarCrumb}>
          editing: <Link href={`/academy-admin/${courseSlug}`}>{courseSlug}</Link> · {isNew ? 'new lesson' : slug}
        </span>
        <div className={styles.appBarRight}>
          {msg ? <span className={styles.saveState} data-kind={msg.kind}>{msg.kind === 'ok' ? `✓ ${msg.text}` : msg.text}</span> : null}
          <button type="button" className={styles.publish} onClick={onSave} disabled={saving || !slug || !title}>
            {saving ? 'Saving…' : status === 'published' ? 'Publish lesson' : 'Save lesson'}
          </button>
        </div>
      </header>

      <div className={styles.shellBody}>
      <p className={styles.kicker}>Lesson editor</p>
      <h1 className={styles.h1}>{isNew ? 'New lesson' : title || slug}</h1>

      <div className={styles.form} style={{ marginTop: '1.4rem' }}>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Logic & conditionals" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Slug</span>
            <input className={`${styles.input} ${styles.mono}`} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="logic-conditionals" disabled={!isNew} />
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Eyebrow</span>
          <input className={styles.input} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Module 1 · Lesson 03 · 8 min" />
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <span className={styles.label}>Module title</span>
            <input className={styles.input} value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Module order / Lesson order</span>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <input className={`${styles.input} ${styles.mono}`} value={moduleSort} onChange={(e) => setModuleSort(e.target.value)} inputMode="numeric" />
              <input className={`${styles.input} ${styles.mono}`} value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" />
            </div>
          </div>
        </div>
        <div className={styles.grid2}>
          <div className={styles.field}>
            <span className={styles.label}>Est. minutes</span>
            <input className={`${styles.input} ${styles.mono}`} value={estMinutes} onChange={(e) => setEstMinutes(e.target.value)} inputMode="numeric" />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Status</span>
            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="published">published</option>
              <option value="draft">draft</option>
            </select>
          </div>
        </div>
        <div className={styles.checkRow}>
          <input id="free" type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          <label htmlFor="free">Free preview (accessible without a subscription)</label>
        </div>
      </div>

      {/* Sprint structure — Sage Learning Engine V2 */}
      <div className={styles.section}>
        <h2 className={styles.h2}>Sprint structure</h2>
        <div className={styles.field}>
          <span className={styles.label}>Intensity</span>
          <div className={styles.intensityRow}>
            {INTENSITY_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                className={styles.intensityBtn}
                data-on={intensity === k}
                onClick={() => setIntensity(k)}
                title={INTENSITIES[k].blurb}
              >
                {INTENSITIES[k].label}<span className={styles.intensityTime}>{INTENSITIES[k].time}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.scaffoldRow}>
          <button type="button" className={styles.scaffoldBtn} onClick={scaffoldLoop}>
            <Icon name="plus" size={14} aria-hidden="true" /> Scaffold the {intensity} loop
          </button>
          <span
            className={styles.completeness}
            data-complete={completeness.complete}
          >
            {completeness.complete ? (
              <>
                <Icon name="check" size={13} aria-hidden="true" /> All required loop sections present
              </>
            ) : (
              `${completeness.present.length}/${completeness.required.length} required sections · missing: ${completeness.missingLabels.map((m) => m.label).join(', ')}`
            )}
          </span>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.arcHead}>
          <span className={styles.arcKicker}>The lesson arc — {blocks.length} block{blocks.length === 1 ? '' : 's'}</span>
          <span className={styles.arcHint}>reorder with ↑ ↓</span>
        </div>
        <div className={styles.blocks}>
          {blocks.map((b, i) => {
            const state = blockState(b)
            const words = blockWordCount(b)
            return (
            <div key={b._id ?? i} className={`${styles.block} ${styles.blockActive}`}>
              <div className={styles.blockBar}>
                <span className={styles.blockNum}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.blockLabel}>{blockLabel(b.type)}</span>
                <span className={styles.blockKind}>{b.type}</span>
                <span className={styles.blockStatus} data-state={state}>{STATUS_LABEL[state]}</span>
                {words > 0 ? <span className={styles.wordCount}>{words} words</span> : null}
                <span className={styles.blockCtrls} style={words > 0 ? undefined : { marginLeft: 'auto' }}>
                  <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} aria-label="Move block up"><Icon name="chevron-up" size={14} aria-hidden="true" /></button>
                  <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} aria-label="Move block down"><Icon name="chevron-down" size={14} aria-hidden="true" /></button>
                  <button type="button" onClick={() => removeBlock(i)} aria-label="Remove block"><Icon name="x" size={14} aria-hidden="true" /></button>
                </span>
              </div>
              <div className={styles.blockBody}>
                {b.type === 'prose' && (
                  <textarea className={styles.textarea} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder="Paragraph text…" />
                )}
                {b.type === 'code' && (
                  <>
                    <div className={styles.grid2}>
                      <input className={`${styles.input} ${styles.mono}`} value={b.filename} onChange={(e) => updateBlock(i, { filename: e.target.value })} placeholder="main.py" />
                      <select className={styles.select} value={b.language} onChange={(e) => updateBlock(i, { language: e.target.value })}>
                        <option value="python">python</option>
                        <option value="ts">ts / js</option>
                        <option value="bash">bash</option>
                      </select>
                    </div>
                    <textarea className={`${styles.textarea} ${styles.mono}`} value={b.code} onChange={(e) => updateBlock(i, { code: e.target.value })} placeholder="code…" style={{ minHeight: 140 }} />
                  </>
                )}
                {b.type === 'video' && (
                  <div className={styles.grid2}>
                    <input className={styles.input} value={b.title} onChange={(e) => updateBlock(i, { title: e.target.value })} placeholder="Video title" />
                    <input className={`${styles.input} ${styles.mono}`} value={b.duration} onChange={(e) => updateBlock(i, { duration: e.target.value })} placeholder="2:14" />
                  </div>
                )}
                {b.type === 'lab' && (
                  <>
                    <input className={styles.input} value={b.title} onChange={(e) => updateBlock(i, { title: e.target.value })} placeholder="Lab title" />
                    <textarea className={styles.textarea} value={b.summary} onChange={(e) => updateBlock(i, { summary: e.target.value })} placeholder="What the learner builds…" />
                    <textarea className={`${styles.textarea} ${styles.mono}`} value={b.starter} onChange={(e) => updateBlock(i, { starter: e.target.value })} placeholder="Starter code…" style={{ minHeight: 120 }} />
                    <div className={styles.field}>
                      <span className={styles.label}>Expected output (practice-only feedback; trusted mastery uses private server checks)</span>
                      <input className={`${styles.input} ${styles.mono}`} value={b.check ?? ''} onChange={(e) => updateBlock(i, { check: e.target.value })} placeholder="You got it!" />
                    </div>
                  </>
                )}
                {b.type === 'quiz' && (
                  <>
                    <input className={styles.input} value={b.question} onChange={(e) => updateBlock(i, { question: e.target.value })} placeholder="Question" />
                    <div className={styles.field}>
                      <span className={styles.label}>Options (one per line)</span>
                      <textarea className={styles.textarea} value={(b.options ?? []).join('\n')} onChange={(e) => updateBlock(i, { options: e.target.value.split('\n') })} placeholder={'First option\nSecond option'} />
                    </div>
                    <div className={styles.grid2}>
                      <div className={styles.field}>
                        <span className={styles.label}>Correct option #</span>
                        <input className={`${styles.input} ${styles.mono}`} value={(b.answer ?? 0) + 1} onChange={(e) => updateBlock(i, { answer: Math.max(0, (Number(e.target.value) || 1) - 1) })} inputMode="numeric" />
                      </div>
                    </div>
                    <input className={styles.input} value={b.explanation ?? ''} onChange={(e) => updateBlock(i, { explanation: e.target.value })} placeholder="Explanation (optional)" />
                  </>
                )}
                {b.type === 'callout' && (
                  <>
                    <select className={styles.select} value={b.tone} onChange={(e) => updateBlock(i, { tone: e.target.value })} style={{ maxWidth: 160 }}>
                      <option value="tip">tip</option>
                      <option value="note">note</option>
                    </select>
                    <textarea className={styles.textarea} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder="Callout text…" />
                  </>
                )}

                {/* — Sage Learning Engine V2 sprint sections — */}
                {b.type === 'sprint-contract' && (
                  <>
                    <textarea className={styles.textarea} value={b.outcome} onChange={(e) => updateBlock(i, { outcome: e.target.value })} placeholder="Outcome — what the learner can do after this sprint" />
                    <input className={styles.input} value={b.proof} onChange={(e) => updateBlock(i, { proof: e.target.value })} placeholder="Proof required" />
                    <input className={styles.input} value={b.unlock} onChange={(e) => updateBlock(i, { unlock: e.target.value })} placeholder="Unlock standard" />
                    <input className={styles.input} value={b.doNotClaim ?? ''} onChange={(e) => updateBlock(i, { doNotClaim: e.target.value })} placeholder="Don’t claim after reading… (optional)" />
                  </>
                )}
                {(b.type === 'mission' || b.type === 'context' || b.type === 'transfer') && (
                  <textarea className={styles.textarea} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder={`${b.type} text…`} />
                )}
                {b.type === 'pretest' && (
                  <>
                    <textarea className={styles.textarea} value={b.prompt} onChange={(e) => updateBlock(i, { prompt: e.target.value })} placeholder="Pretest prompt — answer from memory before reading" />
                    <textarea className={styles.textarea} value={b.reveal} onChange={(e) => updateBlock(i, { reveal: e.target.value })} placeholder="Model answer (revealed after they guess)" />
                  </>
                )}
                {b.type === 'concept' && (
                  <>
                    <input className={styles.input} value={b.title ?? ''} onChange={(e) => updateBlock(i, { title: e.target.value })} placeholder="Concept title (optional)" />
                    <textarea className={styles.textarea} value={b.text} onChange={(e) => updateBlock(i, { text: e.target.value })} placeholder="Concept capsule — the smallest idea needed to act" />
                  </>
                )}
                {b.type === 'worked-example' && (
                  <>
                    <textarea className={styles.textarea} value={b.intro} onChange={(e) => updateBlock(i, { intro: e.target.value })} placeholder="Intro to the worked example" />
                    <textarea className={`${styles.textarea} ${styles.mono}`} value={b.code ?? ''} onChange={(e) => updateBlock(i, { code: e.target.value })} placeholder="Example code (optional)" style={{ minHeight: 120 }} />
                    <textarea className={styles.textarea} value={(b.steps ?? []).join('\n')} onChange={(e) => updateBlock(i, { steps: e.target.value.split('\n') })} placeholder={'Steps (one per line)'} />
                    <input className={styles.input} value={b.commonMistake} onChange={(e) => updateBlock(i, { commonMistake: e.target.value })} placeholder="Common mistake" />
                  </>
                )}
                {b.type === 'debug' && (
                  <>
                    <input className={styles.input} value={b.symptom} onChange={(e) => updateBlock(i, { symptom: e.target.value })} placeholder="Symptom — what goes wrong" />
                    <textarea className={`${styles.textarea} ${styles.mono}`} value={b.brokenCode} onChange={(e) => updateBlock(i, { brokenCode: e.target.value })} placeholder="Broken code" style={{ minHeight: 120 }} />
                    <input className={styles.input} value={b.task} onChange={(e) => updateBlock(i, { task: e.target.value })} placeholder="Task — what the learner must do" />
                    <textarea className={styles.textarea} value={b.fix} onChange={(e) => updateBlock(i, { fix: e.target.value })} placeholder="The fix (revealed on demand)" />
                  </>
                )}
                {b.type === 'tradeoff' && (
                  <>
                    <input className={styles.input} value={b.question} onChange={(e) => updateBlock(i, { question: e.target.value })} placeholder="Tradeoff question" />
                    <div className={styles.grid2}>
                      <input className={styles.input} value={b.optionA?.label ?? ''} onChange={(e) => updateBlock(i, { optionA: { ...b.optionA, label: e.target.value } })} placeholder="Option A label" />
                      <input className={styles.input} value={b.optionB?.label ?? ''} onChange={(e) => updateBlock(i, { optionB: { ...b.optionB, label: e.target.value } })} placeholder="Option B label" />
                    </div>
                    <div className={styles.grid2}>
                      <textarea className={styles.textarea} value={b.optionA?.text ?? ''} onChange={(e) => updateBlock(i, { optionA: { ...b.optionA, text: e.target.value } })} placeholder="Option A description" />
                      <textarea className={styles.textarea} value={b.optionB?.text ?? ''} onChange={(e) => updateBlock(i, { optionB: { ...b.optionB, text: e.target.value } })} placeholder="Option B description" />
                    </div>
                    <textarea className={styles.textarea} value={b.guidance} onChange={(e) => updateBlock(i, { guidance: e.target.value })} placeholder="Engineering judgment — which to choose and why" />
                  </>
                )}
                {b.type === 'verification' && (
                  <>
                    <input className={styles.input} value={b.intro ?? ''} onChange={(e) => updateBlock(i, { intro: e.target.value })} placeholder="Intro (optional)" />
                    <textarea className={styles.textarea} value={(b.items ?? []).join('\n')} onChange={(e) => updateBlock(i, { items: e.target.value.split('\n') })} placeholder={'Proof items (one per line)'} />
                  </>
                )}
                {b.type === 'teachback' && (
                  <textarea className={styles.textarea} value={(b.prompts ?? []).join('\n')} onChange={(e) => updateBlock(i, { prompts: e.target.value.split('\n') })} placeholder={'Teach-back prompts (one per line)'} />
                )}
                {b.type === 'calibration' && (
                  <>
                    <input className={styles.input} value={b.artifact} onChange={(e) => updateBlock(i, { artifact: e.target.value })} placeholder="Artifact being calibrated (e.g. PR description)" />
                    <textarea className={styles.textarea} value={b.weak} onChange={(e) => updateBlock(i, { weak: e.target.value })} placeholder="Weak example" />
                    <textarea className={styles.textarea} value={b.passing} onChange={(e) => updateBlock(i, { passing: e.target.value })} placeholder="Passing example" />
                    <textarea className={styles.textarea} value={b.excellent} onChange={(e) => updateBlock(i, { excellent: e.target.value })} placeholder="Excellent example" />
                    <input className={styles.input} value={b.note} onChange={(e) => updateBlock(i, { note: e.target.value })} placeholder="Reviewer note" />
                  </>
                )}
                {b.type === 'spaced-review' && (
                  <textarea className={styles.textarea} value={(b.schedule ?? []).join('\n')} onChange={(e) => updateBlock(i, { schedule: e.target.value.split('\n').filter(Boolean) })} placeholder={'Review schedule (one per line) — leave blank for the default'} />
                )}
                {b.type === 'unlock-gate' && (
                  <textarea className={styles.textarea} value={(b.criteria ?? []).join('\n')} onChange={(e) => updateBlock(i, { criteria: e.target.value.split('\n') })} placeholder={'Unlock criteria (one per line)'} />
                )}
              </div>
            </div>
            )
          })}
        </div>
        <p className={styles.arcNote}>the arc is the guardrail — a lesson can’t publish with an empty proof block</p>
        <div className={styles.addGroup}>
          <span className={styles.addLabel}>Sprint sections</span>
          <div className={styles.addBar}>
            {SECTION_TYPES.map((t) => (
              <button key={t} type="button" className={styles.addBtn} onClick={() => addBlock(t)} title={loopStep(t)?.why}>+ {loopStep(t)?.label ?? t}</button>
            ))}
          </div>
        </div>
        <div className={styles.addGroup}>
          <span className={styles.addLabel}>Content blocks</span>
          <div className={styles.addBar}>
            {CONTENT_TYPES.map((t) => (
              <button key={t} type="button" className={styles.addBtn} onClick={() => addBlock(t)}>+ {t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.actions} style={{ marginTop: '1.6rem' }}>
        <button type="button" className={styles.save} onClick={onSave} disabled={saving || !slug || !title}>
          {saving ? 'Saving…' : 'Save lesson'}
        </button>
        {!isNew ? <Link href={`/academy/learn/${courseSlug}/${slug}`} className={styles.ghost} target="_blank">Preview <Icon name="arrow-right" size={13} aria-hidden="true" /></Link> : null}
        {msg ? <span className={`${styles.msg} ${msg.kind === 'err' ? styles.msgErr : styles.msgOk}`}>{msg.text}</span> : null}
      </div>
      </div>
    </div>
  )
}
