import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/newsletter'
import { addContact } from '@/lib/newsletter-audience'
import { sendEmail, SITE } from '@/lib/email/send'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, SITE), { status: 302 })
}

const welcomeHtml = `<!doctype html><html><body style="margin:0;background:#0B0B0E;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#F2EFE9">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#18B663;font-family:monospace">You're in ✓</div>
    <h1 style="font-size:26px;line-height:1.2;margin:18px 0 0;font-weight:600">See you Monday.</h1>
    <p style="color:#B6B6C0;font-size:15px;line-height:1.6;margin:16px 0 0">One real incident, mapped in public — every Monday. No fluff, unsubscribe anytime from any email.</p>
  </div></body></html>`

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 8, windowMs: 60_000, prefix: 'newsletter-confirm' })
  if (limited) return limited
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const verified = verifyToken(token, 'confirm')
  if (!verified) return redirect('/field-notes?subscribe=invalid')

  const audienceResult = await addContact(verified.email)
  if (!audienceResult.ok) return redirect('/field-notes?subscribe=unavailable')

  // Best-effort welcome; never block the redirect on it.
  await sendEmail({
    to: verified.email,
    subject: "You're in — the Monday note",
    templateKey: 'newsletter-welcome',
    html: welcomeHtml,
    text: "You're subscribed to the Monday note. One real incident, mapped in public, every Monday. Unsubscribe anytime.",
    metadata: { source: verified.source },
  }).catch(() => null)

  return redirect('/field-notes?subscribed=1')
}
