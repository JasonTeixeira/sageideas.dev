import { getPortalContext } from '@/lib/portal/auth';
import { Sidebar } from '@/components/portal/sidebar';
import { PortalTopbarSlot } from '@/components/portal/topbar-slot';
import { supabaseAdmin } from '@/lib/supabase/server';

// Portal is fully auth-gated and DB-backed. Skip static optimization
// so Supabase Auth has runtime access to cookies and the request context.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: { default: 'Portal · Sage Ideas', template: '%s · Sage Ideas Portal' },
  description:
    'Your private workspace for Sage Ideas engagements. Real-time deliverables, signed contracts, and direct messaging.',
  robots: { index: false, follow: false },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getPortalContext();

  const sb = supabaseAdmin();
  const { data: profile } = await sb
    .from('profiles')
    .select('app_role, approval_status')
    .eq('id', ctx.user.clerk_id)
    .maybeSingle();

  const isPending =
    profile?.app_role === 'pending' || profile?.approval_status === 'pending';

  return (
    <div className="flex min-h-screen bg-[#09090B]">
      <Sidebar isAdmin={ctx.isAdmin} orgName={ctx.organizationName ?? undefined} />
      <main className="flex-1 min-w-0">
        {isPending && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 lg:px-8 py-2.5">
            <p className="text-xs text-amber-200">
              Your account is pending approval. You can look around, but messaging and
              approvals are gated until Sage clears you.
            </p>
          </div>
        )}
        {children}
      </main>
      <PortalTopbarSlot
        userId={ctx.user.clerk_id}
        orgName={ctx.organizationName}
        isAdmin={ctx.isAdmin}
      />
    </div>
  );
}
