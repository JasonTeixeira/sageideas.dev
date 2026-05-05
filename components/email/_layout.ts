// Shared email layout primitives. Pure HTML strings — table-based for client compat.
// No JSX. Imported by every template under components/email/*.

export const SITE = 'https://www.sageideas.dev';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function unsubscribeUrl(recipient: string): string {
  return `${SITE}/unsubscribe?email=${encodeURIComponent(recipient)}`;
}

type LayoutInput = {
  recipient: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
};

export function renderLayout({ recipient, title, preheader = '', bodyHtml }: LayoutInput): string {
  const unsub = unsubscribeUrl(recipient);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark light" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#09090B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#FAFAFA;">
    ${preheader ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preheader)}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0F0F12;border:1px solid #27272A;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(90deg,#0EA5E9 0%,#06B6D4 50%,#14B8A6 100%);padding:14px 32px;">
                <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#0A2027;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;">Sage Ideas Studio</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 24px 32px;border-top:1px solid #1F1F23;">
                <div style="font-size:11px;color:#52525B;line-height:1.6;">
                  Sent to ${escapeHtml(recipient)} &middot; <a href="${unsub}" style="color:#71717A;text-decoration:underline;">Unsubscribe</a><br/>
                  Powered by Sage Ideas Studio &middot; &copy; ${new Date().getFullYear()} sageideas.dev
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

export function renderHeading(text: string): string {
  return `<h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#FAFAFA;font-weight:600;letter-spacing:-0.01em;">${escapeHtml(text)}</h1>`;
}

export function renderParagraph(html: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#A1A1AA;">${html}</p>`;
}

export function renderButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0 20px 0;"><tr><td style="background:#06B6D4;border-radius:10px;"><a href="${url}" style="display:inline-block;color:#09090B;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;">${escapeHtml(label)}</a></td></tr></table>`;
}

export function renderCallout(label: string, body: string): string {
  return `<div style="background:#0A0A0C;border:1px solid #27272A;border-radius:12px;padding:18px 20px;margin:8px 0 16px 0;">
    <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#71717A;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:8px;">${escapeHtml(label)}</div>
    <div style="font-size:14px;line-height:1.7;color:#D4D4D8;">${body}</div>
  </div>`;
}
