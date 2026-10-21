import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/newsletter'
import { unsubscribeContact } from '@/lib/newsletter-audience'
import { SITE } from '@/lib/email/send'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, SITE), { status: 302 })
}

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 20, windowMs: 60_000, prefix: 'newsletter-unsubscribe' })
  if (limited) return limited
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const verified = verifyToken(token, 'unsubscribe')
  if (!verified) return redirect('/field-notes?unsubscribe=invalid')
  const result = await unsubscribeContact(verified.email)
  if (!result.ok) return redirect('/field-notes?unsubscribe=failed')
  return redirect('/field-notes?unsubscribed=1')
}

export async function POST(req: NextRequest) {
  // Resend/Gmail one-click unsubscribe sends POST.
  const limited = await rateLimit(req, { limit: 20, windowMs: 60_000, prefix: 'newsletter-unsubscribe' })
  if (limited) return limited
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const verified = verifyToken(token, 'unsubscribe')
  if (!verified) return NextResponse.json({ error: 'Invalid or expired unsubscribe token' }, { status: 400 })
  const result = await unsubscribeContact(verified.email)
  if (!result.ok) return NextResponse.json({ error: 'Could not update subscription status' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
