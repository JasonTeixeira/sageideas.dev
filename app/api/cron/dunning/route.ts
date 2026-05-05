import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DunningStatus =
  | 'current'
  | 'grace'
  | 'reminded_1'
  | 'reminded_2'
  | 'final_notice'
  | 'collections'
  | 'written_off';

type Invoice = {
  id: string;
  number: string | null;
  organization_id: string | null;
  status: string | null;
  due_date: string | null;
  dunning_status: DunningStatus | null;
  reminder_count: number | null;
};

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[cron/dunning] CRON_SECRET missing in production');
    }
    // Allow in dev/preview without secret. Production without secret is a soft warn — Vercel cron
    // adds its own header, but external invocations would get through. Better to fail closed.
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
    }
  } else if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const now = new Date();

  const { data, error } = await sb
    .from('invoices')
    .select(
      'id, number, organization_id, status, due_date, dunning_status, reminder_count',
    )
    .in('status', ['sent', 'overdue'])
    .not('due_date', 'is', null)
    .lt('due_date', now.toISOString());

  if (error) {
    console.error('[cron/dunning] query', error);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const overdue = (data ?? []) as Invoice[];
  const summary = {
    inspected: overdue.length,
    grace: 0,
    reminded_1: 0,
    reminded_2: 0,
    final_notice: 0,
    collections: 0,
    skipped: 0,
  };

  for (const inv of overdue) {
    if (!inv.due_date) {
      summary.skipped += 1;
      continue;
    }
    const due = new Date(inv.due_date).getTime();
    if (Number.isNaN(due)) {
      summary.skipped += 1;
      continue;
    }
    const daysOverdue = Math.floor((now.getTime() - due) / 86_400_000);
    let nextStatus: DunningStatus | null = null;
    let notify = false;
    let title = '';
    let body = '';

    if (daysOverdue <= 3) {
      nextStatus = 'grace';
    } else if (daysOverdue <= 7) {
      nextStatus = 'reminded_1';
      notify = inv.dunning_status !== 'reminded_1';
      title = 'Reminder: invoice past due';
      body = `Invoice ${inv.number ?? inv.id.slice(0, 8)} is ${daysOverdue} days past due.`;
    } else if (daysOverdue <= 14) {
      nextStatus = 'reminded_2';
      notify = inv.dunning_status !== 'reminded_2';
      title = 'Second reminder: invoice past due';
      body = `Invoice ${inv.number ?? inv.id.slice(0, 8)} is ${daysOverdue} days past due. Please pay or reply.`;
    } else if (daysOverdue <= 30) {
      nextStatus = 'final_notice';
      notify = inv.dunning_status !== 'final_notice';
      title = 'Final notice: invoice past due';
      body = `Invoice ${inv.number ?? inv.id.slice(0, 8)} is ${daysOverdue} days past due. This is the final reminder before manual collections review.`;
    } else {
      nextStatus = 'collections';
      notify = inv.dunning_status !== 'collections';
      title = 'Invoice flagged for collections review';
      body = `Invoice ${inv.number ?? inv.id.slice(0, 8)} is ${daysOverdue} days past due and has been flagged.`;
    }

    if (nextStatus && nextStatus !== inv.dunning_status) {
      const update: Record<string, unknown> = { dunning_status: nextStatus };
      if (notify) {
        update.last_reminder_at = now.toISOString();
        update.reminder_count = (inv.reminder_count ?? 0) + 1;
      }
      await sb.from('invoices').update(update).eq('id', inv.id);
    }

    if (notify && inv.organization_id) {
      // TODO(phase33): hand off to Resend orchestration; for now drop a notification row.
      const { data: members } = await sb
        .from('org_memberships')
        .select('user_id')
        .eq('organization_id', inv.organization_id);
      const rows = (members ?? [])
        .filter((m) => m.user_id)
        .map((m) => ({
          user_id: m.user_id,
          kind: 'invoice_dunning',
          title,
          body,
          link: `/portal/invoices/${inv.id}`,
        }));
      if (rows.length > 0) {
        await sb.from('notifications').insert(rows);
      }
    }

    if (nextStatus === 'grace') summary.grace += 1;
    else if (nextStatus === 'reminded_1') summary.reminded_1 += 1;
    else if (nextStatus === 'reminded_2') summary.reminded_2 += 1;
    else if (nextStatus === 'final_notice') summary.final_notice += 1;
    else if (nextStatus === 'collections') summary.collections += 1;
  }

  return NextResponse.json({ ok: true, ...summary });
}
