import {
  LayoutDashboard,
  Briefcase,
  FileSignature,
  MessageSquare,
  Receipt,
  Sparkles,
  Settings2,
  ShieldCheck,
  Users,
  Activity,
  Calendar,
  Bell,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const portalClientNav: NavItem[] = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/projects', label: 'Projects', icon: Briefcase },
  { href: '/portal/messages', label: 'Messages', icon: MessageSquare },
  { href: '/portal/inbox', label: 'Inbox', icon: Bell },
  { href: '/portal/calendar', label: 'Calendar', icon: Calendar },
  { href: '/portal/documents', label: 'Documents', icon: FileSignature },
  { href: '/portal/invoices', label: 'Invoices', icon: Receipt },
  { href: '/portal/settings', label: 'Settings', icon: Settings2 },
  { href: '/portal/catalog', label: 'Add Services', icon: Sparkles },
  { href: '/portal/help', label: 'Help', icon: HelpCircle },
];

// Admin nav consolidated to /admin/* routes (Phase 2A.6).
export const portalAdminNav: NavItem[] = [
  { href: '/admin', label: 'Admin · Pipeline', icon: ShieldCheck },
  { href: '/admin/crm', label: 'Clients', icon: Users },
  { href: '/admin/audit-log', label: 'Activity', icon: Activity },
  { href: '/admin/settings', label: 'Settings', icon: Settings2 },
];

export function getPortalNavItems(opts: { isAdmin?: boolean } = {}): NavItem[] {
  return opts.isAdmin
    ? [...portalClientNav, ...portalAdminNav]
    : portalClientNav;
}
