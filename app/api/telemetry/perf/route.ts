import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.enum(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).nullable().optional(),
  navigation_type: z.string().max(64).nullable().optional(),
  url: z.string().max(1024).nullable().optional(),
  release: z.string().max(64).nullable().optional(),
});

export async function POST(req: Request) {
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
  const ua = req.headers.get('user-agent') ?? null;
  try {
    await sb.from('performance_events').insert({
      user_id: userId,
      organization_id: orgId,
      url: body.url ?? null,
      user_agent: ua,
      metric_name: body.name,
      metric_value: body.value,
      rating: body.rating ?? null,
      navigation_type: body.navigation_type ?? null,
      release: body.release ?? null,
    });
  } catch {
    // Telemetry failure must never break the user — swallow.
  }
  return new NextResponse(null, { status: 204 });
}
