import { sendEmail, SITE } from '@/lib/email/send';

type WelcomeEmailInput = {
  to: string;
  fullName?: string;
};

export type WelcomeEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'missing_api_key' | 'send_failed'; error?: string };

function renderHtml({ fullName, to }: { fullName: string; to: string }) {
  const greeting = fullName ? `Hi ${escapeHtml(fullName)}` : 'Hi there';
  const unsubscribeUrl = `${SITE}/unsubscribe?email=${encodeURIComponent(to)}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Welcome to Sage Ideas Studio</title>
  </head>
  <body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#FAFAFA;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F0F12;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 12px 32px;border-bottom:1px solid #1F1F23;">
                <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#06B6D4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">Sage Ideas Studio</div>
                <div style="font-size:13px;color:#71717A;margin-top:4px;">Studio access. Built for clients and craft.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#FAFAFA;font-weight:600;letter-spacing:-0.01em;">Welcome to Sage Ideas Studio</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#A1A1AA;">${greeting} — thanks for requesting access. Your account is in the queue. We review every signup manually so the studio stays small and focused.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 8px 32px;">
                <div style="background:#0A0A0C;border:1px solid #27272A;border-radius:12px;padding:18px 20px;">
                  <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#71717A;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:8px;">What's next</div>
                  <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#D4D4D8;">
                    <li>We review your request (typically same business day).</li>
                    <li>You'll get an approval email when your workspace is ready.</li>
                    <li>Sign in and you'll land directly in your portal.</li>
                  </ol>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px 32px;">
                <a href="${SITE}/portal/home" style="display:inline-block;background:#06B6D4;color:#09090B;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:10px;">Open the portal</a>
                <div style="font-size:12px;color:#71717A;margin-top:14px;line-height:1.6;">The portal link works once you're approved. Until then, you'll see a pending screen.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 24px 32px;border-top:1px solid #1F1F23;">
                <div style="font-size:11px;color:#52525B;line-height:1.6;">
                  Sent to ${escapeHtml(to)} · <a href="${unsubscribeUrl}" style="color:#71717A;text-decoration:underline;">Unsubscribe</a><br/>
                  © ${new Date().getFullYear()} Sage Ideas · sageideas.dev
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendWelcomeEmail({ to, fullName = '' }: WelcomeEmailInput): Promise<WelcomeEmailResult> {
  const result = await sendEmail({
      to,
      subject: 'Welcome to Sage Ideas Studio',
      html: renderHtml({ fullName, to }),
      text: `${fullName ? `Hi ${fullName}` : 'Hi there'} — thanks for requesting access to Sage Ideas Studio.\n\nYour account is in the queue. We review every signup manually. You'll get an approval email when your workspace is ready, then you can sign in at ${SITE}/login.\n\n— Sage Ideas\nUnsubscribe: ${SITE}/unsubscribe?email=${encodeURIComponent(to)}`,
      headers: {
        'List-Unsubscribe': `<${SITE}/unsubscribe?email=${encodeURIComponent(to)}>`,
      },
      templateKey: 'studio_welcome',
      metadata: { fullName: fullName || null },
    });
  if (result.ok) return { ok: true, id: result.id };
  return {
    ok: false,
    reason: result.reason === 'missing_api_key' ? 'missing_api_key' : 'send_failed',
    error: result.reason,
  };
}
