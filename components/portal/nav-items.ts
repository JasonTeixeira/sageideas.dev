import { adminNav } from '@/components/admin/nav-items';
import {
  LayoutDashboard,
  Briefcase,
  FileSignature,
  MessageSquare,
  Receipt,
  Sparkles,
  Settings2,
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

// Owners always use the canonical cockpit navigation, including on client details.
export function getPortalNavItems(opts: { isAdmin?: boolean } = {}): NavItem[] {
  return opts.isAdmin ? adminNav : portalClientNav;
}
