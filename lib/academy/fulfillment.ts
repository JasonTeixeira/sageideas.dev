import type Stripe from 'stripe'
import { getAcademyProductBySlug } from '@/data/academy/products'
import { sendEmail, SITE } from '@/lib/email/send'
import { captureLead } from '@/lib/leads/capture'
import type { supabaseAdmin } from '@/lib/supabase/server'

type SupabaseAdminClient = ReturnType<typeof supabaseAdmin>

export type AcademyFulfillmentResult = {
  trackSlug: string
  email: string
  enrollmentId: string | null
  emailStatus: 'sent' | 'failed' | 'dead_lettered'
}

export async function fulfillAcademyCheckout(
  sb: SupabaseAdminClient,
  session: Stripe.Checkout.Session,
): Promise<AcademyFulfillmentResult> {
  const trackSlug = session.metadata?.track_slug
  if (!trackSlug) throw new Error('academy checkout missing track_slug metadata')

  const product = getAcademyProductBySlug(trackSlug)
  if (!product) throw new Error(`unknown academy track: ${trackSlug}`)

  const email = session.customer_details?.email ?? session.customer_email
  if (!email) throw new Error(`academy checkout ${session.id} missing customer email`)

  const name = session.customer_details?.name ?? null
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null
  const stripeCustomerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null

  const { data, error } = await sb
    .from('academy_enrollments')
    .upsert(
      {
        track_slug: product.trackSlug,
        product_name: product.name,
        email,
        name,
        status: 'active',
        amount_cents: session.amount_total ?? product.priceCents,
        currency: session.currency ?? 'usd',
        stripe_checkout_session_id: session.id,
        stripe_customer_id: stripeCustomerId,
        stripe_payment_intent_id: paymentIntentId,
        access_starts_at: new Date().toISOString(),
        access_expires_at: accessExpiresAt(),
        updated_at: new Date().toISOString(),
        metadata: {
          stripeMode: session.mode,
          priceLabel: product.priceLabel,
          packageIncludes: product.packageIncludes,
        },
      },
      { onConflict: 'stripe_checkout_session_id' },
    )
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`academy enrollment upsert failed: ${error.message}`)

  await captureLead({
    source: 'checkout',
    email,
    name,
    detail: `Academy enrollment: ${product.name}`,
    amountCents: session.amount_total ?? product.priceCents,
    notify: false,
    metadata: {
      kind: 'academy',
      trackSlug: product.trackSlug,
      sessionId: session.id,
    },
  })

  const emailResult = await sendAcademyConfirmationEmail({
    email,
    name,
    trackTitle: product.name.replace(' — Founding Access', ''),
    productName: product.name,
    priceLabel: product.priceLabel,
    trackSlug: product.trackSlug,
    packageIncludes: product.packageIncludes,
  })

  return {
    trackSlug: product.trackSlug,
    email,
    enrollmentId: data?.id ?? null,
    emailStatus: emailResult.ok ? 'sent' : emailResult.status,
  }
}

function accessExpiresAt() {
  const date = new Date()
  date.setMonth(date.getMonth() + 12)
  return date.toISOString()
}

async function sendAcademyConfirmationEmail(input: {
  email: string
  name: string | null
  trackTitle: string
  productName: string
  priceLabel: string
  trackSlug: string
  packageIncludes: string[]
}) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)}` : 'Hi there'
  const accessUrl = `${SITE}/academy/${input.trackSlug}/enroll?checkout=success`
  const includes = input.packageIncludes
    .map((item) => `<li style="margin:0 0 8px 0;">${escapeHtml(item)}</li>`)
    .join('')

  return sendEmail({
    to: input.email,
    subject: `You're enrolled: ${input.trackTitle}`,
    templateKey: 'academy_enrollment_confirmation',
    metadata: {
      kind: 'academy',
      trackSlug: input.trackSlug,
      productName: input.productName,
    },
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Academy enrollment confirmed</title>
  </head>
  <body style="margin:0;padding:0;background:#0B0B0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F2EFE9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0E;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#141418;border:1px solid #1E1E24;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;border-bottom:1px solid #1E1E24;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#3D5AFE;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">Sage Academy</div>
                <h1 style="margin:12px 0 0 0;font-size:28px;line-height:1.15;color:#F2EFE9;">Enrollment confirmed.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#D8D4CE;">${greeting} — your ${escapeHtml(input.productName)} enrollment is active.</p>
                <p style="margin:0 0 20px 0;font-size:14px;line-height:1.7;color:#8A8A94;">Purchase amount: ${escapeHtml(input.priceLabel)}. Access is recorded for this email and includes updates to this track for at least 12 months.</p>
                <div style="background:#0B0B0E;border:1px solid #1E1E24;border-radius:6px;padding:18px 20px;margin:20px 0;">
                  <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#8A8A94;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:12px;">Included</div>
                  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#D8D4CE;">${includes}</ul>
                </div>
                <a href="${accessUrl}" style="display:inline-block;background:#3D5AFE;color:#0B0B0E;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:6px;">Open the academy track</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 24px 32px;border-top:1px solid #1E1E24;">
                <div style="font-size:11px;color:#8A8A94;line-height:1.6;">Sent to ${escapeHtml(input.email)} · Sage Ideas · ${SITE}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `${input.name ? `Hi ${input.name}` : 'Hi there'} — your ${input.productName} enrollment is active.\n\nIncluded:\n${input.packageIncludes.map((item) => `- ${item}`).join('\n')}\n\nOpen the track: ${accessUrl}`,
  })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
