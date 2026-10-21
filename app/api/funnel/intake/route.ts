import { NextResponse, type NextRequest } from 'next/server'
import { normalizeEmail, isValidEmail } from '@/lib/newsletter'
import { sendEmail, SITE } from '@/lib/email/send'
import { rateLimit } from '@/lib/rate-limit'
import {
  ATLAS_QUESTIONS,
  recommendPath,
  answersToTags,
  type AtlasAnswers,
  type AtlasQuestionId,
} from '@/data/academy/atlas'

// Reads req.json() + headers (rate limit) and sends via Resend — per-request.
export const dynamic = 'force-dynamic'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

/** Allowed option values per question, derived from the canonical questions —
 *  anything else is dropped so we never store junk segments. */
const ALLOWED: Record<AtlasQuestionId, Set<string>> = ATLAS_QUESTIONS.reduce(
  (acc, q) => {
    acc[q.id] = new Set(q.options.map((o) => o.value))
    return acc
  },
  {} as Record<AtlasQuestionId, Set<string>>
)

function cleanAnswers(raw: unknown): AtlasAnswers {
  if (!raw || typeof raw !== 'object') return {}
  const out: AtlasAnswers = {}
  for (const q of ATLAS_QUESTIONS) {
    const v = (raw as Record<string, unknown>)[q.id]
    if (typeof v === 'string' && ALLOWED[q.id].has(v)) out[q.id] = v
  }
  return out
}

function pathEmailHtml(headline: string, startTitle: string, why: string, steps: string[], cadence: string): string {
  const stepsHtml = steps
    .map(
      (s, i) =>
        `<tr><td style="padding:6px 0;color:#B6B6C0;font-size:15px;line-height:1.5"><span style="color:#8FA0FF;font-family:monospace;margin-right:10px">0${i + 1}</span>${s}</td></tr>`
    )
    .join('')
  return `<!doctype html><html><body style="margin:0;background:#0B0B0E;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F2EFE9">
  <div style="max-width:540px;margin:0 auto;padding:40px 24px">
    <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#8FA0FF;font-family:monospace">Sage Academy · your path</div>
    <h1 style="font-size:26px;line-height:1.25;margin:16px 0 0;font-weight:600">${headline}</h1>
    <p style="color:#B6B6C0;font-size:15px;line-height:1.65;margin:16px 0 24px">${why}</p>
    <div style="border:1px solid #1E1E24;border-radius:14px;background:#111115;padding:22px 22px 12px">
      <div style="font-size:12px;color:#6B6B78;font-family:monospace;text-transform:uppercase;letter-spacing:0.12em">Start here</div>
      <div style="font-size:17px;font-weight:600;margin:6px 0 14px">${startTitle}</div>
      <table style="width:100%;border-collapse:collapse">${stepsHtml}</table>
    </div>
    <p style="color:#6B6B78;font-size:13px;line-height:1.6;margin:18px 0 26px;font-family:monospace">${cadence}</p>
    <a href="${SITE}/academy/signup" style="display:inline-block;background:#3D5AFE;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:26px">Start free — no card</a>
    <p style="color:#5A5A64;font-size:12px;line-height:1.6;margin:28px 0 0">You asked Atlas to save your path on sageideas.dev. If this wasn't you, ignore this — you won't hear from us again.</p>
  </div></body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { limit: 8, windowMs: 60_000, prefix: 'funnel' })
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const honey = body?.honey ? String(body.honey) : ''
    if (honey) return json(200, { ok: true }) // bot — accept silently

    const email = normalizeEmail(String(body?.email ?? ''))
    if (!isValidEmail(email)) return json(400, { error: 'Please enter a valid email.' })

    const answers = cleanAnswers(body?.answers)
    const path = recommendPath(answers)
    const tags = answersToTags(answers)

    const result = await sendEmail({
      to: email,
      subject: `Your path: ${path.startTitle}`,
      templateKey: 'atlas-path',
      html: pathEmailHtml(path.headline, path.startTitle, path.why, path.steps, path.cadence),
      text: `${path.headline}\n\nStart here: ${path.startTitle}\n\n${path.steps
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')}\n\n${path.cadence}\n\nStart free (no card): ${SITE}/academy/signup`,
      metadata: { source: 'atlas', segments: tags.join(',') },
    })

    // Honest dev/unconfigured state — never claim an email went out when it didn't.
    if (!result.ok && result.reason === 'missing_api_key') {
      return json(200, { ok: true, dev: true })
    }
    if (!result.ok && result.status === 'failed') {
      return json(200, { ok: true, emailFailed: true })
    }

    return json(200, { ok: true })
  } catch {
    return json(500, { error: 'Something went wrong.' })
  }
}
