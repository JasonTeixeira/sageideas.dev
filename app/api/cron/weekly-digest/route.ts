import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendWeeklyDigest } from '@/lib/email/orchestrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const auth = req.headers.get('authorization') ?? '';
  const headerSecret = req.headers.get('x-cron-secret') ?? '';
  const ok = auth === `Bearer ${secret}` || headerSecret === secret;
  if (!ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sb = supabaseAdmin();
  // Pull every approved profile that opted in to weekly digest.
  const { data: profiles, error } = await sb
    .from('profiles')
    .select('id, approval_status')
    .eq('approval_status', 'approved');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const profileIds = ((profiles ?? []) as Array<{ id: string }>).map((p) => p.id);
  if (profileIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const { data: prefs } = await sb
    .from('notification_preferences')
    .select('user_id, digest_frequency')
    .in('user_id', profileIds);

  const optedIn = ((prefs ?? []) as Array<{ user_id: string; digest_frequency: string | null }>)
    .filter((p) => (p.digest_frequency ?? 'daily') === 'weekly')
    .map((p) => p.user_id);

  let sent = 0;
  let failed = 0;
  for (const userId of optedIn) {
    try {
      const result = await sendWeeklyDigest(userId);
      if ('ok' in result && result.ok) sent++;
      else failed++;
    } catch (err) {
      failed++;
      console.warn('[weekly-digest] failed for', userId, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, considered: optedIn.length, sent, failed });
}
