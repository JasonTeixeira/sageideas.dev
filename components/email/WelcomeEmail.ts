import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type WelcomeEmailProps = { to: string; fullName?: string };

export function renderWelcomeEmail({ to, fullName }: WelcomeEmailProps) {
  const greeting = fullName ? `Hi ${escapeHtml(fullName)}` : 'Hi there';
  const body = `
${renderHeading('Welcome to Sage Ideas Studio')}
${renderParagraph(`${greeting} &mdash; thanks for requesting access. Your account is in the queue. Every signup is reviewed manually so the studio stays small and focused.`)}
${renderCallout("What's next", `<ol style="margin:0;padding-left:18px;">
<li style="margin-bottom:4px;">We review your request (typically same business day).</li>
<li style="margin-bottom:4px;">You will get an approval email when your workspace is ready.</li>
<li>Sign in and you will land directly in your portal.</li>
</ol>`)}
${renderButton('Open the portal', `${SITE}/portal`)}
${renderParagraph('The portal link works once you are approved. Until then, you will see a pending screen.')}
`;
  const text = `${fullName ? `Hi ${fullName}` : 'Hi there'} - thanks for requesting access to Sage Ideas Studio.\n\nYour account is in the queue. We review every signup manually. You will get an approval email when your workspace is ready, then you can sign in at ${SITE}/login.\n\n- Sage Ideas`;
  return {
    subject: 'Welcome to Sage Ideas Studio',
    html: renderLayout({ recipient: to, title: 'Welcome to Sage Ideas Studio', preheader: 'Your access request is in the queue.', bodyHtml: body }),
    text,
  };
}
