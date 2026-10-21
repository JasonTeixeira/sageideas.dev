import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { redactTelemetryText, sanitizeTelemetryUrl } from '@/lib/observability/contract';
import { structuredLog } from '@/lib/observability/structured-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  message: z.string().min(1).max(4000),
  stack: z.string().max(8000).nullable().optional(),
  digest: z.string().max(128).nullable().optional(),
  severity: z.enum(['error', 'warning', 'info']).optional().default('error'),
  url: z.string().max(1024).nullable().optional(),
  release: z.string().max(64).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 30, windowMs: 60_000, prefix: 'telemetry-error' });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return new NextResponse(null, { status: 204 });
  }
  const body = parsed.data;

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
    // unauth
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse(null, { status: 204 });
  }

  const ua = req.headers.get('user-agent');
  try {
    const sb = supabaseAdmin();
    await sb.from('error_events').insert({
      user_id: userId,
      organization_id: orgId,
      url: sanitizeTelemetryUrl(body.url),
      user_agent: ua ? redactTelemetryText(ua, 512) : null,
      message: redactTelemetryText(body.message, 4000),
      stack: body.stack ? redactTelemetryText(body.stack, 8000) : null,
      digest: body.digest ?? null,
      severity: body.severity ?? 'error',
      release: body.release ?? null,
    });
  } catch {
    structuredLog('warn', 'telemetry_persistence_failed', { signal: 'error_event' })
  }
  return new NextResponse(null, { status: 204 });
}
