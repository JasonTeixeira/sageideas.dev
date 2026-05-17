'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, ArrowRight, Search } from 'lucide-react'
import { SectionLabel } from '@/components/section-label'
import { blogPosts } from '@/lib/blogData'
import { Stagger, StaggerItem } from '@/components/motion'
import { PostCover } from '@/components/blog/post-cover'

const ALL_CATEGORIES = [
  'All',
  'Architecture',
  'Engineering',
  'Career',
  'Cloud Automation',
  'Trading',
  'Testing',
  'Security',
  'DevOps',
  'AI',
]

const PINNED_SLUGS = [
  'building-a-fintech-platform-solo-185-tables-69-apis-7-systems',
  'building-a-production-ready-api-testing-framework',
  'what-trading-futures-taught-me-about-writing-software',
  'github-oidc-aws-no-long-lived-keys-cloud-automation-the-right-way',
  'i-read-50-senior-engineer-job-descriptions-here',
]

export function BlogContent() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Sort posts by date desc once for stable ordering
  const sortedPosts = useMemo(() => {
    return [...blogPosts].sort((a, b) => (a.date < b.date ? 1 : -1))
  }, [])

  const featuredPost = sortedPosts[0]

  const filteredPosts = useMemo(() => {
    return sortedPosts.filter((post) => {
      const matchesCategory = activeCategory === 'All' || post.category === activeCategory
      const matchesSearch =
        searchQuery === '' ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery, sortedPosts])

  const pinnedPosts = useMemo(() => {
    return blogPosts.filter((post) => PINNED_SLUGS.includes(post.slug))
  }, [])

  const showPinned = activeCategory === 'All' && searchQuery === ''
  const showFeatured = showPinned && featuredPost

  // Filter out the featured post from the grid only when displayed
  const gridPosts = showFeatured
    ? filteredPosts.filter((p) => p.slug !== featuredPost.slug)
    : filteredPosts

  return (
    <div className="min-h-screen bg-[#09090B] pt-24 pb-20">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel>Blog</SectionLabel>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-normal text-[#FAFAFA]">
            Engineering &amp; Architecture
          </h1>
          <p className="mt-6 text-lg text-[#A8A29E] max-w-2xl">
            Technical writing on systems architecture, automation, cloud infrastructure, and
            software engineering. {blogPosts.length} articles with real code examples.
          </p>
        </motion.div>
      </section>

      {/* Featured */}
      {showFeatured && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group block rounded-3xl overflow-hidden border border-[#2A2826] bg-[#12110F] hover:border-[#0ED3CF]/50 transition-all"
            >
              <div className="grid lg:grid-cols-2 gap-0">
                <PostCover
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  category={featuredPost.category}
                  className="aspect-[16/9] lg:aspect-auto lg:h-full w-full"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div className="p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#0ED3CF] bg-[#0ED3CF]/10 border border-[#0ED3CF]/30 px-2.5 py-1 rounded-full">
                      Featured
                    </span>
                    <span className="text-xs font-mono text-[#0ED3CF]">
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#78716C]">
                      <Clock className="h-3 w-3" />
                      {featuredPost.readTime}
                    </span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-normal text-[#FAFAFA] leading-tight group-hover:text-[#0ED3CF] transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="mt-5 text-[#A8A29E] leading-relaxed line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                  <div className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-[#0ED3CF] group-hover:gap-2.5 transition-all">
                    Read article
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </section>
      )}

      {/* Search + Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78716C]" />
          <input
            type="text"
            placeholder="Search articles by title, topic, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#1A1917] border border-[#2A2826] rounded-xl text-[#FAFAFA] text-sm placeholder:text-[#57534E] focus:outline-none focus:border-[#0ED3CF]/50 focus:ring-1 focus:ring-[#0ED3CF]/20 transition-colors"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-colors ${
                activeCategory === category
                  ? 'bg-[#0ED3CF] text-[#09090B] font-semibold'
                  : 'bg-[#1A1917] border border-[#2A2826] text-[#A8A29E] hover:border-[#0ED3CF]/50 hover:text-[#0ED3CF]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="mt-4 text-xs text-[#78716C]">
          {searchQuery || activeCategory !== 'All'
            ? `${filteredPosts.length} article${filteredPosts.length !== 1 ? 's' : ''} found`
            : `${blogPosts.length} articles`}
        </p>
      </section>

      {/* Pinned / Start Here */}
      {showPinned && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
          <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full" />
            Start Here
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group p-4 bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl hover:border-[#10B981]/50 transition-colors"
              >
                <span className="text-xs font-mono text-[#10B981] mb-2 block">
                  {post.category}
                </span>
                <h3 className="text-sm font-semibold text-[#FAFAFA] group-hover:text-[#10B981] transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <span className="text-xs text-[#78716C] mt-2 block">{post.readTime}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Posts Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {gridPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#78716C] text-lg">No articles found matching your search.</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('All')
              }}
              className="mt-4 text-[#0ED3CF] hover:text-[#22D3EE] text-sm transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" gap={0.05}>
            {gridPosts.map((post) => (
              <StaggerItem key={post.id} className="h-full">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block h-full bg-[#1A1917] border border-[#2A2826] rounded-2xl hover:border-[#0ED3CF]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] overflow-hidden"
                >
                  <PostCover
                    src={post.coverImage}
                    alt={post.title}
                    category={post.category}
                    className="aspect-[16/9] w-full"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-mono text-[#0ED3CF] bg-[#0ED3CF]/10 px-2 py-1 rounded">
                        {post.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[#78716C]">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-[#FAFAFA] mb-3 group-hover:text-[#0ED3CF] transition-colors">
                      {post.title}
                    </h2>

                    <p className="text-sm text-[#A8A29E] mb-4 line-clamp-3">{post.excerpt}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-mono text-[#78716C] bg-[#2A2826] px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[#2A2826]">
                      <span className="text-xs text-[#78716C]">
                        {new Date(post.date).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="inline-flex items-center text-sm font-medium text-[#0ED3CF] group-hover:text-[#22D3EE] transition-colors">
                        Read Article
                        <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  )
}
