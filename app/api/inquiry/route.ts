import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function clientIpForHash(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

const ENGAGEMENT_TYPES = ['studio', 'project', 'consult'] as const
type EngagementType = (typeof ENGAGEMENT_TYPES)[number]

const ENGAGEMENT_LABEL: Record<EngagementType, string> = {
  studio: 'Studio Engagement',
  project: 'Project',
  consult: 'Consult',
}

const TIMELINE_VALUES = ['asap', '2-4w', '1-2m', '3m+', 'exploring'] as const
const BUDGET_VALUES = ['<10k', '10-25k', '25-50k', '50-100k', '100k+', 'unsure'] as const

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function sanitize(s: unknown, max = 2000): string {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function row(label: string, value: string) {
  if (!value) return ''
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #27272A;color:#A1A1AA;font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.08em;width:140px">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #27272A;color:#FAFAFA;font:14px -apple-system,system-ui,sans-serif">${escapeHtml(value).replace(/\n/g, '<br/>')}</td></tr>`
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, { limit: 10, windowMs: 60_000, prefix: 'inquiry' })
    if (limited) return limited
    const ip = clientIpForHash(request)

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Honeypot
    if (body.honey) {
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    const engagement_type = sanitize(body.engagement_type, 20) as EngagementType
    const name = sanitize(body.name, 120)
    const email = sanitize(body.email, 200)
    const company = sanitize(body.company, 200)
    const role = sanitize(body.role, 120)
    const timeline = sanitize(body.timeline, 20)
    const budget_band = sanitize(body.budget_band, 20)
    const scope = sanitize(body.scope, 5000)
    const source = sanitize(body.source, 80)
    const referrer = sanitize(body.referrer, 500)

    if (!ENGAGEMENT_TYPES.includes(engagement_type)) {
      return NextResponse.json({ error: 'Pick an engagement type' }, { status: 400 })
    }
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || !isEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    if (!scope || scope.length < 20) {
      return NextResponse.json({ error: 'Tell us a bit more about scope (20+ characters)' }, { status: 400 })
    }
    if (timeline && !TIMELINE_VALUES.includes(timeline as (typeof TIMELINE_VALUES)[number])) {
      return NextResponse.json({ error: 'Invalid timeline' }, { status: 400 })
    }
    if (budget_band && !BUDGET_VALUES.includes(budget_band as (typeof BUDGET_VALUES)[number])) {
      return NextResponse.json({ error: 'Invalid budget' }, { status: 400 })
    }

    const ip_hash = createHash('sha256').update(`${ip}::sageideas`).digest('hex').slice(0, 32)
    const userAgent = sanitize(request.headers.get('user-agent') || '', 500)

    // Insert into Supabase (service role bypasses RLS)
    let inquiryId: string | null = null
    try {
      const supa = supabaseAdmin()
      const { data, error } = await supa
        .from('engagement_inquiries')
        .insert({
          engagement_type,
          name,
          email,
          company: company || null,
          role: role || null,
          timeline: timeline || null,
          budget_band: budget_band || null,
          scope,
          source: source || null,
          referrer: referrer || null,
          user_agent: userAgent || null,
          ip_hash,
        })
        .select('id')
        .single()
      if (error) {
        console.error('[inquiry] supabase insert failed', error)
      } else {
        inquiryId = data?.id ?? null
      }
    } catch (e) {
      console.error('[inquiry] supabase exception', e)
    }

    // Resend: notification to studio + confirmation to inquirer
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      const resend = new Resend(resendKey)
      const FROM = 'Sage Ideas <sage@sageideas.dev>'
      const STUDIO = 'sage@sageideas.dev'
      const typeLabel = ENGAGEMENT_LABEL[engagement_type]

      const adminHtml = `<!doctype html><html><body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,system-ui,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;color:#FAFAFA">
  <div style="font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.12em;color:#06B6D4;margin-bottom:8px">New ${escapeHtml(typeLabel)} inquiry</div>
  <h1 style="font-size:22px;margin:0 0 24px;color:#FAFAFA">${escapeHtml(name)} — ${escapeHtml(company || 'no company listed')}</h1>
  <table style="width:100%;border-collapse:collapse;background:#0F0F12;border:1px solid #27272A;border-radius:12px;overflow:hidden">
    ${row('Type', typeLabel)}
    ${row('Name', name)}
    ${row('Email', email)}
    ${row('Company', company)}
    ${row('Role', role)}
    ${row('Timeline', timeline)}
    ${row('Budget', budget_band)}
    ${row('Source', source)}
    ${row('Referrer', referrer)}
    ${row('Scope', scope)}
    ${inquiryId ? row('ID', inquiryId) : ''}
  </table>
  <p style="font-size:12px;color:#71717A;margin-top:24px">Reply directly to ${escapeHtml(email)}.</p>
</div></body></html>`

      const userHtml = `<!doctype html><html><body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,system-ui,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;color:#FAFAFA">
  <div style="font:11px ui-monospace,monospace;text-transform:uppercase;letter-spacing:0.12em;color:#06B6D4;margin-bottom:8px">Sage Ideas Studio</div>
  <h1 style="font-size:24px;margin:0 0 16px;color:#FAFAFA">Got it, ${escapeHtml(name.split(' ')[0])}.</h1>
  <p style="font-size:15px;line-height:1.6;color:#D4D4D8;margin:0 0 16px">Your ${escapeHtml(typeLabel.toLowerCase())} inquiry landed. I read every one personally and reply within 48 hours if it's a good match.</p>
  <p style="font-size:15px;line-height:1.6;color:#D4D4D8;margin:0 0 16px">Here's what you sent so you have a copy:</p>
  <table style="width:100%;border-collapse:collapse;background:#0F0F12;border:1px solid #27272A;border-radius:12px;overflow:hidden;margin:16px 0">
    ${row('Type', typeLabel)}
    ${row('Timeline', timeline)}
    ${row('Budget', budget_band)}
    ${row('Scope', scope)}
  </table>
  <p style="font-size:14px;line-height:1.6;color:#A1A1AA;margin:24px 0 8px">If your situation changes or you want to add context, just reply to this email.</p>
  <p style="font-size:14px;line-height:1.6;color:#A1A1AA;margin:0">— Jason</p>
  <p style="font-size:12px;color:#52525B;margin:32px 0 0">Sage Ideas LLC · Orlando, FL · sageideas.dev</p>
</div></body></html>`

      try {
        await Promise.allSettled([
          resend.emails.send({
            from: FROM,
            to: STUDIO,
            replyTo: email,
            subject: `[${typeLabel}] ${name}${company ? ` · ${company}` : ''}`,
            html: adminHtml,
          }),
          resend.emails.send({
            from: FROM,
            to: email,
            replyTo: STUDIO,
            subject: `Got your ${typeLabel.toLowerCase()} inquiry — Sage Ideas`,
            html: userHtml,
          }),
        ])
      } catch (e) {
        console.error('[inquiry] resend send failed', e)
      }
    } else {
      console.warn('[inquiry] RESEND_API_KEY missing — skipped emails')
    }

    return NextResponse.json({ ok: true, id: inquiryId }, { status: 200 })
  } catch (err) {
    console.error('[inquiry] handler error', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again or email sage@sageideas.dev directly.' }, { status: 500 })
  }
}
