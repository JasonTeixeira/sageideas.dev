import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import { initials } from '@/lib/utils';
import { MobileNav } from '@/components/portal/mobile-nav';

export interface Crumb {
  label: string;
  href?: string;
}

export function AdminTopbar({
  crumbs = [],
  email,
  fullName,
}: {
  crumbs?: Crumb[];
  email: string;
  fullName?: string | null;
}) {
  const display = fullName || email;
  return (
    <header className="sticky top-0 z-20 border-b border-[#27272a] bg-[#0a0a0c]/95 backdrop-blur">
      <div className="flex items-center gap-4 px-6 lg:px-8 py-3">
        <MobileNav isAdmin />
        <nav className="flex items-center gap-1.5 text-xs text-[#71717a] flex-1 min-w-0">
          <Link href="/admin" className="hover:text-[#fafafa] truncate">Admin</Link>
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              <span className="text-[#3f3f46]">/</span>
              {c.href ? (
                <Link href={c.href} className="hover:text-[#fafafa] truncate">{c.label}</Link>
              ) : (
                <span className="text-[#fafafa] truncate">{c.label}</span>
              )}
            </span>
          ))}
        </nav>

        <form action="/admin/crm" className="hidden md:block">
          <input
            type="search"
            name="q"
            placeholder="Search clients, projects…"
            className="w-72 rounded-lg border border-[#27272a] bg-[#0f0f12] px-3 py-1.5 text-xs text-[#fafafa] placeholder:text-[#52525b] focus:border-[#06b6d4]/60 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-xs text-[#fafafa] truncate max-w-[160px]">{display}</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#06b6d4]">
              Admin
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/30 flex items-center justify-center text-xs font-semibold text-[#06b6d4]">
            {initials(display)}
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-[#27272a] px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-[#a1a1aa] hover:border-[#06b6d4] hover:text-[#06b6d4] transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
