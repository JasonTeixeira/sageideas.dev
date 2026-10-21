import { NextResponse } from 'next/server';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

/**
 * Verifies the caller is an authenticated admin. Returns null on success,
 * or a NextResponse to short-circuit the route handler on failure.
 */
export async function requireAdminApi(): Promise<{
  userId: string;
  email: string;
  fullName: string | null;
} | NextResponse> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return NextResponse.json({ error: 'authentication_unavailable' }, { status: 503 });
  }

  try {
    const sb = await createSupabaseServerClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('app_role, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.app_role !== 'admin') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const mfaRequired =
      process.env.NODE_ENV === 'production' || process.env.MFA_REQUIRED_FOR_ADMIN === 'true';
    if (mfaRequired) {
      const { data: assurance } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance?.currentLevel !== 'aal2') {
        return NextResponse.json(
          { error: 'mfa_required', enrollmentRequired: assurance?.nextLevel !== 'aal2' },
          { status: 403 },
        );
      }
    }
    return {
      userId: user.id,
      email: profile.email ?? user.email ?? '',
      fullName: profile.full_name,
    };
  } catch (error) {
    console.error('[admin-guard] authentication unavailable', error);
    return NextResponse.json({ error: 'authentication_unavailable' }, { status: 503 });
  }
}

export async function logAudit(args: {
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  try {
    const admin = supabaseAdmin();
    await admin.from('audit_log').insert({
      actor_id: args.actorId,
      actor_email: args.actorEmail,
      action: args.action,
      entity_type: args.entityType,
      entity_id: args.entityId ?? null,
      before: args.before ?? null,
      after: args.after ?? null,
    });
  } catch {
    // never block the response on audit failures
  }
}
