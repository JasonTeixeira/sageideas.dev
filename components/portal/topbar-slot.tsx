import { supabaseAdmin } from '@/lib/supabase/server';
import { NotificationBell } from './notification-bell';
import { MobileNav } from './mobile-nav';

type Props = {
  userId: string;
  orgName?: string | null;
  isAdmin?: boolean;
};

/**
 * Floating top-right slot with NotificationBell + MobileNav.
 * Mounted by the portal layout so every portal route gets the bell and
 * the mobile hamburger, regardless of whether the page renders its own Topbar.
 */
export async function PortalTopbarSlot({ userId, orgName, isAdmin = false }: Props) {
  const sb = supabaseAdmin();
  const { data: notifs } = await sb
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .is('read_at', null);
  const unread = notifs?.length ?? 0;

  return (
    <div className="fixed top-0 right-0 z-40 h-14 flex items-center gap-2 px-4 lg:px-6 pointer-events-none">
      <div className="pointer-events-auto">
        <NotificationBell initialUnread={unread} />
      </div>
      <div className="pointer-events-auto lg:hidden">
        <MobileNav orgName={orgName ?? undefined} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
