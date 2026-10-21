import { Resend } from 'resend'

export type NewsletterAudienceResult =
  | { ok: true }
  | { ok: false; reason: 'not_configured' | 'provider_error' }

function client(): { resend: Resend; audienceId: string } | null {
  const key = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!key || !audienceId) return null
  return { resend: new Resend(key), audienceId }
}

export async function addContact(email: string): Promise<NewsletterAudienceResult> {
  const c = client()
  if (!c) return { ok: false, reason: 'not_configured' }
  try {
    await c.resend.contacts.create({ email, audienceId: c.audienceId, unsubscribed: false })
    return { ok: true }
  } catch (err) {
    console.warn('[newsletter] addContact failed:', err instanceof Error ? err.message : err)
    return { ok: false, reason: 'provider_error' }
  }
}

export async function unsubscribeContact(email: string): Promise<NewsletterAudienceResult> {
  const c = client()
  if (!c) return { ok: false, reason: 'not_configured' }
  try {
    await c.resend.contacts.update({ email, audienceId: c.audienceId, unsubscribed: true })
    return { ok: true }
  } catch (err) {
    console.warn('[newsletter] unsubscribeContact failed:', err instanceof Error ? err.message : err)
    return { ok: false, reason: 'provider_error' }
  }
}
