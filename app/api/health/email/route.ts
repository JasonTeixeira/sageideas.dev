import crypto from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail, FROM } from '@/lib/email/send'
import { isValidEmail, normalizeEmail } from '@/lib/newsletter'

export const dynamic = 'force-dynamic'

/**
 * Email health check.
 *   GET /api/health/email with Authorization: Bearer <CRON_SECRET>
 *     → reports whether Resend is configured without exposing it publicly.
 *   GET /api/health/email?to=you@email.com with the same Authorization header
 *     → sends a real test email so you can confirm delivery end-to-end.
 */
function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET?.trim()
  const header = req.headers.get('authorization')
  const actual = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
  if (!expected || !actual) return false
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes)
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) return json({ ok: false, error: 'Email health authorization is not configured.' }, 503)
  if (!authorized(req)) return json({ ok: false, error: 'Unauthorized' }, 401)

  const url = new URL(req.url)
  const config = {
    resendKeyPresent: !!process.env.RESEND_API_KEY,
    audienceConfigured: !!process.env.RESEND_AUDIENCE_ID,
    from: FROM,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://www.sageideas.dev',
    newsletterSecretSet: !!process.env.NEWSLETTER_SECRET,
  }

  const to = url.searchParams.get('to')
  if (!to) {
    return json({
      ok: config.resendKeyPresent,
      config,
      hint: config.resendKeyPresent
        ? 'Configured. Add ?to=you@email.com with the same Authorization header to send a live test.'
        : 'Set RESEND_API_KEY (and verify the sending domain in Resend). Then re-check.',
    })
  }

  const email = normalizeEmail(to)
  if (!isValidEmail(email)) return json({ ok: false, error: 'Invalid test recipient.' }, 400)

  const send = await sendEmail({
    to: email,
    subject: 'Sage Ideas — email health check ✓',
    templateKey: 'health-check',
    html: '<p style="font-family:sans-serif">If you can read this, Resend delivery is working. ✓</p>',
    text: 'If you can read this, Resend delivery is working.',
  })

  return json({ ok: send.ok, config, send }, send.ok ? 200 : 502)
}
