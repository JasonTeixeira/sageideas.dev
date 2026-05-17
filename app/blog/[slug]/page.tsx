import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Calendar, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SectionLabel } from '@/components/section-label'
import { getBlogPostBySlug, getAllBlogPosts } from '@/lib/blog-server'
import { renderMarkdownToHtml } from '@/lib/blogMarkdown'
import { StickyCta } from '@/components/sticky-cta'
import { ShareRow } from '@/components/blog/share-row'
import { ArticleBody } from '@/components/blog/article-body'
import { ReadingProgress } from '@/components/blog/reading-progress'
import { RelatedPosts } from '@/components/blog/related-posts'
import { AuthorByline } from '@/components/blog/author-byline'

interface PageProps {
  params: Promise<{ slug: string }>
}

const SITE = 'https://www.sageideas.dev'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)
  if (!post) return { title: 'Post not found' }
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `${SITE}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `${SITE}/blog/${post.slug}`,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
      publishedTime: post.date,
      tags: post.tags,
    },
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const post = getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Strip leading H1 if it duplicates the page title (most posts start with `# Title`)
  const rawMd = post.fullContent || post.content
  const cleanedMd = rawMd.replace(/^\s*#\s+.+\n+/, '')
  const html = await renderMarkdownToHtml(cleanedMd)
  const postUrl = `${SITE}/blog/${post.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    author: {
      '@type': 'Person',
      name: 'Jason Teixeira',
      url: `${SITE}/founder`,
    },
    datePublished: post.date,
    dateModified: post.date,
    publisher: {
      '@type': 'Organization',
      name: 'Sage Ideas LLC',
      url: SITE,
    },
    mainEntityOfPage: postUrl,
    keywords: post.tags.join(', '),
    articleSection: post.category,
    image: post.coverImage ? `${SITE}${post.coverImage}` : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ReadingProgress targetSelector="#article-body" />

      <div className="min-h-screen pt-24 pb-20">
        {/* Breadcrumb */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#78716C]">
            <Link href="/" className="hover:text-[#0ED3CF] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[#0ED3CF] transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-[#A8A29E] truncate max-w-xs">{post.title}</span>
          </nav>
        </section>

        {/* Header */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <SectionLabel>{post.category}</SectionLabel>
          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-normal text-[#FAFAFA] leading-tight">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#78716C]">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs font-mono text-[#A8A29E] bg-[#1A1917] border border-[#2A2826] px-2.5 py-1 rounded-lg"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>

          <ShareRow url={postUrl} title={post.title} />
        </section>

        {/* Content */}
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <ArticleBody html={html} />
        </article>

        {/* Related */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <RelatedPosts currentSlug={post.slug} posts={getAllBlogPosts()} />
        </section>

        {/* Author byline */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AuthorByline />
        </section>

        <StickyCta
          pitch="Like what you read? Let's build something."
          ctaLabel="Book a 30-min call"
          ctaHref="/contact"
        />

        {/* Bottom CTA */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
          <div className="p-8 bg-[#1A1917] border border-[#2A2826] rounded-2xl text-center">
            <h3 className="text-2xl font-bold text-[#FAFAFA] mb-3">
              Want to see this in action?
            </h3>
            <p className="text-[#A8A29E] mb-6">
              Check out the projects and case studies behind these articles.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                asChild
                className="bg-[#0ED3CF] text-[#09090B] hover:bg-[#22D3EE] font-semibold"
              >
                <Link href="/work">View Projects</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#3D3A37] text-[#A8A29E] hover:border-[#0ED3CF] hover:text-[#0ED3CF] bg-transparent"
              >
                <Link href="/work">Read Case Studies</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
