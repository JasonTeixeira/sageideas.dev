import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPortalContext } from '@/lib/portal/auth';
import { Topbar } from '@/components/portal/topbar';
import {
  HELP_ARTICLES,
  HELP_CATEGORIES,
  getArticleBySlug,
} from '@/lib/helpArticles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  return { title: article?.title ?? 'Help' };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await getPortalContext();
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const category = HELP_CATEGORIES.find((c) => c.id === article.category);

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Workspace', href: '/portal' },
          { label: 'Help', href: '/portal/help' },
          { label: article.title },
        ]}
      />
      <div className="px-6 lg:px-8 py-8 max-w-3xl">
        {category && (
          <div className="text-xs uppercase tracking-wider text-[#06b6d4] font-medium mb-2">
            {category.label}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-[#fafafa]">
          {article.title}
        </h1>
        <p className="text-sm text-[#a1a1aa] mt-3 leading-relaxed">{article.intro}</p>

        <ol className="mt-6 space-y-3">
          {article.steps.map((step, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-lg border border-[#27272a] bg-[#0a0a0c] p-4"
            >
              <div className="shrink-0 w-6 h-6 rounded-full bg-[#18181b] border border-[#27272a] text-[#06b6d4] text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </div>
              <p className="text-sm text-[#e4e4e7] leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>

        {article.notes && (
          <div className="mt-6 rounded-lg border border-[#27272a] bg-[#18181b] p-4">
            <div className="text-xs uppercase tracking-wider text-[#a1a1aa] font-medium mb-1.5">
              Note
            </div>
            <p className="text-sm text-[#e4e4e7] leading-relaxed">{article.notes}</p>
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-[#27272a] flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#a1a1aa]">
            Need help? Email{' '}
            <a
              href="mailto:sage@sageideas.dev"
              className="text-[#06b6d4] hover:text-[#22d3ee]"
            >
              sage@sageideas.dev
            </a>
            .
          </p>
          <Link
            href="/portal/help"
            className="text-sm text-[#a1a1aa] hover:text-[#fafafa]"
          >
            Back to help center
          </Link>
        </div>
      </div>
    </>
  );
}
