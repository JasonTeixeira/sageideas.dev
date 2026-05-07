import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { requireAdminApi, logAudit } from '@/lib/admin-guard';
import { supabaseAdmin } from '@/lib/supabase/server';
import { badRequest, fromZodError } from '@/lib/api-errors';

const schema = z.object({
  email: z.string().email().max(254),
});

function siteOrigin(h: Headers) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const guard = await requireAdminApi();
  if (guard instanceof NextResponse) return guard;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const email = parsed.data.email.trim().toLowerCase();

  const h = await headers();
  const origin = siteOrigin(h);
  const sb = supabaseAdmin();

  const { data: invited, error } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/admin`,
  });
  if (error) return badRequest(error.message);

  // Pre-mark profile as admin so first sign-in lands in cockpit.
  if (invited?.user?.id) {
    await sb
      .from('profiles')
      .update({
        app_role: 'admin',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: guard.userId,
      })
      .eq('id', invited.user.id);
  }

  await logAudit({
    actorId: guard.userId,
    actorEmail: guard.email,
    action: 'team.invite',
    entityType: 'profile',
    entityId: invited?.user?.id ?? null,
    after: { email, role: 'admin' },
  });

  return NextResponse.json({ ok: true, email });
}
