/**
 * LEGACY DIAGNOSTIC — this file is not a certification authority.
 *
 * Academy Certification Harness V2 (`npm run academy:audit:all`) is the only tool
 * allowed to publish the authoritative Academy quality board. This legacy script
 * remains temporarily available for bounded live-render/audio diagnostics and its
 * proof-artifacts output cannot promote course lifecycle or certification state.
 *
 *   node --env-file=.env.local scripts/academy/quality/harness.mjs <course-slug> [--lesson <slug>]
 *
 * Scores what learners ACTUALLY receive: reads live blocks from Supabase, and (when a disk
 * authoring bundle exists) shells the content auditor for lab-execution + anti-template checks.
 */
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const OUT_DIR = 'proof-artifacts/academy'
const AUTHORING_DIRS = ['data/academy/authoring', 'REBUILD']
const GATE = 99

// ── weights (must match ACADEMY_QUALITY_STANDARD.md §2) ───────────────────────
const WEIGHTS = {
  content: 18,
  arc: 12,
  lab: 12,
  visual: 12,
  voice: 12,
  a11y: 12,
  ux: 12,
  perf: 6,
  consistency: 4,
}

const args = process.argv.slice(2)
const requestedCourseSlug = args.find((a) => !a.startsWith('--'))
const lessonFilter = args.includes('--lesson')
  ? args[args.indexOf('--lesson') + 1]
  : null
if (!requestedCourseSlug) {
  console.error('usage: harness.mjs <course-slug> [--lesson <slug>]')
  process.exit(1)
}
console.warn(
  'legacy diagnostic only — use `npm run academy:audit:all` for the authoritative certification board',
)
const academyRegistry = JSON.parse(
  readFileSync('data/academy/registry.json', 'utf8'),
)
const registryCourse = academyRegistry.courses.find(
  (course) =>
    course.slug === requestedCourseSlug || course.aliases.includes(requestedCourseSlug),
)
if (!registryCourse) {
  console.error(`course '${requestedCourseSlug}' is not registered in data/academy/registry.json`)
  process.exit(1)
}
const courseSlug = registryCourse.slug

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ── audio integrity (dim 5) ───────────────────────────────────────────────────
// Walk a blocks tree for every audio URL, then probe each: reachable? non-empty?
// clean levels (no clipping, not near-silent)? These map to H3 + a clarity score.
function collectAudioUrls(blocks) {
  const urls = []
  const walk = (v) => {
    if (!v) return
    if (typeof v === 'string') {
      if (/\.mp3(\?|$)/i.test(v) && /^https?:/.test(v)) urls.push(v)
      return
    }
    if (Array.isArray(v)) return v.forEach(walk)
    if (typeof v === 'object') return Object.values(v).forEach(walk)
  }
  walk(blocks)
  return [...new Set(urls)]
}

function probeAudio(url, work) {
  // fetch → temp file → ffprobe duration + volumedetect peak/mean dBFS
  const res = {
    url,
    ok: false,
    bytes: 0,
    ms: null,
    peakDb: null,
    meanDb: null,
    err: null,
  }
  const dl = spawnSync(
    'curl',
    ['-sS', '-f', '-o', work, '-w', '%{http_code}', url],
    { encoding: 'utf8', timeout: 30000 },
  )
  const code = (dl.stdout || '').trim()
  if (dl.status !== 0 || code !== '200' || !existsSync(work)) {
    res.err = `fetch ${code || dl.status}`
    return res
  }
  res.bytes = existsSync(work) ? readFileSync(work).length : 0
  if (res.bytes === 0) {
    res.err = 'empty'
    return res
  }
  const dur = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', work],
    { encoding: 'utf8' },
  )
  const s = parseFloat((dur.stdout || '').trim())
  res.ms = Number.isFinite(s) ? Math.round(s * 1000) : null
  const vol = spawnSync(
    'ffmpeg',
    ['-i', work, '-af', 'volumedetect', '-f', 'null', '-'],
    { encoding: 'utf8' },
  )
  const blob = vol.stderr || ''
  const peak = blob.match(/max_volume:\s*(-?[\d.]+) dB/)
  if (peak) res.peakDb = parseFloat(peak[1])
  const mean = blob.match(/mean_volume:\s*(-?[\d.]+) dB/)
  if (mean) res.meanDb = parseFloat(mean[1])
  res.ok = true
  return res
}

function scoreAudio(lessons) {
  const anyAudio = lessons.some((l) => collectAudioUrls(l.blocks).length > 0)
  if (!anyAudio)
    return {
      applicable: false,
      score: null,
      hardFails: [],
      notes: [
        'no narration — voice N/A (caption-readiness checked under a11y)',
      ],
    }
  const work = join(mkdtempSync(join(tmpdir(), 'harness-audio-')), 'clip.mp3')
  const hardFails = [],
    notes = []
  let probed = 0,
    clean = 0
  try {
    for (const l of lessons) {
      for (const url of collectAudioUrls(l.blocks)) {
        const p = probeAudio(url, work)
        probed++
        if (!p.ok) {
          hardFails.push({
            code: 'H3',
            unit: l.slug,
            msg: `audio unreachable/empty: ${url} (${p.err})`,
          })
          continue
        }
        // clean = reachable, has duration, peak below clipping (-1 dB), not near-silent (mean > -40 dB)
        const notClipping = p.peakDb === null || p.peakDb <= -1
        const audible = p.meanDb === null || p.meanDb >= -40
        if (p.ms && notClipping && audible) clean++
        else
          notes.push(
            `${l.slug}: peak=${p.peakDb}dB mean=${p.meanDb}dB dur=${p.ms}ms`,
          )
      }
    }
  } finally {
    try {
      rmSync(join(work, '..'), { recursive: true, force: true })
    } catch {}
  }
  const score = probed ? Math.round((clean / probed) * 100) : 0
  return {
    applicable: true,
    score,
    hardFails,
    notes: [`${clean}/${probed} clips clean`, ...notes.slice(0, 6)],
  }
}

// ── content/arc/lab (dims 1-3) via the existing auditor ────────────────────────
function findLessonsJson() {
  for (const base of AUTHORING_DIRS) {
    const flat = join(base, `${courseSlug}.lessons.json`)
    if (existsSync(flat)) return flat
    const nested = join(base, courseSlug, `${courseSlug}.lessons.json`)
    if (existsSync(nested)) return nested
  }
  return null
}

// The content auditor expects a per-course FOLDER with <slug>.lessons.json + a
// <slug>.manifest.json. Our on-disk authoring is flat, so stage a temp folder and
// synthesize its compatibility manifest from the canonical registry. Live DB rows
// remain the rendered-content input, but they are not allowed to redefine identity.
function stageBundle() {
  const lessons = findLessonsJson()
  if (!lessons) return null
  const dir = mkdtempSync(join(tmpdir(), 'harness-bundle-'))
  const stage = join(dir, courseSlug)
  mkdirSync(stage, { recursive: true })
  const authored = JSON.parse(readFileSync(lessons, 'utf8'))
  writeFileSync(
    join(stage, `${courseSlug}.lessons.json`),
    JSON.stringify(authored),
  )
  const manifest = registryCourse.lessons.map((lesson) => ({
    courseSlug,
    slug: lesson.slug,
    title: lesson.title,
    moduleTitle: lesson.moduleTitle,
    moduleSort: lesson.moduleSort,
    sort: lesson.sort,
  }))
  writeFileSync(
    join(stage, `${courseSlug}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  )
  const srcDir = lessons.replace(/[^/]+$/, '')
  for (const suffix of ['lab_solutions.json', 'sources.json']) {
    const f = join(srcDir, `${courseSlug}.${suffix}`)
    if (existsSync(f))
      writeFileSync(join(stage, `${courseSlug}.${suffix}`), readFileSync(f))
  }
  const hasLabs = Object.values(authored).some(
    (blocks) =>
      Array.isArray(blocks) && blocks.some((block) => block?.type === 'lab'),
  )
  return { dir, hasLabs }
}

function scoreContent() {
  const staged = stageBundle()
  if (!staged)
    return {
      applicable: false,
      content: null,
      arc: null,
      lab: null,
      hardFails: [],
      notes: [
        'no disk authoring bundle — content/lab checks skipped (live-only unit)',
      ],
    }
  const jsonOut = join(
    mkdtempSync(join(tmpdir(), 'harness-content-')),
    'report.json',
  )
  const r = spawnSync(
    'npx',
    [
      'tsx',
      'scripts/academy/authoring/audit-courses.ts',
      staged.dir,
      '--course',
      courseSlug,
      '--json',
      jsonOut,
    ],
    { encoding: 'utf8' },
  )
  if (!existsSync(jsonOut))
    return {
      applicable: false,
      content: null,
      arc: null,
      lab: null,
      hardFails: [],
      notes: [
        `content auditor produced no report (${(r.stderr || '').slice(-160)})`,
      ],
    }
  const report = JSON.parse(readFileSync(jsonOut, 'utf8'))
  const course = Array.isArray(report)
    ? report.find((c) => c.course === courseSlug) || report[0]
    : report
  const findings = course?.findings || []
  const fails = findings.filter((f) => f.sev === 'FAIL')
  const labFails = fails.filter((f) => f.dim === 'lab')
  const refFails = fails.filter((f) => /ref|edge|manifest/.test(f.dim))
  const contentFails = fails.filter((f) => /content|schema|files/.test(f.dim))
  const hardFails = []
  if (labFails.length)
    hardFails.push({
      code: 'H2',
      unit: courseSlug,
      msg: `${labFails.length} lab failure(s)`,
    })
  if (staged.hasLabs)
    hardFails.push({
      code: 'H2',
      unit: courseSlug,
      msg: 'lab_trust=untrusted_current_runtime; current checks cannot certify mastery',
    })
  if (refFails.length)
    hardFails.push({
      code: 'H5',
      unit: courseSlug,
      msg: `${refFails.length} dead ref/manifest issue(s)`,
    })
  // scores: 100 minus penalty per fail class, floored
  const pen = (n, per) => Math.max(0, 100 - n * per)
  return {
    applicable: true,
    content: pen(contentFails.length, 8),
    arc: pen(
      findings.filter(
        (f) => f.sev === 'FAIL' && /arc|structure|visual/.test(f.dim),
      ).length,
      10,
    ),
    lab: staged.hasLabs ? null : 'n/a',
    hardFails,
    notes: [`${fails.length} FAIL findings`, `gate=${course?.gate}`],
  }
}

// ── compose scorecard ──────────────────────────────────────────────────────────
function composite(dims) {
  let wsum = 0,
    w = 0
  for (const [k, wt] of Object.entries(WEIGHTS)) {
    const v = dims[k]
    if (v === null || v === undefined || v === 'n/a' || v === 'proxy') continue
    wsum += v * wt
    w += wt
  }
  return w ? Math.round((wsum / w) * 10) / 10 : 0
}

async function main() {
  const q = sb
    .from('academy_lessons')
    .select('slug,title,blocks,module_title,module_sort,sort')
    .eq('course_slug', courseSlug)
  const { data: lessons, error } = lessonFilter
    ? await q.eq('slug', lessonFilter)
    : await q
  if (error) {
    console.error('supabase:', error.message)
    process.exit(1)
  }
  if (!lessons?.length) {
    console.error(
      `no live lessons for course '${courseSlug}'${lessonFilter ? ` slug '${lessonFilter}'` : ''}`,
    )
    process.exit(1)
  }

  const audio = scoreAudio(lessons)
  const content = scoreContent()
  const hardFails = [...audio.hardFails, ...content.hardFails]

  // Live-render inspection (a11y/consistency/perf) — per lesson, needs auth creds.
  // Runs for a single lesson; for a course, callers loop lessons. Degrades to pending
  // when creds absent so the content+audio spine still works standalone.
  let inspect = null
  const canRender =
    process.env.ACADEMY_TEST_EMAIL && process.env.ACADEMY_TEST_PASSWORD
  // Mint ONE session and reuse it (avoids the auth rate limit + per-run login flake).
  if (canRender && lessonFilter && !process.env.ACADEMY_STORAGE_STATE) {
    const statePath = '/tmp/academy-harness-state.json'
    if (!existsSync(statePath)) {
      const a = spawnSync(
        'node',
        [
          'scripts/academy/quality/auth-state.mjs',
          process.env.HARNESS_BASE_URL || 'http://localhost:3040',
          statePath,
        ],
        { encoding: 'utf8', env: process.env },
      )
      if (!/"ok":true/.test(a.stdout || ''))
        console.log(
          `  (auth-state: ${(a.stderr || a.stdout || '').trim().slice(-120)})`,
        )
    }
    if (existsSync(statePath)) process.env.ACADEMY_STORAGE_STATE = statePath
  }
  if (canRender && lessonFilter) {
    // The inspector runs its own browser+login and can flake transiently — retry twice.
    for (let attempt = 0; attempt < 2 && !inspect; attempt++) {
      const r = spawnSync(
        'node',
        [
          'scripts/academy/quality/inspect-lesson.mjs',
          courseSlug,
          lessonFilter,
        ],
        { encoding: 'utf8', env: process.env },
      )
      const line = (r.stdout || '')
        .trim()
        .split('\n')
        .filter((l) => l.startsWith('{'))
        .pop()
      try {
        const d = line ? JSON.parse(line) : null
        if (d?.ok) {
          inspect = d
          if (d.a11y.hardFail)
            hardFails.push({
              code: 'H4',
              unit: lessonFilter,
              msg: `a11y: ${d.a11y.byImpact.critical} critical / ${d.a11y.byImpact.serious} serious (${d.a11y.topViolations.map((v) => v.id).join(', ')})`,
            })
        }
      } catch {
        /* transient — retry */
      }
    }
  }

  // Deterministic dims filled; subjective dims (visual, ux) left for the judge panel.
  const dims = {
    content: content.content,
    arc: content.arc,
    lab: content.lab,
    visual: null, // judge panel (pending)
    voice: audio.applicable ? audio.score : 'n/a',
    a11y: inspect ? inspect.a11y.score : null,
    ux: null, // judge panel (pending)
    // perf is a DEV proxy here — advisory, not gating (rubric §8: real gate = Phase-6
    // prod Lighthouse). Excluded from composite like voice N/A; value kept in notes.
    perf: inspect ? 'proxy' : null,
    consistency: inspect ? inspect.consistency.score : null,
  }
  const pendingJudge = ['visual', 'ux'].filter((k) => dims[k] === null)
  const pendingChecks = ['a11y', 'perf', 'consistency'].filter(
    (k) => dims[k] === null,
  )
  const deterministicComposite = composite(dims)
  // Legacy diagnostics can never issue a certification/pass decision. Harness V2
  // is the sole authority and separately fails closed on every pending dimension.
  const pass = false

  const card = {
    unit: lessonFilter ? `${courseSlug}/${lessonFilter}` : courseSlug,
    kind: lessonFilter ? 'lesson' : 'course',
    lessons: lessons.length,
    dimensions: dims,
    deterministicComposite,
    hardFails,
    pendingJudge,
    pendingChecks,
    notes: {
      audio: audio.notes,
      content: content.notes,
      inspect: inspect
        ? [
            `a11y ${inspect.a11y.score} (${inspect.a11y.byImpact.serious} serious, ${inspect.a11y.byImpact.moderate} moderate)`,
            `consistency ${inspect.consistency.score}${inspect.consistency.offHues.length ? ` — off-hue ${inspect.consistency.offHues.map((h) => h[0]).join(', ')}` : ''}`,
            `perf ${inspect.perfProxy.wallMs}ms wall (dev proxy)`,
          ]
        : [
            canRender
              ? 'inspector did not return (see stderr)'
              : 'render dims pending — set ACADEMY_TEST_EMAIL/PASSWORD',
          ],
    },
    pass,
    authority: 'legacy_diagnostic_only',
    certificationStatus: 'uncertified',
    gate: GATE,
    generatedBy: 'academy-quality-harness (deterministic spine)',
  }

  mkdirSync(OUT_DIR, { recursive: true })
  const file = join(OUT_DIR, `${card.unit.replace(/\//g, '__')}-scorecard.json`)
  writeFileSync(file, JSON.stringify(card, null, 2))

  console.log(
    `\n═══ ${card.unit} · ${card.kind} · ${lessons.length} lesson(s) ═══`,
  )
  console.log(
    `  voice/audio : ${dims.voice}${audio.applicable ? ` (${audio.notes[0]})` : ''}`,
  )
  if (content.applicable)
    console.log(
      `  content/arc/lab : ${dims.content}/${dims.arc}/${dims.lab} · ${content.notes.join(' · ')}`,
    )
  else console.log(`  content : ${content.notes[0]}`)
  if (inspect)
    console.log(
      `  a11y/consistency/perf : ${dims.a11y}/${dims.consistency}/${dims.perf} · ${card.notes.inspect.join(' · ')}`,
    )
  console.log(
    `  hard-fails : ${hardFails.length ? hardFails.map((h) => `${h.code} ${h.msg}`).join('; ') : 'none'}`,
  )
  console.log(
    `  deterministic composite : ${deterministicComposite} (subjective dims pending: ${[...pendingJudge, ...pendingChecks].join(', ')})`,
  )
  console.log(`  → ${file}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
