import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

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

export async function POST(req: Request) {
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

  const sb = supabaseAdmin();
  const ua = req.headers.get('user-agent') ?? null;
  try {
    await sb.from('error_events').insert({
      user_id: userId,
      organization_id: orgId,
      url: body.url ?? null,
      user_agent: ua,
      message: body.message,
      stack: body.stack ?? null,
      digest: body.digest ?? null,
      severity: body.severity ?? 'error',
      release: body.release ?? null,
    });
  } catch {
    // swallow
  }
  return new NextResponse(null, { status: 204 });
}
