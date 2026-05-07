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

type AppUserRow = {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'client';
};

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

  const email = (profile.email ?? user.email ?? '').toLowerCase();
  const fullName = profile.full_name ?? '';
  const isAdmin =
    profile.app_role === 'admin' || ADMIN_EMAILS.includes(email);

  if (!isAdmin && profile.approval_status !== 'approved') {
    redirect('/pending-approval');
  }

  // Phase 2A.4 — bridge to app_users by EMAIL first, not just clerk_id.
  // The seed pipeline creates rows with clerk_id='seed_<uuid>'. When the user
  // logs in, the legacy upsert path inserted a SECOND row keyed by their real
  // auth UUID, orphaning seeded engagements/memberships. We now:
  //   1) Look up by lower(email).
  //   2) If found, update clerk_id to the auth user id (in case it was a seed).
  //   3) Otherwise insert a fresh row keyed on the auth UUID.
  const desiredAvatar =
    profile.avatar_url ??
    (user.user_metadata?.avatar_url as string | undefined) ??
    null;
  const desiredRole: 'admin' | 'client' = isAdmin ? 'admin' : 'client';

  const { data: existingByEmail } = await sb
    .from('app_users')
    .select('*')
    .ilike('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let appUser: AppUserRow | null = null;

  if (existingByEmail) {
    const needsUpdate =
      existingByEmail.clerk_id !== user.id ||
      existingByEmail.full_name !== fullName ||
      existingByEmail.avatar_url !== desiredAvatar ||
      existingByEmail.role !== desiredRole;

    if (needsUpdate) {
      const { data: updated } = await sb
        .from('app_users')
        .update({
          clerk_id: user.id,
          email,
          full_name: fullName,
          avatar_url: desiredAvatar,
          role: desiredRole,
        })
        .eq('id', existingByEmail.id)
        .select()
        .maybeSingle();
      appUser = (updated ?? existingByEmail) as AppUserRow;
    } else {
      appUser = existingByEmail as AppUserRow;
    }
  } else {
    const { data: inserted } = await sb
      .from('app_users')
      .insert({
        clerk_id: user.id,
        email,
        full_name: fullName,
        avatar_url: desiredAvatar,
        role: desiredRole,
      })
      .select()
      .maybeSingle();
    appUser = inserted as AppUserRow | null;
  }

  if (!appUser) {
    throw new Error('Failed to provision app_users row');
  }

  const { data: memberships } = await sb
    .from('org_memberships')
    .select('organization_id, organizations(id, name, slug)')
    .eq('user_id', appUser.id)
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
    // Phase 2A.4 — refuse to auto-create a phantom "Workspace" org if any
    // sibling app_users row (matched by email) already has memberships. That
    // case means the dedupe migration hasn't run yet but the user is the same
    // human; we surface the existing org instead of inventing a new one.
    const { data: siblings } = await sb
      .from('app_users')
      .select('id')
      .ilike('email', email)
      .neq('id', appUser.id);
    const siblingIds = (siblings ?? []).map((s: { id: string }) => s.id);

    if (siblingIds.length > 0) {
      const { data: siblingMemberships } = await sb
        .from('org_memberships')
        .select('organization_id, organizations(id, name)')
        .in('user_id', siblingIds)
        .limit(1);
      if (siblingMemberships && siblingMemberships.length > 0) {
        const sm = siblingMemberships[0] as {
          organization_id: string;
          organizations?: { id?: string; name?: string };
        };
        organizationId = sm.organization_id;
        organizationName = sm.organizations?.name ?? null;
        // Repoint the membership to the canonical row so future loads find it
        // without traversing siblings. (Idempotent — collisions are deduped.)
        await sb
          .from('org_memberships')
          .delete()
          .eq('user_id', appUser.id)
          .eq('organization_id', organizationId);
        await sb
          .from('org_memberships')
          .update({ user_id: appUser.id })
          .in('user_id', siblingIds)
          .eq('organization_id', organizationId);
      }
    }

    if (!organizationId) {
      const slug =
        email.split('@')[0].replace(/[^a-z0-9]/g, '-') +
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
          user_id: appUser.id,
          organization_id: newOrg.id,
          role: 'owner',
        });
        organizationId = newOrg.id;
        organizationName = newOrg.name;
      }
    }
  }

  return {
    user: appUser as PortalUser,
    organizationId,
    organizationName,
    isAdmin,
  };
}

export async function requireAdmin(): Promise<PortalContext> {
  const ctx = await getPortalContext();
  if (!ctx.isAdmin) redirect('/portal');
  return ctx;
}
