import { NextResponse, type NextRequest } from 'next/server'
import { normalizeEmail, isValidEmail, signToken } from '@/lib/newsletter'
import { sendEmail, SITE } from '@/lib/email/send'
import { rateLimit } from '@/lib/rate-limit'

// Reads req.json() + request headers (rate limiting) and sends via Resend —
// must run per-request.
export const dynamic = 'force-dynamic'

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status })
}

function confirmHtml(url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0B0B0E;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F2EFE9">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#8FA0FF;font-family:monospace">Sage Ideas · the Monday note</div>
    <h1 style="font-size:26px;line-height:1.2;margin:18px 0 0;font-weight:600">Confirm your subscription</h1>
    <p style="color:#B6B6C0;font-size:15px;line-height:1.6;margin:16px 0 28px">One real incident, mapped in public — in your inbox every Monday. Click below to confirm (we only email people who ask).</p>
    <a href="${url}" style="display:inline-block;background:#3D5AFE;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:26px">Confirm subscription</a>
    <p style="color:#5A5A64;font-size:12px;line-height:1.6;margin:28px 0 0">If you didn't request this, ignore this email — nothing happens without your confirmation. The link expires in 7 days.</p>
  </div></body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { limit: 10, windowMs: 60_000, prefix: 'newsletter' })
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const email = normalizeEmail(String(body?.email ?? ''))
    const source = body?.source ? String(body.source).trim().slice(0, 64) : ''
    const honey = body?.honey ? String(body.honey) : ''

    // Honeypot: bots fill it — accept silently, do nothing.
    if (honey) return json(200, { ok: true })

    if (!isValidEmail(email)) {
      return json(400, { error: 'Invalid email address.' })
    }

    // Stateless double opt-in: the confirm link carries a signed token, so no
    // pending record is stored anywhere.
    const token = signToken(email, source, 'confirm')
    const confirmUrl = `${SITE}/api/newsletter/confirm?token=${encodeURIComponent(token)}`

    const result = await sendEmail({
      to: email,
      subject: 'Confirm your subscription — the Monday note',
      templateKey: 'newsletter-confirm',
      html: confirmHtml(confirmUrl),
      text: `Confirm your subscription to the Monday note:\n\n${confirmUrl}\n\nIf you didn't request this, ignore this email. The link expires in 7 days.`,
      metadata: { source },
    })

    // No provider configured (local/dev): report honest dev state so nobody
    // believes a real email went out.
    if (!result.ok && result.reason === 'missing_api_key') {
      return json(200, { ok: true, dev: true })
    }
    // Provider hard-failure: surface it so the UI doesn't claim success falsely.
    if (!result.ok && result.status === 'failed') {
      return json(502, { error: 'Could not send the confirmation email. Please try again.' })
    }

    return json(200, { ok: true })
  } catch {
    return json(500, { error: 'Something went wrong.' })
  }
}
