import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/server'
import { dateInTz } from '@/lib/academy/gamification-logic'
import { sendEmail } from '@/lib/email/send'
import { eyebrow, headline, para, button, emailShell } from '@/lib/academy/email-theme'
import { sendPush, type WebPushSub } from '@/lib/notifications/push'
import { shouldSendStreakReminder, localHourInTz, type NotificationType } from '@/lib/notifications/eligibility'

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sageideas.dev'

/** Log a delivered notification (drives the frequency cap on the next run). */
async function recordNotification(
  userId: string,
  type: NotificationType,
  channel: 'email' | 'push',
  meta: Record<string, unknown> = {},
): Promise<void> {
  const admin = supabaseAdmin()
  await admin.from('academy_notifications').insert({ user_id: userId, type, channel, meta })
}

/** Most-recent send timestamp for a (user, type), or null — for the frequency cap. */
async function lastSentAt(userId: string, type: NotificationType): Promise<string | null> {
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('academy_notifications')
    .select('sent_at')
    .eq('user_id', userId)
    .eq('type', type)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.sent_at as string | null) ?? null
}

async function pushSubsFor(userId: string): Promise<WebPushSub[]> {
  const admin = supabaseAdmin()
  const { data } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)
  return (data ?? []).map((s) => ({
    endpoint: s.endpoint as string,
    p256dh: s.p256dh as string,
    auth: s.auth as string,
  }))
}

async function pruneSub(endpoint: string): Promise<void> {
  const admin = supabaseAdmin()
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)
}

async function emailFor(userId: string): Promise<string | null> {
  const admin = supabaseAdmin()
  const { data } = await admin.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

function streakSaveEmail(email: string, streak: number): string {
  const inner =
    eyebrow('Sage Academy') +
    headline(`Don’t lose your ${streak}-day streak`) +
    para(
      `You’re on a <strong>${streak}-day</strong> streak — one lesson or a quick review keeps it alive. ` +
        `It only takes a few minutes, and your spaced-review cards are waiting.`,
    ) +
    button(`${SITE}/academy/review`, 'Keep my streak →')
  return emailShell(inner, email)
}

/** Send a streak-save nudge across available channels; returns whether anything sent. */
export async function sendStreakSave(userId: string, streak: number): Promise<boolean> {
  let sent = false

  // Web push first (cheapest, most immediate).
  const subs = await pushSubsFor(userId)
  for (const sub of subs) {
    const res = await sendPush(sub, {
      title: `🔥 ${streak}-day streak at risk`,
      body: 'A few minutes keeps it alive. Tap to review.',
      url: '/academy/review',
      tag: 'streak-save',
    })
    if (res.ok) {
      sent = true
    } else if (res.gone) {
      await pruneSub(sub.endpoint)
    }
  }
  if (sent) await recordNotification(userId, 'streak_save', 'push', { streak })

  // Email fallback when there's no live push channel.
  if (!sent) {
    const email = await emailFor(userId)
    if (email) {
      const res = await sendEmail({
        to: email,
        subject: `🔥 Keep your ${streak}-day streak alive`,
        html: streakSaveEmail(email, streak),
        templateKey: 'academy_streak_save',
        userId,
      })
      if (res.ok) {
        sent = true
        await recordNotification(userId, 'streak_save', 'email', { streak })
      }
    }
  }

  return sent
}

export interface ReminderRunSummary {
  scanned: number
  eligible: number
  sent: number
  skipped: Record<string, number>
}

/**
 * Cron entrypoint: scan learners with a live streak and send a streak-save nudge
 * to those who are at risk, inside their send window, and not frequency-capped.
 * Timezone + send-time + cap are all evaluated by the pure eligibility module.
 */
export async function runStreakReminders(now: Date = new Date()): Promise<ReminderRunSummary> {
  const admin = supabaseAdmin()
  const nowISO = now.toISOString()
  const skipped: Record<string, number> = {}
  const bump = (k: string) => {
    skipped[k] = (skipped[k] ?? 0) + 1
  }

  const { data: streaks } = await admin
    .from('academy_streaks')
    .select('user_id, current_length, last_active_date, timezone')
    .gte('current_length', 1)

  const rows = streaks ?? []
  let eligible = 0
  let sent = 0

  // TODO(scale): 2–3 sequential DB round-trips per learner. Batch push_subs +
  // last-sent lookups (single `.in()` queries) when active streaks exceed ~500.
  for (const row of rows) {
    const tz = (row.timezone as string) ?? 'UTC'
    const today = dateInTz(now, tz)
    const localHour = localHourInTz(now, tz)
    const userId = row.user_id as string

    const hasPush = (await pushSubsFor(userId)).length > 0
    const hasEmail = hasPush ? true : Boolean(await emailFor(userId))
    const last = await lastSentAt(userId, 'streak_save')

    const decision = shouldSendStreakReminder({
      current: row.current_length as number,
      lastActive: (row.last_active_date as string | null) ?? null,
      today,
      localHour,
      lastSentISO: last,
      nowISO,
      hasChannel: hasPush || hasEmail,
    })

    if (!decision.send) {
      bump(decision.reason)
      continue
    }
    eligible++
    if (await sendStreakSave(userId, row.current_length as number)) sent++
    else bump('send_failed')
  }

  return { scanned: rows.length, eligible, sent, skipped }
}
