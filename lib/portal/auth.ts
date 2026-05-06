import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';

async function loginRedirectUrl(): Promise<string> {
  try {
    const h = await headers();
    const pathname =
      h.get('x-pathname') ||
      h.get('x-invoke-path') ||
      h.get('next-url') ||
      '';
    if (pathname && pathname.startsWith('/')) {
      return `/login?next=${encodeURIComponent(pathname)}`;
    }
    const referer = h.get('referer');
    if (referer) {
      try {
        const u = new URL(referer);
        if (u.pathname && u.pathname !== '/login') {
          return `/login?next=${encodeURIComponent(u.pathname + u.search)}`;
        }
      } catch {}
    }
  } catch {}
  return '/login';
}

export interface PortalUser {
  id: string;
  // Stable Supabase auth user ID. Kept under the legacy `clerk_id` field name
  // so that existing tables (app_users, signature_audits, activity, etc.) and
  // downstream code don't need to be migrated in this phase.
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'client';
}

export interface PortalContext {
  user: PortalUser;
  organizationId: string | null;
  organizationName: string | null;
  isAdmin: boolean;
}

const ADMIN_EMAILS = ['sage@sageideas.dev', 'sage@sageideas.org'];

/**
 * Resolves the Supabase-authenticated user, ensures their profile + app_users row
 * exist, and returns their portal context (org membership, role).
 * Use in every server component / route handler that requires an approved session.
 */
export async function getPortalContext(): Promise<PortalContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(await loginRedirectUrl());

  const sb = supabaseAdmin();

  let { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const fallbackName =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      '';
    const insertRes = await sb
      .from('profiles')
      .insert({ id: user.id, email: user.email ?? '', full_name: fallbackName })
      .select()
      .maybeSingle();
    profile = insertRes.data;
  }

  if (!profile) {
    throw new Error('Failed to load or create profile');
  }

  const email = profile.email ?? user.email ?? '';
  const fullName = profile.full_name ?? '';
  const isAdmin =
    profile.app_role === 'admin' || ADMIN_EMAILS.includes(email.toLowerCase());

  if (!isAdmin && profile.approval_status !== 'approved') {
    redirect('/pending-approval');
  }

  // Bridge to existing app_users row used by other tables (engagements, activity, etc.).
  const { data: upsertedAppUser } = await sb
    .from('app_users')
    .upsert(
      {
        clerk_id: user.id,
        email,
        full_name: fullName,
        avatar_url:
          profile.avatar_url ??
          (user.user_metadata?.avatar_url as string | undefined) ??
          null,
        role: isAdmin ? 'admin' : 'client',
      },
      { onConflict: 'clerk_id' },
    )
    .select()
    .single();

  if (!upsertedAppUser) {
    throw new Error('Failed to provision app_users row');
  }

  const { data: memberships } = await sb
    .from('org_memberships')
    .select('organization_id, organizations(id, name, slug)')
    .eq('user_id', upsertedAppUser.id)
    .limit(1);

  let organizationId: string | null = null;
  let organizationName: string | null = null;

  if (memberships && memberships.length > 0) {
    const m = memberships[0] as {
      organization_id: string;
      organizations?: { name?: string };
    };
    organizationId = m.organization_id;
    organizationName = m.organizations?.name ?? null;
  } else if (!isAdmin) {
    const slug =
      email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') +
      '-' +
      Math.random().toString(36).slice(2, 6);
    const { data: newOrg } = await sb
      .from('organizations')
      .insert({
        name: `${fullName.split(' ')[0] || email.split('@')[0]}'s Workspace`,
        slug,
        primary_contact_email: email,
        status: 'prospect',
      })
      .select()
      .single();

    if (newOrg) {
      await sb.from('org_memberships').insert({
        user_id: upsertedAppUser.id,
        organization_id: newOrg.id,
        role: 'owner',
      });
      organizationId = newOrg.id;
      organizationName = newOrg.name;
    }
  }

  return {
    user: upsertedAppUser as PortalUser,
    organizationId,
    organizationName,
    isAdmin,
  };
}

export async function requireAdmin(): Promise<PortalContext> {
  const ctx = await getPortalContext();
  if (!ctx.isAdmin) redirect('/portal/home');
  return ctx;
}
