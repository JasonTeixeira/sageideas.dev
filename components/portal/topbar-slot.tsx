import { supabaseAdmin } from '@/lib/supabase/server';
import { NotificationBell } from './notification-bell';
import { MobileNav } from './mobile-nav';
import { OrgSwitcher, type OrgSwitcherMembership } from './org-switcher';
import { CommandPaletteTrigger } from './command-palette';
import { TopbarAvatar } from './topbar-avatar';

type Props = {
  userId: string;
  orgName?: string | null;
  isAdmin?: boolean;
  memberships?: OrgSwitcherMembership[];
  activeOrg?: OrgSwitcherMembership | null;
};

/**
 * Floating top-right slot with NotificationBell + MobileNav + OrgSwitcher +
 * Command palette trigger. Mounted by the portal layout so every portal route
 * gets the bell, hamburger, palette, and switcher regardless of whether the
 * page renders its own Topbar.
 */
export async function PortalTopbarSlot({
  userId,
  orgName,
  isAdmin = false,
  memberships = [],
  activeOrg = null,
}: Props) {
  const sb = supabaseAdmin();
  const { data: notifs } = await sb
    .from('notifications')
    .select('id')
    .eq('user_id', userId)
    .is('read_at', null);
  const unread = notifs?.length ?? 0;

  const { data: meRow } = await sb
    .from('profiles')
    .select('email, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  return (
    <div className="fixed top-0 right-0 z-40 h-14 flex items-center gap-2 px-4 lg:px-6 pointer-events-none">
      <div className="pointer-events-auto">
        <CommandPaletteTrigger />
      </div>
      <div className="pointer-events-auto">
        <OrgSwitcher active={activeOrg} memberships={memberships} />
      </div>
      <div className="pointer-events-auto">
        <NotificationBell initialUnread={unread} />
      </div>
      <div className="pointer-events-auto">
        <TopbarAvatar
          path={(meRow?.avatar_url as string | null) ?? null}
          fullName={(meRow?.full_name as string | null) ?? null}
          email={(meRow?.email as string | null) ?? ''}
        />
      </div>
      <div className="pointer-events-auto lg:hidden">
        <MobileNav orgName={orgName ?? undefined} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
