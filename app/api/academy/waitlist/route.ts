import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { sendAcademyWaitlistWelcome } from '@/lib/academy/waitlist-welcome'
import { sendEmail } from '@/lib/email/send'

const NOTIFY_TO = 'sage@sageideas.org'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no ambiguous chars
const REFERRAL_BOOST = 5 // spots moved up per referral

function genCode(n = 7): string {
  const b = randomBytes(n)
  let s = ''
  for (let i = 0; i < n; i++) s += ALPHABET[b[i] % ALPHABET.length]
  return s
}

export async function POST(req: NextRequest) {
  try {
    const limited = await rateLimit(req, { limit: 5, windowMs: 60_000, prefix: 'academy-waitlist' })
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? '').trim().toLowerCase()
    const refRaw = body?.ref ? String(body.ref).trim().toLowerCase().slice(0, 16) : ''

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
    }

    const sb = supabaseAdmin()

    // Already on the list? Return their existing code/position (idempotent).
    const { data: existing } = await sb
      .from('academy_waitlist')
      .select('ref_code, created_at')
      .eq('email', email)
      .maybeSingle()

    let refCode: string
    let createdAt: string

    if (existing) {
      refCode = existing.ref_code as string
      createdAt = existing.created_at as string
    } else {
      // Validate the referrer code (must exist, and obviously can't be theirs yet).
      let referredBy: string | null = null
      if (refRaw) {
        const { data: referrer } = await sb
          .from('academy_waitlist')
          .select('ref_code')
          .eq('ref_code', refRaw)
          .maybeSingle()
        if (referrer) referredBy = refRaw
      }

      // Insert with a unique code (retry once on the rare collision).
      let inserted: { ref_code: string; created_at: string } | null = null
      for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
        const code = genCode()
        const { data, error } = await sb
          .from('academy_waitlist')
          .insert({ email, ref_code: code, referred_by: referredBy })
          .select('ref_code, created_at')
          .single()
        if (!error && data) {
          inserted = data as { ref_code: string; created_at: string }
        } else if (error && !String(error.message).includes('ref_code')) {
          // A non-code unique error (e.g. email race) — re-read the existing row.
          const { data: row } = await sb
            .from('academy_waitlist')
            .select('ref_code, created_at')
            .eq('email', email)
            .maybeSingle()
          if (row) inserted = row as { ref_code: string; created_at: string }
          break
        }
      }
      if (!inserted) {
        return NextResponse.json({ ok: false, error: 'storage_error' }, { status: 500 })
      }
      refCode = inserted.ref_code
      createdAt = inserted.created_at
    }

    // Mirror into the main subscriber list so the count + email flow still work.
    await sb
      .from('newsletter_subscribers')
      .upsert({ email, source: 'academy_waitlist', status: 'active' }, { onConflict: 'email' })

    // Position = chronological rank, improved by REFERRAL_BOOST per referral.
    const [{ count: baseRank }, { count: referrals }, { count: total }] = await Promise.all([
      sb.from('academy_waitlist').select('*', { count: 'exact', head: true }).lte('created_at', createdAt),
      sb.from('academy_waitlist').select('*', { count: 'exact', head: true }).eq('referred_by', refCode),
      sb.from('academy_waitlist').select('*', { count: 'exact', head: true }),
    ])

    const refs = referrals ?? 0
    const position = Math.max(1, (baseRank ?? 1) - refs * REFERRAL_BOOST)

    // Welcome email + operator notification — only for brand-new signups,
    // best-effort (never blocks the response).
    if (!existing) {
      try {
        await sendAcademyWaitlistWelcome({ email, position, refCode })
      } catch {
        // Resend hiccup — the signup still succeeds.
      }
      try {
        await sendEmail({
          to: NOTIFY_TO,
          subject: `New Academy waitlist signup — ${total ?? 1} total`,
          html: `<p>New founding-waitlist signup:</p><ul><li><strong>${email}</strong></li><li>Position #${position}</li><li>Total now: ${total ?? 1} / 1,000</li></ul>`,
          text: `New waitlist signup: ${email} (position #${position}, total ${total ?? 1}/1000)`,
          templateKey: 'academy_waitlist_admin_notify',
        })
      } catch {
        // Notification is non-critical.
      }
    }

    return NextResponse.json({
      ok: true,
      refCode,
      position,
      referrals: refs,
      total: total ?? 1,
    })
  } catch {
    return NextResponse.json({ ok: false, error: 'storage_error' }, { status: 500 })
  }
}
