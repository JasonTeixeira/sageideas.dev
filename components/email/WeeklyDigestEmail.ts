import {
  SITE,
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
} from './_layout';

export type WeeklyDigestSection = {
  label: string;
  items: Array<{ title: string; meta?: string; url?: string }>;
};

export type WeeklyDigestEmailProps = {
  to: string;
  fullName?: string;
  weekOf: string;
  activeProjects: number;
  awaitingApproval: number;
  upcomingMilestones: number;
  sections: WeeklyDigestSection[];
};

function renderSection(s: WeeklyDigestSection) {
  if (s.items.length === 0) return '';
  const rows = s.items
    .map((it) => {
      const titleHtml = it.url
        ? `<a href="${it.url}" style="color:#06B6D4;text-decoration:none;">${escapeHtml(it.title)}</a>`
        : `<span style="color:#FAFAFA;">${escapeHtml(it.title)}</span>`;
      const metaHtml = it.meta
        ? `<div style="color:#71717A;font-size:12px;margin-top:2px;">${escapeHtml(it.meta)}</div>`
        : '';
      return `<div style="padding:10px 0;border-bottom:1px solid #1F1F23;">${titleHtml}${metaHtml}</div>`;
    })
    .join('');
  return `
<div style="margin-top:20px;">
  <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#71717A;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:6px;">${escapeHtml(s.label)}</div>
  <div style="background:#0A0A0C;border:1px solid #27272A;border-radius:12px;padding:0 16px;">${rows}</div>
</div>`;
}

export function renderWeeklyDigestEmail(p: WeeklyDigestEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const stats = `<div style="display:block;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;">
      <tr>
        <td style="background:#0A0A0C;border:1px solid #27272A;border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.12em;">Active</div>
          <div style="font-size:22px;color:#FAFAFA;font-weight:600;margin-top:4px;">${p.activeProjects}</div>
        </td>
        <td style="width:8px;"></td>
        <td style="background:#0A0A0C;border:1px solid #27272A;border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.12em;">Awaiting</div>
          <div style="font-size:22px;color:#FAFAFA;font-weight:600;margin-top:4px;">${p.awaitingApproval}</div>
        </td>
        <td style="width:8px;"></td>
        <td style="background:#0A0A0C;border:1px solid #27272A;border-radius:10px;padding:14px;text-align:center;">
          <div style="font-size:11px;color:#71717A;text-transform:uppercase;letter-spacing:0.12em;">Upcoming</div>
          <div style="font-size:22px;color:#FAFAFA;font-weight:600;margin-top:4px;">${p.upcomingMilestones}</div>
        </td>
      </tr>
    </table>
  </div>`;
  const sectionsHtml = p.sections.map(renderSection).join('');
  const body = `
${renderHeading(`Weekly digest &mdash; ${escapeHtml(p.weekOf)}`)}
${renderParagraph(`${greeting} &mdash; here is what is on your plate this week.`)}
${stats}
${sectionsHtml || renderParagraph('Nothing pending. Quiet weeks are good weeks.')}
${renderButton('Open portal', `${SITE}/portal`)}
${renderParagraph('Switch off this digest in <a href="' + SITE + '/portal/settings" style="color:#06B6D4;text-decoration:underline;">notification preferences</a>.')}
`;
  const text = `Weekly digest - ${p.weekOf}\n\nActive projects: ${p.activeProjects}\nAwaiting approval: ${p.awaitingApproval}\nUpcoming milestones: ${p.upcomingMilestones}\n\nPortal: ${SITE}/portal`;
  return {
    subject: `Sage Ideas - weekly digest (${p.weekOf})`,
    html: renderLayout({ recipient: p.to, title: 'Weekly digest', preheader: `${p.activeProjects} active, ${p.awaitingApproval} awaiting decision.`, bodyHtml: body }),
    text,
  };
}
