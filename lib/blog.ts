import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface BlogPost {
  id: number
  slug: string
  title: string
  excerpt: string
  content: string
  fullContent: string
  category: string
  tags: string[]
  date: string
  readTime: string
  coverImage?: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

/**
 * Read a single MDX file and return a BlogPost object.
 */
function parseMdxFile(filename: string): BlogPost | null {
  const filepath = path.join(BLOG_DIR, filename)
  try {
    const raw = fs.readFileSync(filepath, 'utf-8')
    const { data, content } = matter(raw)

    return {
      id: data.id ?? 0,
      slug: data.slug ?? filename.replace(/\.mdx?$/, ''),
      title: data.title ?? '',
      excerpt: data.excerpt ?? '',
      content: content.slice(0, 200),
      fullContent: content,
      category: data.category ?? 'Engineering',
      tags: data.tags ?? [],
      date: data.date ?? '2025-01-01',
      readTime: data.readTime ?? '5 min read',
      coverImage: data.coverImage,
    }
  } catch {
    return null
  }
}

/**
 * Get all blog posts, sorted by date descending.
 */
export function getAllBlogPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return []

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))
  const posts = files
    .map(parseMdxFile)
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return posts
}

/**
 * Get a single blog post by slug.
 */
export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  // Try direct file lookup first (fast path)
  const directPath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (fs.existsSync(directPath)) {
    return parseMdxFile(`${slug}.mdx`) ?? undefined
  }

  // Fallback: scan all posts (handles id-based lookup)
  const posts = getAllBlogPosts()
  return posts.find((p) => p.slug === slug || String(p.id) === slug)
}

/**
 * Legacy compatibility export — same interface as blogData.ts
 */
export const blogPosts: BlogPost[] = getAllBlogPosts()
