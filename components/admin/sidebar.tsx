'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { adminNav } from './nav-items';
import { cn } from '@/lib/utils';

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
          <div className="text-[10px] text-[#a1a1aa] truncate uppercase tracking-wider">
            Admin cockpit
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#06b6d4]">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      </div>

      <nav aria-label="Studio navigation" className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
        <div className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-[#a1a1aa]">
          Cockpit
        </div>
        {adminNav.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/admin'
              ? pathname === '/admin'
              : pathname === href || pathname?.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
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


    </aside>
  );
}
