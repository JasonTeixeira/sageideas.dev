import { NextResponse } from 'next/server';
import { getPortalContext } from '@/lib/portal/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { forbidden, notFound, serverError } from '@/lib/api-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TimeEntryRow = {
  duration_minutes: number | string | null;
  started_at: string | null;
};

function isoMonday(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalContext();

  const sb = supabaseAdmin();
  const { data: eng } = await sb
    .from('engagements')
    .select('id, organization_id, organizations(show_time_tracking)')
    .eq('id', id)
    .maybeSingle();
  if (!eng) return notFound('Engagement not found');

  const orgId = eng.organization_id as string | null;
  if (!ctx.isAdmin && orgId !== ctx.organizationId) return forbidden();

  const orgRel = (eng as { organizations: { show_time_tracking: boolean | null } | { show_time_tracking: boolean | null }[] | null }).organizations;
  const flag = Array.isArray(orgRel) ? orgRel[0]?.show_time_tracking : orgRel?.show_time_tracking;
  if (!ctx.isAdmin && flag !== true) return forbidden();

  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() - 12 * 7);
  try {
    const { data, error } = await sb
      .from('time_entries')
      .select('duration_minutes, started_at')
      .eq('engagement_id', id)
      .gte('started_at', horizon.toISOString());
    if (error) throw error;
    const rows = (data ?? []) as TimeEntryRow[];
    const buckets = new Map<string, number>();
    for (const r of rows) {
      if (!r.started_at) continue;
      const key = isoMonday(new Date(r.started_at));
      const minutes = Number(r.duration_minutes ?? 0);
      buckets.set(key, (buckets.get(key) ?? 0) + minutes);
    }
    const weeks = Array.from(buckets.entries())
      .map(([week_starting, total_minutes]) => ({ week_starting, total_minutes }))
      .sort((a, b) => a.week_starting.localeCompare(b.week_starting));
    return NextResponse.json({ weeks, show_time_tracking: flag === true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Time summary failed');
  }
}
