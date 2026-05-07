import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { resolveActiveOrg, type MembershipRef, type OrgRef } from '@/lib/portal/active-org';

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

export type { OrgRef, MembershipRef };

export interface PortalContext {
  user: PortalUser;
  // Backwards-compat: aliases for activeOrg.id / activeOrg.name. All existing
  // callers used these flat fields; PR-A keeps them populated so nothing breaks.
  organizationId: string | null;
  organizationName: string | null;
  isAdmin: boolean;
  // Phase 2B PR-A — multi-org foundations.
  memberships: MembershipRef[];
  activeOrg: OrgRef | null;
}

export const ACTIVE_ORG_COOKIE = 'sage_active_org';
const ADMIN_EMAILS = ['sage@sageideas.dev', 'sage@sageideas.org'];

type AppUserRow = {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'client';
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
  organizations:
    | { id: string; name: string | null; slug: string | null }
    | { id: string; name: string | null; slug: string | null }[]
    | null;
};

function pickOrg(
  raw: MembershipRow['organizations'],
): { id: string; name: string | null; slug: string | null } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

// resolveActiveOrg is exported from ./active-org for unit testing.
export { resolveActiveOrg };

/**
 * Resolves the Supabase-authenticated user, ensures their profile + app_users row
 * exist, and returns their portal context (org membership, role).
 * Use in every server component / route handler that requires an approved session.
 *
 * Phase 2B PR-A — accepts an optional `orgSlug` (typically `searchParams.org`).
 * Resolution precedence: orgSlug → cookie → first membership. Cookie is updated
 * when the user explicitly switches via the slug param.
 */
export async function getPortalContext(opts?: {
  orgSlug?: string | null;
}): Promise<PortalContext> {
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

  // Phase 2B PR-A — load ALL memberships, not the first one.
  const { data: rawMemberships } = await sb
    .from('org_memberships')
    .select('organization_id, role, organizations(id, name, slug)')
    .eq('user_id', appUser.id);

  let memberships: MembershipRef[] = ((rawMemberships ?? []) as MembershipRow[])
    .map((m) => {
      const org = pickOrg(m.organizations);
      if (!org) return null;
      return {
        org: { id: org.id, name: org.name ?? '', slug: org.slug },
        role: m.role ?? 'member',
      } satisfies MembershipRef;
    })
    .filter((m): m is MembershipRef => m !== null);

  // Phase 2A.4 — auto-create / phantom-org-prevention. Only runs for non-admin
  // users with zero memberships, just like before; the multi-org refactor
  // doesn't change this codepath, only the single-membership shortcut above.
  if (memberships.length === 0 && !isAdmin) {
    const { data: siblings } = await sb
      .from('app_users')
      .select('id')
      .ilike('email', email)
      .neq('id', appUser.id);
    const siblingIds = (siblings ?? []).map((s: { id: string }) => s.id);

    if (siblingIds.length > 0) {
      const { data: siblingMemberships } = await sb
        .from('org_memberships')
        .select('organization_id, role, organizations(id, name, slug)')
        .in('user_id', siblingIds);
      const siblingRows = (siblingMemberships ?? []) as MembershipRow[];
      if (siblingRows.length > 0) {
        // Repoint sibling memberships to the canonical row so future loads
        // find them directly. Idempotent: collisions get deduped by the
        // primary key on (user_id, organization_id).
        const sm = siblingRows[0];
        const targetOrgId = sm.organization_id;
        await sb
          .from('org_memberships')
          .delete()
          .eq('user_id', appUser.id)
          .eq('organization_id', targetOrgId);
        await sb
          .from('org_memberships')
          .update({ user_id: appUser.id })
          .in('user_id', siblingIds)
          .eq('organization_id', targetOrgId);
        // Re-fetch the canonical memberships now that we've repointed.
        const { data: refetched } = await sb
          .from('org_memberships')
          .select('organization_id, role, organizations(id, name, slug)')
          .eq('user_id', appUser.id);
        memberships = ((refetched ?? []) as MembershipRow[])
          .map((m) => {
            const org = pickOrg(m.organizations);
            if (!org) return null;
            return {
              org: { id: org.id, name: org.name ?? '', slug: org.slug },
              role: m.role ?? 'member',
            } satisfies MembershipRef;
          })
          .filter((m): m is MembershipRef => m !== null);
      }
    }

    if (memberships.length === 0) {
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
        memberships = [
          {
            org: { id: newOrg.id, name: newOrg.name ?? '', slug: newOrg.slug ?? null },
            role: 'owner',
          },
        ];
      }
    }
  }

  // Resolve active org from slug → cookie → first.
  const cookieStore = await cookies();
  const cookieSlug = cookieStore.get(ACTIVE_ORG_COOKIE)?.value ?? null;
  const active = resolveActiveOrg(memberships, {
    slug: opts?.orgSlug ?? null,
    cookieSlug,
  });

  // Persist explicit slug switches so subsequent navigations remember the
  // selection. We only write when the user provided ?org= explicitly AND it
  // resolved to something different from the current cookie.
  if (
    opts?.orgSlug &&
    active &&
    active.org.slug &&
    active.org.slug === opts.orgSlug &&
    cookieSlug !== opts.orgSlug
  ) {
    try {
      cookieStore.set(ACTIVE_ORG_COOKIE, active.org.slug, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        // 1 year — the switcher is sticky until the user changes it.
        maxAge: 60 * 60 * 24 * 365,
      });
    } catch {
      // cookies().set() throws when called from a server component (read-only
      // context). That's fine — middleware/route-handler callers will set it.
    }
  }

  const activeOrg: OrgRef | null = active
    ? { id: active.org.id, name: active.org.name, slug: active.org.slug }
    : null;

  return {
    user: appUser as PortalUser,
    organizationId: activeOrg?.id ?? null,
    organizationName: activeOrg?.name ?? null,
    isAdmin,
    memberships,
    activeOrg,
  };
}

/**
 * Convenience wrapper for routes that already have `searchParams`.
 */
export async function getActiveOrg(
  searchParams?: { org?: string | string[] | null } | Promise<{ org?: string | string[] | null }>,
): Promise<PortalContext> {
  const sp = searchParams ? await searchParams : undefined;
  const raw = sp?.org;
  const slug = Array.isArray(raw) ? raw[0] : raw;
  return getPortalContext({ orgSlug: slug ?? null });
}

export async function requireAdmin(): Promise<PortalContext> {
  const ctx = await getPortalContext();
  if (!ctx.isAdmin) redirect('/portal');
  return ctx;
}
