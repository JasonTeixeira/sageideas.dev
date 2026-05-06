import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail, SITE } from './send';
import { renderWelcomeEmail } from '@/components/email/WelcomeEmail';
import { renderApprovalEmail } from '@/components/email/ApprovalEmail';
import { renderInvoiceSentEmail } from '@/components/email/InvoiceSentEmail';
import { renderPaymentReceivedEmail } from '@/components/email/PaymentReceivedEmail';
import { renderInvoiceReminderEmail, type ReminderLevel } from '@/components/email/InvoiceReminderEmail';
import { renderContractSentForSignatureEmail } from '@/components/email/ContractSentForSignatureEmail';
import { renderContractSignedEmail } from '@/components/email/ContractSignedEmail';
import { renderMessageNotificationEmail } from '@/components/email/MessageNotificationEmail';
import { renderMeetingInviteEmail } from '@/components/email/MeetingInviteEmail';
import { renderProjectStatusUpdateEmail } from '@/components/email/ProjectStatusUpdateEmail';
import { renderWeeklyDigestEmail, type WeeklyDigestSection } from '@/components/email/WeeklyDigestEmail';
import { renderDocumentSharedEmail } from '@/components/email/DocumentSharedEmail';

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

type Prefs = {
  email_message?: boolean;
  email_deliverable?: boolean;
  email_invoice?: boolean;
  email_status_report?: boolean;
  email_marketing?: boolean;
  digest_frequency?: string | null;
};

type PrefKey = keyof Pick<Prefs, 'email_message' | 'email_deliverable' | 'email_invoice' | 'email_status_report' | 'email_marketing'>;

async function fetchProfileAndPrefs(userId: string): Promise<{ profile: Profile | null; prefs: Prefs | null }> {
  const sb = supabaseAdmin();
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    sb.from('profiles').select('id, email, full_name').eq('id', userId).maybeSingle(),
    sb.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  return { profile: profile as Profile | null, prefs: prefs as Prefs | null };
}

function emailEnabled(prefs: Prefs | null, key: PrefKey): boolean {
  if (!prefs) return true;
  const v = prefs[key];
  return v === undefined || v === null ? true : !!v;
}

async function insertNotification(row: {
  user_id: string;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  payload?: Record<string, unknown>;
}) {
  const sb = supabaseAdmin();
  await sb.from('notifications').insert({
    user_id: row.user_id,
    kind: row.kind,
    title: row.title,
    body: row.body ?? null,
    link: row.link ?? null,
    payload: row.payload ?? {},
  });
}

export async function notifyProfileCreated(userId: string) {
  const { profile } = await fetchProfileAndPrefs(userId);
  if (!profile?.email) return { ok: false, reason: 'no_email' as const };
  await insertNotification({
    user_id: userId,
    kind: 'welcome',
    title: 'Welcome to Sage Ideas Studio',
    body: 'Your access request is in the queue.',
    link: '/portal',
  });
  const tpl = renderWelcomeEmail({ to: profile.email, fullName: profile.full_name ?? undefined });
  return sendEmail({
    to: profile.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateKey: 'welcome',
    userId,
  });
}

export async function notifyProfileApproved(userId: string) {
  const { profile } = await fetchProfileAndPrefs(userId);
  if (!profile?.email) return { ok: false, reason: 'no_email' as const };
  await insertNotification({
    user_id: userId,
    kind: 'approval',
    title: "You're approved",
    body: 'Your workspace is live. Sign in to get started.',
    link: '/portal',
  });
  const tpl = renderApprovalEmail({ to: profile.email, fullName: profile.full_name ?? undefined });
  return sendEmail({
    to: profile.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateKey: 'approval',
    userId,
  });
}

export async function notifyInvoiceSent(invoiceId: string) {
  const sb = supabaseAdmin();
  const { data: inv } = await sb
    .from('invoices')
    .select('id, invoice_number, total, amount, currency, due_date, organization_id, pdf_url, hosted_invoice_url, status, payment_url')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) return { ok: false, reason: 'no_invoice' as const };

  const recipients = await getOrgClientUsers((inv.organization_id as string) ?? '');
  if (recipients.length === 0) return { ok: false, reason: 'no_recipients' as const };

  const amount = Number((inv.total ?? inv.amount ?? 0));
  const currency = ((inv.currency as string | null) ?? 'usd');
  const amountFormatted = formatMoney(amount, currency);
  const invoiceNumber = String(inv.invoice_number ?? inv.id);
  const payUrl = (inv.payment_url as string | null) ?? (inv.hosted_invoice_url as string | null) ?? `${SITE}/portal/invoices/${inv.id}`;
  const pdfUrl = (inv.pdf_url as string | null) ?? undefined;
  const dueDate = inv.due_date ? new Date(inv.due_date as string).toLocaleDateString() : undefined;

  let sent = 0;
  for (const r of recipients) {
    const { prefs } = await fetchProfileAndPrefs(r.id);
    await insertNotification({
      user_id: r.id,
      kind: 'invoice_sent',
      title: `Invoice #${invoiceNumber} - ${amountFormatted}`,
      body: dueDate ? `Due ${dueDate}.` : 'Ready to pay.',
      link: `/portal/invoices/${inv.id}`,
      payload: { invoiceId: inv.id },
    });
    if (!emailEnabled(prefs, 'email_invoice')) continue;
    const tpl = renderInvoiceSentEmail({
      to: r.email,
      fullName: r.full_name ?? undefined,
      invoiceNumber,
      amountFormatted,
      dueDate,
      payUrl,
      pdfUrl,
    });
    await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'invoice_sent',
      userId: r.id,
      metadata: { invoiceId: inv.id },
    });
    sent++;
  }
  return { ok: true as const, sent };
}

export async function notifyPaymentReceived(invoiceId: string) {
  const sb = supabaseAdmin();
  const { data: inv } = await sb
    .from('invoices')
    .select('id, invoice_number, total, amount, currency, paid_at, organization_id, hosted_invoice_url, receipt_url')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) return { ok: false, reason: 'no_invoice' as const };

  const recipients = await getOrgClientUsers((inv.organization_id as string) ?? '');
  if (recipients.length === 0) return { ok: false, reason: 'no_recipients' as const };

  const amount = Number(inv.total ?? inv.amount ?? 0);
  const amountFormatted = formatMoney(amount, (inv.currency as string | null) ?? 'usd');
  const invoiceNumber = String(inv.invoice_number ?? inv.id);
  const paidAt = inv.paid_at ? new Date(inv.paid_at as string).toLocaleString() : new Date().toLocaleString();
  const receiptUrl = (inv.receipt_url as string | null) ?? (inv.hosted_invoice_url as string | null) ?? undefined;

  for (const r of recipients) {
    const { prefs } = await fetchProfileAndPrefs(r.id);
    await insertNotification({
      user_id: r.id,
      kind: 'payment_received',
      title: `Payment received - invoice #${invoiceNumber}`,
      body: `${amountFormatted} cleared on ${paidAt}.`,
      link: `/portal/invoices/${inv.id}`,
      payload: { invoiceId: inv.id },
    });
    if (!emailEnabled(prefs, 'email_invoice')) continue;
    const tpl = renderPaymentReceivedEmail({
      to: r.email,
      fullName: r.full_name ?? undefined,
      invoiceNumber,
      amountFormatted,
      paidAt,
      receiptUrl,
    });
    await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'payment_received',
      userId: r.id,
      metadata: { invoiceId: inv.id },
    });
  }
  return { ok: true as const };
}

export async function notifyInvoiceReminder(invoiceId: string, level: ReminderLevel) {
  const sb = supabaseAdmin();
  const { data: inv } = await sb
    .from('invoices')
    .select('id, invoice_number, total, amount, currency, due_date, organization_id, hosted_invoice_url, payment_url')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!inv) return { ok: false, reason: 'no_invoice' as const };

  const recipients = await getOrgClientUsers((inv.organization_id as string) ?? '');
  if (recipients.length === 0) return { ok: false, reason: 'no_recipients' as const };

  const amount = Number(inv.total ?? inv.amount ?? 0);
  const amountFormatted = formatMoney(amount, (inv.currency as string | null) ?? 'usd');
  const invoiceNumber = String(inv.invoice_number ?? inv.id);
  const due = inv.due_date ? new Date(inv.due_date as string) : null;
  const daysOverdue = due ? Math.max(0, Math.floor((Date.now() - due.getTime()) / 86400000)) : 0;
  const payUrl = (inv.payment_url as string | null) ?? (inv.hosted_invoice_url as string | null) ?? `${SITE}/portal/invoices/${inv.id}`;

  for (const r of recipients) {
    const { prefs } = await fetchProfileAndPrefs(r.id);
    await insertNotification({
      user_id: r.id,
      kind: `invoice_reminder_${level}`,
      title: `Invoice #${invoiceNumber} - ${level} reminder`,
      body: `${amountFormatted}, ${daysOverdue} days past due.`,
      link: `/portal/invoices/${inv.id}`,
      payload: { invoiceId: inv.id, level },
    });
    if (!emailEnabled(prefs, 'email_invoice')) continue;
    const tpl = renderInvoiceReminderEmail({
      to: r.email,
      fullName: r.full_name ?? undefined,
      invoiceNumber,
      amountFormatted,
      daysOverdue,
      level,
      payUrl,
    });
    await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: `invoice_reminder_${level}`,
      userId: r.id,
      metadata: { invoiceId: inv.id, level, daysOverdue },
    });
  }
  return { ok: true as const };
}

export async function notifyContractSentForSignature(documentId: string) {
  const sb = supabaseAdmin();
  const { data: doc } = await sb
    .from('documents')
    .select('id, title, sign_token, sign_token_expires_at, recipient_email, recipient_name, organization_id')
    .eq('id', documentId)
    .maybeSingle();
  if (!doc) return { ok: false, reason: 'no_document' as const };

  const signUrl = doc.sign_token ? `${SITE}/sign/${doc.sign_token}` : `${SITE}/portal/documents/${doc.id}`;
  const expiresAt = doc.sign_token_expires_at
    ? new Date(doc.sign_token_expires_at as string).toLocaleDateString()
    : undefined;

  const recipientEmail = (doc.recipient_email as string | null) ?? '';
  const recipientName = (doc.recipient_name as string | null) ?? undefined;

  if (recipientEmail) {
    const userRow = await findProfileByEmail(recipientEmail);
    if (userRow) {
      await insertNotification({
        user_id: userRow.id,
        kind: 'contract_sent',
        title: `Contract to sign: ${doc.title}`,
        body: 'Review and sign in your portal.',
        link: `/sign/${doc.sign_token ?? ''}`,
        payload: { documentId: doc.id },
      });
    }
    const tpl = renderContractSentForSignatureEmail({
      to: recipientEmail,
      fullName: recipientName,
      documentTitle: String(doc.title ?? 'Contract'),
      signUrl,
      expiresAt,
    });
    await sendEmail({
      to: recipientEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'contract_sent',
      userId: userRow?.id,
      metadata: { documentId: doc.id },
    });
  }
  return { ok: true as const };
}

export async function notifyContractSigned(documentId: string) {
  const sb = supabaseAdmin();
  const { data: doc } = await sb
    .from('documents')
    .select('id, title, signed_at, signer_name, signer_email, signer_ip, pdf_url, sender_email, recipient_email, organization_id')
    .eq('id', documentId)
    .maybeSingle();
  if (!doc) return { ok: false, reason: 'no_document' as const };

  const signedAt = doc.signed_at ? new Date(doc.signed_at as string).toLocaleString() : new Date().toLocaleString();
  const signerName = String(doc.signer_name ?? 'Signer');
  const signerEmail = String(doc.signer_email ?? '');
  const ipAddress = (doc.signer_ip as string | null) ?? undefined;
  const pdfUrl = (doc.pdf_url as string | null) ?? undefined;

  const recipients: string[] = [];
  if (doc.sender_email) recipients.push(String(doc.sender_email));
  if (doc.recipient_email) recipients.push(String(doc.recipient_email));
  const unique = Array.from(new Set(recipients.map((e) => e.toLowerCase()))).filter(Boolean);

  for (const email of unique) {
    const userRow = await findProfileByEmail(email);
    if (userRow) {
      await insertNotification({
        user_id: userRow.id,
        kind: 'contract_signed',
        title: `Signed: ${doc.title}`,
        body: `Signed by ${signerName} on ${signedAt}.`,
        link: `/portal/documents/${doc.id}`,
        payload: { documentId: doc.id },
      });
    }
    const tpl = renderContractSignedEmail({
      to: email,
      fullName: userRow?.full_name ?? undefined,
      documentTitle: String(doc.title ?? 'Contract'),
      signedAt,
      signerName,
      signerEmail,
      ipAddress,
      pdfUrl,
    });
    await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'contract_signed',
      userId: userRow?.id,
      metadata: { documentId: doc.id },
    });
  }
  return { ok: true as const };
}

export async function notifyMessagePosted(messageId: string) {
  const sb = supabaseAdmin();
  const { data: msg } = await sb
    .from('messages')
    .select('id, body, content, engagement_id, sender_id, author_id, created_at')
    .eq('id', messageId)
    .maybeSingle();
  if (!msg) return { ok: false, reason: 'no_message' as const };

  const senderId = ((msg.sender_id ?? msg.author_id) as string | null) ?? null;
  const engagementId = (msg.engagement_id as string | null) ?? null;
  const previewRaw = String(msg.body ?? msg.content ?? '');

  let projectTitle = 'your project';
  let organizationId: string | null = null;
  if (engagementId) {
    const { data: eng } = await sb
      .from('engagements')
      .select('id, title, organization_id')
      .eq('id', engagementId)
      .maybeSingle();
    if (eng) {
      projectTitle = String(eng.title ?? 'your project');
      organizationId = (eng.organization_id as string | null) ?? null;
    }
  }

  const senderProfile = senderId ? await findProfileById(senderId) : null;
  const senderName = senderProfile?.full_name ?? senderProfile?.email ?? 'A teammate';

  const recipients = organizationId ? await getOrgClientUsers(organizationId) : [];
  const filtered = recipients.filter((r) => r.id !== senderId);

  for (const r of filtered) {
    const { prefs } = await fetchProfileAndPrefs(r.id);
    await insertNotification({
      user_id: r.id,
      kind: 'message',
      title: `New message in ${projectTitle}`,
      body: previewRaw.slice(0, 140),
      link: engagementId ? `/portal/projects/${engagementId}` : '/portal/messages',
      payload: { messageId: msg.id, engagementId },
    });
    if (!emailEnabled(prefs, 'email_message')) continue;
    const tpl = renderMessageNotificationEmail({
      to: r.email,
      fullName: r.full_name ?? undefined,
      projectTitle,
      senderName: String(senderName),
      preview: previewRaw,
      threadUrl: engagementId ? `${SITE}/portal/projects/${engagementId}` : `${SITE}/portal/messages`,
    });
    await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'message',
      userId: r.id,
      metadata: { messageId: msg.id, engagementId },
    });
  }
  return { ok: true as const };
}

export async function notifyMeetingScheduled(eventId: string) {
  const sb = supabaseAdmin();
  const { data: ev } = await sb
    .from('calendar_events')
    .select('id, title, description, location, starts_at, ends_at, organization_id, engagement_id, owner_id')
    .eq('id', eventId)
    .maybeSingle();
  if (!ev) return { ok: false, reason: 'no_event' as const };

  const recipients = ev.organization_id ? await getOrgClientUsers(ev.organization_id as string) : [];
  for (const r of recipients) {
    const { prefs } = await fetchProfileAndPrefs(r.id);
    const startsAt = new Date(ev.starts_at as string).toLocaleString();
    const endsAt = new Date(ev.ends_at as string).toLocaleString();
    await insertNotification({
      user_id: r.id,
      kind: 'meeting',
      title: `Meeting: ${ev.title}`,
      body: `${startsAt}`,
      link: `/portal/calendar`,
      payload: { eventId: ev.id },
    });
    if (!emailEnabled(prefs, 'email_status_report')) continue;
    const tpl = renderMeetingInviteEmail({
      to: r.email,
      fullName: r.full_name ?? undefined,
      title: String(ev.title ?? 'Meeting'),
      startsAt,
      endsAt,
      startsAtIso: String(ev.starts_at),
      endsAtIso: String(ev.ends_at),
      location: (ev.location as string | null) ?? undefined,
      description: (ev.description as string | null) ?? undefined,
      uid: `${ev.id}@sageideas.dev`,
      organizerEmail: 'sage@sageideas.dev',
      detailsUrl: `${SITE}/portal/calendar`,
    });
    await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'meeting_invite',
      userId: r.id,
      attachments: [
        {
          filename: 'invite.ics',
          content: Buffer.from(tpl.ics).toString('base64'),
          contentType: 'text/calendar; charset=utf-8; method=REQUEST',
        },
      ],
      metadata: { eventId: ev.id },
    });
  }
  return { ok: true as const };
}

export async function notifyStatusUpdatePosted(updateId: string) {
  const sb = supabaseAdmin();
  const { data: upd } = await sb
    .from('project_status_updates')
    .select('id, title, summary, body, status_label, engagement_id, visible_to_client')
    .eq('id', updateId)
    .maybeSingle();
  if (!upd) return { ok: false, reason: 'no_update' as const };
  if (upd.visible_to_client === false) return { ok: false, reason: 'not_visible' as const };

  let projectTitle = 'project';
  let organizationId: string | null = null;
  if (upd.engagement_id) {
    const { data: eng } = await sb
      .from('engagements')
      .select('id, title, organization_id')
      .eq('id', upd.engagement_id as string)
      .maybeSingle();
    if (eng) {
      projectTitle = String(eng.title ?? 'project');
      organizationId = (eng.organization_id as string | null) ?? null;
    }
  }

  const recipients = organizationId ? await getOrgClientUsers(organizationId) : [];
  const summary = String(upd.summary ?? upd.body ?? upd.title ?? '');

  for (const r of recipients) {
    const { prefs } = await fetchProfileAndPrefs(r.id);
    await insertNotification({
      user_id: r.id,
      kind: 'status_update',
      title: `${projectTitle} - status update`,
      body: summary.slice(0, 140),
      link: upd.engagement_id ? `/portal/projects/${upd.engagement_id}` : '/portal',
      payload: { updateId: upd.id, engagementId: upd.engagement_id },
    });
    if (!emailEnabled(prefs, 'email_status_report')) continue;
    const tpl = renderProjectStatusUpdateEmail({
      to: r.email,
      fullName: r.full_name ?? undefined,
      projectTitle,
      summary,
      statusLabel: (upd.status_label as string | null) ?? undefined,
      detailsUrl: upd.engagement_id ? `${SITE}/portal/projects/${upd.engagement_id}` : `${SITE}/portal`,
    });
    await sendEmail({
      to: r.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      templateKey: 'status_update',
      userId: r.id,
      metadata: { updateId: upd.id },
    });
  }
  return { ok: true as const };
}

export async function sendWeeklyDigest(userId: string) {
  const { profile, prefs } = await fetchProfileAndPrefs(userId);
  if (!profile?.email) return { ok: false, reason: 'no_email' as const };
  if (prefs && prefs.digest_frequency && prefs.digest_frequency !== 'weekly') {
    return { ok: false, reason: 'digest_disabled' as const };
  }

  const sb = supabaseAdmin();
  const { data: appUser } = await sb.from('app_users').select('id').eq('clerk_id', userId).maybeSingle();
  let orgIds: string[] = [];
  if (appUser?.id) {
    const { data: memberships } = await sb
      .from('org_memberships')
      .select('organization_id')
      .eq('user_id', appUser.id);
    orgIds = ((memberships ?? []) as Array<{ organization_id: string }>).map((m) => m.organization_id).filter(Boolean);
  }

  let activeProjects = 0;
  let awaitingApproval = 0;
  let upcomingMilestones = 0;
  const sections: WeeklyDigestSection[] = [];

  if (orgIds.length > 0) {
    const { data: engs } = await sb
      .from('engagements')
      .select('id, title, status, pipeline_stage')
      .in('organization_id', orgIds);
    const engsArr = (engs ?? []) as Array<{ id: string; title: string | null; status: string | null; pipeline_stage: string | null }>;
    activeProjects = engsArr.filter((e) => {
      const s = String(e.status ?? e.pipeline_stage ?? '').toLowerCase();
      return s === 'active' || s === 'discovery' || s === 'review';
    }).length;
    if (engsArr.length > 0) {
      sections.push({
        label: 'Active projects',
        items: engsArr.slice(0, 6).map((e) => ({
          title: String(e.title ?? 'Untitled'),
          meta: e.status ? `Status: ${e.status}` : undefined,
          url: `${SITE}/portal/projects/${e.id}`,
        })),
      });
    }

    const engIds = engsArr.map((e) => e.id);
    if (engIds.length > 0) {
      const { data: deliverables } = await sb
        .from('deliverables')
        .select('id, title, status, engagement_id')
        .in('engagement_id', engIds)
        .in('status', ['awaiting_approval', 'in_review', 'pending_approval']);
      const delArr = (deliverables ?? []) as Array<{ id: string; title: string | null; status: string | null; engagement_id: string }>;
      awaitingApproval = delArr.length;
      if (delArr.length > 0) {
        sections.push({
          label: 'Awaiting your decision',
          items: delArr.slice(0, 6).map((d) => ({
            title: String(d.title ?? 'Deliverable'),
            url: `${SITE}/portal/projects/${d.engagement_id}`,
          })),
        });
      }

      const inSevenDays = new Date(Date.now() + 7 * 86400000).toISOString();
      const { data: milestones } = await sb
        .from('project_milestones')
        .select('id, title, due_date, engagement_id')
        .in('engagement_id', engIds)
        .gte('due_date', new Date().toISOString())
        .lte('due_date', inSevenDays);
      const msArr = (milestones ?? []) as Array<{ id: string; title: string | null; due_date: string | null; engagement_id: string }>;
      upcomingMilestones = msArr.length;
      if (msArr.length > 0) {
        sections.push({
          label: 'Upcoming milestones',
          items: msArr.slice(0, 6).map((m) => ({
            title: String(m.title ?? 'Milestone'),
            meta: m.due_date ? `Due ${new Date(m.due_date).toLocaleDateString()}` : undefined,
            url: `${SITE}/portal/projects/${m.engagement_id}`,
          })),
        });
      }
    }
  }

  const now = new Date();
  const weekOf = `${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${now.getFullYear()}`;
  const tpl = renderWeeklyDigestEmail({
    to: profile.email,
    fullName: profile.full_name ?? undefined,
    weekOf,
    activeProjects,
    awaitingApproval,
    upcomingMilestones,
    sections,
  });
  return sendEmail({
    to: profile.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateKey: 'weekly_digest',
    userId,
    metadata: { activeProjects, awaitingApproval, upcomingMilestones },
  });
}

// ----- helpers -----

type OrgClient = { id: string; email: string; full_name: string | null };

async function getOrgClientUsers(organizationId: string): Promise<OrgClient[]> {
  if (!organizationId) return [];
  const sb = supabaseAdmin();
  const { data: memberships } = await sb
    .from('org_memberships')
    .select('user_id')
    .eq('organization_id', organizationId);
  const appUserIds = ((memberships ?? []) as Array<{ user_id: string }>).map((m) => m.user_id).filter(Boolean);
  if (appUserIds.length === 0) return [];
  const { data: appUsers } = await sb
    .from('app_users')
    .select('id, clerk_id, email')
    .in('id', appUserIds);
  const profileIds = ((appUsers ?? []) as Array<{ clerk_id: string }>).map((u) => u.clerk_id).filter(Boolean);
  if (profileIds.length === 0) return [];
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .in('id', profileIds);
  const prof = (profiles ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>;
  return prof
    .map((p) => ({
      id: p.id,
      email: p.email ?? '',
      full_name: p.full_name ?? null,
    }))
    .filter((p) => !!p.email);
}

async function findProfileByEmail(email: string): Promise<{ id: string; email: string; full_name: string | null } | null> {
  if (!email) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; email: string | null; full_name: string | null };
  return { id: row.id, email: row.email ?? '', full_name: row.full_name ?? null };
}

async function findProfileById(id: string): Promise<{ id: string; email: string; full_name: string | null } | null> {
  if (!id) return null;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const row = data as { id: string; email: string | null; full_name: string | null };
  return { id: row.id, email: row.email ?? '', full_name: row.full_name ?? null };
}

export async function notifyDocumentShared(documentId: string) {
  const sb = supabaseAdmin();
  const { data: doc } = await sb
    .from('documents')
    .select('id, title, description, organization_id')
    .eq('id', documentId)
    .maybeSingle();
  if (!doc) return { ok: false, reason: 'no_document' as const };

  const { data: org } = await sb
    .from('organizations')
    .select('name, primary_contact_email')
    .eq('id', doc.organization_id as string)
    .maybeSingle();

  const recipientEmail = (org?.primary_contact_email as string | null) ?? '';
  if (!recipientEmail) return { ok: false, reason: 'no_recipient' as const };

  const userRow = await findProfileByEmail(recipientEmail);
  if (userRow) {
    await insertNotification({
      user_id: userRow.id,
      kind: 'document_shared',
      title: `Document shared: ${String(doc.title ?? 'Document')}`,
      body: 'Open the portal to view, download, or reply.',
      link: `/portal/documents/${doc.id}`,
      payload: { documentId: doc.id },
    });
  }

  const tpl = renderDocumentSharedEmail({
    to: recipientEmail,
    fullName: userRow?.full_name ?? undefined,
    documentTitle: String(doc.title ?? 'Document'),
    organizationName: (org?.name as string | null) ?? undefined,
    description: (doc.description as string | null) ?? null,
    portalUrl: `${SITE}/portal/documents`,
  });

  await sendEmail({
    to: recipientEmail,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    templateKey: 'document_shared',
    userId: userRow?.id,
    metadata: { documentId: doc.id },
  });

  return { ok: true as const };
}

function formatMoney(amount: number, currency: string): string {
  try {
    const isCents = amount > 999 && Math.round(amount) === amount;
    const value = isCents && currency.toLowerCase() === 'usd' ? amount / 100 : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(value);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}
