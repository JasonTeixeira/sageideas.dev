import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { WEB_VITAL_BOUNDS, redactTelemetryText, sanitizeTelemetryUrl, validateWebVital } from '@/lib/observability/contract';
import { structuredLog } from '@/lib/observability/structured-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).nullable().optional(),
  navigation_type: z.string().max(64).nullable().optional(),
  url: z.string().max(1024).nullable().optional(),
  release: z.string().max(64).nullable().optional(),
}).superRefine((metric, context) => {
  if (!validateWebVital(metric.name, metric.value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'metric_out_of_bounds' });
  }
});

void WEB_VITAL_BOUNDS;

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 120, windowMs: 60_000, prefix: 'telemetry-perf' });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    // Beacons are best-effort; swallow validation errors as 204 so the
    // browser doesn't see a 4xx.
    return new NextResponse(null, { status: 204 });
  }
  const body = parsed.data;

  // Persistence needs Supabase env. When it's absent (local dev / misconfig),
  // the beacon is a best-effort no-op — never 500 the Web-Vitals reporter.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  // Authenticated client respects RLS; if no session, fall back to admin
  // since the table has anyone-insert policy (RLS guards reads only).
  let userId: string | null = null;
  let orgId: string | null = null;
  try {
    const sb = await createSupabaseServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      userId = user.id;
      const admin = supabaseAdmin();
      const { data: m } = await admin
        .from('org_memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      orgId = (m?.organization_id as string | null) ?? null;
    }
  } catch {
    // unauth — leave nulls
  }

  const sb = supabaseAdmin();
  const ua = req.headers.get('user-agent');
  try {
    await sb.from('performance_events').insert({
      user_id: userId,
      organization_id: orgId,
      url: sanitizeTelemetryUrl(body.url),
      user_agent: ua ? redactTelemetryText(ua, 512) : null,
      metric_name: body.name,
      metric_value: body.value,
      rating: body.rating ?? null,
      navigation_type: body.navigation_type ?? null,
      release: body.release ?? null,
    });
  } catch {
    structuredLog('warn', 'telemetry_persistence_failed', { signal: 'performance_event' });
  }
  return new NextResponse(null, { status: 204 });
}
