import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { BlogPost } from '@/lib/blogData'
import { PostCover } from './post-cover'

interface RelatedPostsProps {
  currentSlug: string
  posts: BlogPost[]
}

export function RelatedPosts({ currentSlug, posts }: RelatedPostsProps) {
  const current = posts.find((p) => p.slug === currentSlug)
  if (!current) return null

  const sameCategory = posts.filter(
    (p) => p.slug !== currentSlug && p.category === current.category,
  )

  const tagSet = new Set(current.tags)
  const sameTags = posts.filter(
    (p) =>
      p.slug !== currentSlug &&
      p.category !== current.category &&
      p.tags.some((t) => tagSet.has(t)),
  )

  const related = [...sameCategory, ...sameTags].slice(0, 3)
  if (related.length === 0) return null

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-6">
        <h3 className="text-xl font-bold text-[#FAFAFA]">Related reading</h3>
        <Link
          href="/blog"
          className="text-sm text-[#0ED3CF] hover:text-[#22D3EE] transition-colors"
        >
          All posts →
        </Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {related.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group block rounded-xl overflow-hidden border border-[#2A2826] bg-[#1A1917] hover:border-[#0ED3CF]/50 transition-all"
          >
            <PostCover
              src={p.coverImage}
              alt={p.title}
              category={p.category}
              className="aspect-[16/9] w-full"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="p-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF]">
                {p.category}
              </span>
              <h4 className="text-sm font-semibold text-[#FAFAFA] mt-2 line-clamp-2 group-hover:text-[#0ED3CF] transition-colors">
                {p.title}
              </h4>
              <div className="flex items-center gap-1 text-[11px] text-[#78716C] mt-3">
                <Clock className="h-3 w-3" />
                {p.readTime}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
