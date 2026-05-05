import { NextResponse, type NextRequest } from 'next/server';
import { sendWelcomeEmail } from '@/lib/welcomeEmail';
import { supabaseAdmin } from '@/lib/supabase/server';
import { notifyProfileCreated } from '@/lib/email/orchestrator';
import { rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60_000, prefix: 'welcome-email' });
  if (limited) return limited;

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

  // If a profile exists for this email, route through the orchestrator so we
  // also drop an in-app notification, log to email_log, and respect prefs.
  // Otherwise, fall back to the legacy direct sender to keep compatibility
  // for callers that hit this endpoint pre-profile-creation (e.g. signup).
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
        return NextResponse.json({ ok: true, id: 'id' in orchResult ? orchResult.id : '' });
      }
      const reason = 'reason' in orchResult ? orchResult.reason : 'queued';
      return NextResponse.json({ ok: false, reason }, { status: 202 });
    }
  } catch (err) {
    console.warn('[welcome-email] orchestrator path failed, falling back:', err instanceof Error ? err.message : err);
  }

  const result = await sendWelcomeEmail({ to, fullName });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 202 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
