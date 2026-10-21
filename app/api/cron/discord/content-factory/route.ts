import { NextResponse } from 'next/server';
import { recordDiscordScheduledRun } from '@/lib/discord/analytics';
import { runDiscordContentFactory } from '@/lib/discord/content-factory';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret;
}

function dateFromUrl(req: Request): Date {
  const url = new URL(req.url);
  const dateParam = url.searchParams.get('date');
  const date = dateParam ? new Date(`${dateParam}T12:00:00.000Z`) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${dateParam}`);
  return date;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startDate = dateFromUrl(req);
  const dateKey = startDate.toISOString().slice(0, 10);
  const runKey = `content-factory-daily-${dateKey}`;

  try {
    const result = await runDiscordContentFactory(supabaseAdmin(), {
      startDate,
      days: 1,
      runKey,
      dryRun: false,
      force: false,
    });

    await recordDiscordScheduledRun({
      runKey,
      kind: 'content_factory',
      status: result.ok ? 'drafted' : 'failed',
      metadata: {
        source: 'vercel-cron-content-factory',
        version: result.version,
        date_key: dateKey,
        created: result.created,
        skipped: result.skipped,
        failed: result.failed,
        planned: result.planned,
        no_public_publish: true,
        admin_approval_required: true,
      },
    });

    return NextResponse.json({
      ok: result.ok,
      dateKey,
      runKey,
      created: result.created,
      skipped: result.skipped,
      failed: result.failed,
      planned: result.planned,
      noPublicPublish: true,
      adminApprovalRequired: true,
    }, { status: result.ok ? 200 : 202 });
  } catch (err) {
    await recordDiscordScheduledRun({
      runKey,
      kind: 'content_factory',
      status: 'failed',
      metadata: {
        source: 'vercel-cron-content-factory',
        date_key: dateKey,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    return NextResponse.json({ error: 'Content factory job failed' }, { status: 500 });
  }
}
