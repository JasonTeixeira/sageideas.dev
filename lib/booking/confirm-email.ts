import { createEvent } from 'ics'
import { sendEmail } from '@/lib/email/send'

const FROM = 'Sage Ideas <sage@sageideas.dev>'
const SITE = 'https://www.sageideas.dev'

const OPERATOR_EMAIL = process.env.BOOKING_NOTIFY_EMAIL || 'sage@sageideas.dev'

interface ConfirmInput {
  to: string
  name?: string
  startUtc: Date
  durationMinutes: number
  icsUid: string
  notes?: string
  company?: string
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** ICS calendar invite for the booking (UTC). */
function buildIcs({ startUtc, durationMinutes, icsUid, name }: ConfirmInput): string | null {
  const { error, value } = createEvent({
    start: [
      startUtc.getUTCFullYear(),
      startUtc.getUTCMonth() + 1,
      startUtc.getUTCDate(),
      startUtc.getUTCHours(),
      startUtc.getUTCMinutes(),
    ],
    startInputType: 'utc',
    duration: { minutes: durationMinutes },
    title: 'Discovery call — Sage Ideas',
    description: 'A 30-minute discovery call with Jason Teixeira (Sage Ideas). No pitch deck, no obligation.',
    organizer: { name: 'Jason Teixeira', email: 'sage@sageideas.dev' },
    attendees: name ? [{ name, rsvp: true }] : undefined,
    uid: icsUid,
    status: 'CONFIRMED',
  })
  return error ? null : value ?? null
}

function whenLabel(startUtc: Date): string {
  // Render in the operator's timezone for the email body (the booker's client showed their own).
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(startUtc)
}

/** Send the booking confirmation with an .ics invite. Best-effort. */
export async function sendBookingConfirmation(input: ConfirmInput): Promise<{ ok: boolean }> {
  const when = whenLabel(input.startUtc)
  const greeting = input.name ? `Hi ${escapeHtml(input.name)}` : 'Hi there'
  const ics = buildIcs(input)

  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#0B0B0E;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#F2EFE9;">
  <table role="presentation" width="100%" style="background:#0B0B0E;padding:32px 16px;"><tr><td align="center">
  <table role="presentation" width="560" style="max-width:560px;background:#141418;border:1px solid #1E1E24;border-radius:16px;overflow:hidden;"><tr>
  <td style="padding:28px 32px 12px;border-bottom:1px solid #1E1E24;">
    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#3D5AFE;font-family:ui-monospace,monospace;">Sage Ideas Studio</div>
    <div style="font-size:13px;color:#8A8A94;margin-top:4px;">Discovery call · confirmed</div>
  </td></tr><tr><td style="padding:28px 32px 8px;">
    <h1 style="margin:0 0 12px;font-size:22px;color:#F2EFE9;font-weight:600;">You're booked.</h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9C9CA6;">${greeting} — your 30-minute discovery call is confirmed for:</p>
    <div style="background:#0B0B0E;border:1px solid #2A2A33;border-radius:12px;padding:18px 20px;font-size:16px;color:#F2EFE9;font-weight:600;">${escapeHtml(when)}</div>
    <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#8A8A94;">A calendar invite is attached. I'll send the meeting link before the call. No pitch deck — just a direct conversation about your project. Need to change it? Reply to this email.</p>
  </td></tr><tr><td style="padding:18px 32px 24px;border-top:1px solid #1E1E24;">
    <div style="font-size:11px;color:#52525B;line-height:1.6;">Sent to ${escapeHtml(input.to)} · © ${new Date().getFullYear()} Sage Ideas · sageideas.dev</div>
  </td></tr></table></td></tr></table></body></html>`

  try {
    const result = await sendEmail({
      from: FROM,
      to: input.to,
      subject: `Confirmed: discovery call — ${when}`,
      html,
      text: `${input.name ? `Hi ${input.name}` : 'Hi there'} — your 30-minute discovery call with Sage Ideas is confirmed for ${when}. A calendar invite is attached; I'll send the meeting link before the call. Reply to reschedule.\n\n— Jason, Sage Ideas (${SITE})`,
      attachments: ics ? [{ filename: 'sage-discovery-call.ics', content: Buffer.from(ics).toString('base64') }] : undefined,
      templateKey: 'booking_confirmation',
      metadata: { icsUid: input.icsUid, startUtc: input.startUtc.toISOString() },
    })
    return { ok: result.ok }
  } catch {
    return { ok: false }
  }
}

/** Notify the operator (you) the moment someone books — with the .ics so it lands on your calendar. */
export async function sendBookingNotification(input: ConfirmInput): Promise<{ ok: boolean }> {
  const when = whenLabel(input.startUtc)
  const ics = buildIcs(input)
  const rows = [
    ['Name', input.name || '—'],
    ['Email', input.to],
    ['Company', input.company || '—'],
    ['When', when],
    ['Notes', input.notes || '—'],
  ]
  const html = `<!doctype html><html><body style="margin:0;background:#0B0B0E;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#F2EFE9;">
  <table role="presentation" width="100%" style="background:#0B0B0E;padding:28px 16px;"><tr><td align="center">
  <table role="presentation" width="560" style="max-width:560px;background:#141418;border:1px solid #1E1E24;border-radius:14px;overflow:hidden;"><tr>
  <td style="padding:22px 28px;border-bottom:1px solid #1E1E24;">
    <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#18b663;font-family:ui-monospace,monospace;">New discovery-call booking</div>
    <div style="font-size:20px;color:#F2EFE9;font-weight:600;margin-top:6px;">${escapeHtml(input.name || 'Someone')} booked you</div>
  </td></tr><tr><td style="padding:18px 28px 24px;">
    <table role="presentation" width="100%" style="font-size:14px;line-height:1.7;">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="color:#8A8A94;width:90px;vertical-align:top;padding:3px 0;">${k}</td><td style="color:#F2EFE9;padding:3px 0;">${escapeHtml(String(v))}</td></tr>`,
        )
        .join('')}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#8A8A94;">Calendar invite attached. Reply to ${escapeHtml(input.to)} to send the meeting link.</p>
  </td></tr></table></td></tr></table></body></html>`

  try {
    const result = await sendEmail({
      from: FROM,
      to: OPERATOR_EMAIL,
      replyTo: input.to,
      subject: `📅 New booking: ${input.name || 'Discovery call'} — ${when}`,
      html,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      attachments: ics ? [{ filename: 'sage-discovery-call.ics', content: Buffer.from(ics).toString('base64') }] : undefined,
      templateKey: 'booking_operator_notification',
      metadata: { icsUid: input.icsUid, startUtc: input.startUtc.toISOString() },
    })
    return { ok: result.ok }
  } catch {
    return { ok: false }
  }
}
