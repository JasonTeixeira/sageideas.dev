import Link from 'next/link';
import { getPortalContext } from '@/lib/portal/auth';
import { Topbar } from '@/components/portal/topbar';
import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  type HelpCategory,
} from '@/lib/helpArticles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = { title: 'Help' };

function CategoryIcon({ id }: { id: HelpCategory }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'getting-started':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case 'documents':
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    case 'invoices':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case 'messaging':
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
  }
}

export default async function HelpIndexPage() {
  await getPortalContext();
  return (
    <>
      <Topbar
        crumbs={[{ label: 'Workspace', href: '/portal' }, { label: 'Help' }]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
            Help center
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Step-by-step guides for everything you can do inside the portal. Cannot find what
            you need? Email{' '}
            <a
              href="mailto:sage@sageideas.dev"
              className="text-[#06b6d4] hover:text-[#22d3ee]"
            >
              sage@sageideas.dev
            </a>
            .
          </p>
        </div>

        <div className="space-y-10">
          {HELP_CATEGORIES.map((cat) => {
            const articles = HELP_ARTICLES.filter((a) => a.category === cat.id);
            if (articles.length === 0) return null;
            return (
              <section key={cat.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#18181b] border border-[#27272a] text-[#06b6d4] flex items-center justify-center">
                    <CategoryIcon id={cat.id} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#fafafa]">{cat.label}</h2>
                    <p className="text-xs text-[#a1a1aa]">{cat.description}</p>
                  </div>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {articles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/portal/help/${a.slug}`}
                        className="block rounded-lg border border-[#27272a] bg-[#0a0a0c] p-4 hover:border-[#3f3f46] hover:bg-[#18181b] transition-colors"
                      >
                        <div className="text-sm font-medium text-[#fafafa]">{a.title}</div>
                        <div className="text-xs text-[#a1a1aa] mt-1 line-clamp-2">
                          {a.intro}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}
