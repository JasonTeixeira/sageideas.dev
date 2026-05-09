'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  Calendar,
  Clock,
  Receipt,
  FileSignature,
  FileText,
  FolderOpen,
  ScrollText,
  Settings2,
  ShieldCheck,
  TrendingUp,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/crm', label: 'CRM', icon: Users },
  { href: '/admin/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/admin/calendar', label: 'Calendar', icon: Calendar },
  { href: '/admin/time-tracking', label: 'Time Tracking', icon: Clock },
  { href: '/admin/profitability', label: 'Profitability', icon: TrendingUp },
  { href: '/admin/workload', label: 'Workload', icon: Users },
  { href: '/admin/proposals', label: 'Proposals', icon: FileSignature },
  { href: '/admin/bookings', label: 'Bookings', icon: Calendar },
  { href: '/admin/invoices', label: 'Invoices', icon: Receipt },
  { href: '/admin/payments', label: 'Payments', icon: Receipt },
  { href: '/admin/documents', label: 'Documents', icon: FolderOpen },
  { href: '/admin/templates', label: 'Templates', icon: FileText },
  { href: '/admin/project-templates', label: 'Project templates', icon: KanbanSquare },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/observability', label: 'Observability', icon: TrendingUp },
  { href: '/admin/availability', label: 'Availability', icon: Calendar },
  { href: '/admin/users', label: 'Users', icon: UserCog },
  { href: '/admin/settings', label: 'Settings', icon: Settings2 },
];

function SageLogo() {
  return (
    <svg viewBox="0 0 64 64" className="w-7 h-7" fill="none" aria-label="Sage Ideas">
      <rect x="2" y="2" width="60" height="60" rx="14" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 22 L32 22 M20 32 L44 32 M20 42 L36 42"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="22" r="3" fill="currentColor" />
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[#27272a] bg-[#0a0a0c] sticky top-0 h-screen">
      <div className="p-5 flex items-center gap-2.5 border-b border-[#27272a]">
        <div className="text-[#06b6d4]">
          <SageLogo />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold tracking-tight text-[#fafafa] text-sm">The Studio</div>
          <div className="text-[10px] text-[#71717a] truncate uppercase tracking-wider">
            Admin cockpit
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#06b6d4]">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#52525b]">
          Cockpit
        </div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/admin'
              ? pathname === '/admin'
              : pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-[#06b6d4]/10 text-[#06b6d4]'
                  : 'text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[#27272a]">
        <Link
          href="/portal"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-[#71717a] hover:text-[#fafafa] hover:bg-[#18181b] transition-colors"
        >
          <span className="font-mono uppercase tracking-widest">Switch to portal →</span>
        </Link>
      </div>
    </aside>
  );
}
