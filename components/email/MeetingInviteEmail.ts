import {
  escapeHtml,
  renderLayout,
  renderHeading,
  renderParagraph,
  renderButton,
  renderCallout,
} from './_layout';

export type MeetingInviteEmailProps = {
  to: string;
  fullName?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  startsAtIso: string;
  endsAtIso: string;
  location?: string;
  description?: string;
  uid: string;
  organizerEmail?: string;
  detailsUrl?: string;
};

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toIcsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

export function buildIcs(p: MeetingInviteEmailProps): string {
  const dtstamp = toIcsDate(new Date().toISOString());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sage Ideas Studio//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(p.uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toIcsDate(p.startsAtIso)}`,
    `DTEND:${toIcsDate(p.endsAtIso)}`,
    `SUMMARY:${escapeIcs(p.title)}`,
  ];
  if (p.description) lines.push(`DESCRIPTION:${escapeIcs(p.description)}`);
  if (p.location) lines.push(`LOCATION:${escapeIcs(p.location)}`);
  if (p.organizerEmail) lines.push(`ORGANIZER;CN=Sage Ideas:mailto:${p.organizerEmail}`);
  lines.push(`ATTENDEE;RSVP=TRUE:mailto:${p.to}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function renderMeetingInviteEmail(p: MeetingInviteEmailProps) {
  const greeting = p.fullName ? `Hi ${escapeHtml(p.fullName)}` : 'Hi';
  const body = `
${renderHeading(`Calendar invite: ${escapeHtml(p.title)}`)}
${renderParagraph(`${greeting} &mdash; adding this to your calendar. The .ics file is attached.`)}
${renderCallout('Meeting', `
<div>When: <strong style="color:#FAFAFA;">${escapeHtml(p.startsAt)} &rarr; ${escapeHtml(p.endsAt)}</strong></div>
${p.location ? `<div>Where: <strong style="color:#FAFAFA;">${escapeHtml(p.location)}</strong></div>` : ''}
${p.description ? `<div style="margin-top:8px;color:#A1A1AA;">${escapeHtml(p.description)}</div>` : ''}
`)}
${p.detailsUrl ? renderButton('Open in portal', p.detailsUrl) : ''}
${renderParagraph('Reply with conflicts and we will re-slot.')}
`;
  const text = `Calendar invite: ${p.title}\n\n${p.startsAt} -> ${p.endsAt}${p.location ? `\nLocation: ${p.location}` : ''}${p.description ? `\n\n${p.description}` : ''}${p.detailsUrl ? `\n\nDetails: ${p.detailsUrl}` : ''}`;
  return {
    subject: `Calendar invite: ${p.title}`,
    html: renderLayout({ recipient: p.to, title: 'Meeting invite', preheader: `${p.startsAt} - ${p.title}`, bodyHtml: body }),
    text,
    ics: buildIcs(p),
  };
}
