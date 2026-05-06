import { NextResponse, type NextRequest } from 'next/server';
import { sendWelcomeEmail } from '@/lib/welcomeEmail';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notifyProfileCreated } from '@/lib/email/orchestrator';
import { rateLimit } from '@/lib/rate-limit';
import { requireAdminApi } from '@/lib/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: 'welcome-email' });
  if (limited) return limited;

  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  let body: { to?: string; fullName?: string };
  try {
    body = (await req.json()) as { to?: string; fullName?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const to = (body.to ?? '').trim().toLowerCase();
  const fullName = (body.fullName ?? '').trim();

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  try {
    const sb = supabaseAdmin();
    const { data: profile } = await sb
      .from('profiles')
      .select('id')
      .eq('email', to)
      .maybeSingle();
    if (profile?.id) {
      const orchResult = await notifyProfileCreated(profile.id as string);
      if (orchResult.ok === true) {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: true, queued: true });
    }
  } catch (err) {
    console.warn('[welcome-email] orchestrator path failed, falling back:', err instanceof Error ? err.message : err);
  }

  const result = await sendWelcomeEmail({ to, fullName });
  if (!result.ok) {
    return NextResponse.json({ ok: true, queued: true });
  }
  return NextResponse.json({ ok: true });
}
