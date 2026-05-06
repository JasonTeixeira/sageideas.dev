import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

// Lightweight newsletter signup wired to Supabase.
// Welcome email is sent server-side via the Resend connector by a separate
// background mechanism; here we just persist + return success.
//
// Phase 15 (Sage Ideas Studio).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getClientIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0].trim()
  return 'unknown'
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: 'lab-newsletter' })
  if (limited) return limited

  try {
    const body = await req.json().catch(() => ({}))
    const emailRaw = String(body?.email ?? '').trim().toLowerCase()
    const source = body?.source ? String(body.source).slice(0, 60) : 'unknown'

    if (!EMAIL_RE.test(emailRaw)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
    }

    const ip = getClientIp(req)
    const ua = req.headers.get('user-agent')?.slice(0, 240) ?? null

    const sb = supabaseAdmin()
    const { error } = await sb
      .from('newsletter_subscribers')
      .upsert(
        {
          email: emailRaw,
          source,
          ip,
          user_agent: ua,
          status: 'active',
        },
        { onConflict: 'email' },
      )

    if (error) {
      console.error('newsletter upsert error', error)
      return NextResponse.json({ ok: false, error: 'storage_error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('newsletter route error', e)
    return NextResponse.json({ ok: false, error: 'unexpected' }, { status: 500 })
  }
}
