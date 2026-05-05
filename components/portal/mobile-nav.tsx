'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import {
  LayoutDashboard,
  Briefcase,
  FileSignature,
  MessageSquare,
  Receipt,
  Sparkles,
  Settings2,
  Calendar,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { signOut } from '@/app/auth/actions';
import { cn } from '@/lib/utils';

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/portal/projects', label: 'Projects', icon: Briefcase },
  { href: '/portal/messages', label: 'Messages', icon: MessageSquare },
  { href: '/portal/calendar', label: 'Calendar', icon: Calendar },
  { href: '/portal/documents', label: 'Documents', icon: FileSignature },
  { href: '/portal/invoices', label: 'Invoices', icon: Receipt },
  { href: '/portal/settings', label: 'Settings', icon: Settings2 },
  { href: '/portal/catalog', label: 'Add Services', icon: Sparkles },
  { href: '/portal/help', label: 'Help', icon: HelpCircle },
];

export function MobileNav({ orgName }: { orgName?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-[#000]/70"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a0a0c] border-r border-[#27272a] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272a]">
              <div className="min-w-0">
                <div className="font-semibold text-[#fafafa] text-sm">The Studio</div>
                <div className="text-[10px] text-[#71717a] truncate uppercase tracking-wider">
                  {orgName ?? 'Sage Ideas'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
              {nav.map(({ href, label, icon: Icon }) => {
                const active =
                  href === '/portal'
                    ? pathname === '/portal'
                    : pathname === href || pathname?.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-[#18181b] text-[#fafafa]'
                        : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa]',
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[#27272a]">
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm text-[#a1a1aa] hover:text-[#fafafa]"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
