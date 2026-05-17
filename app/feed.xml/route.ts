import { getAllBlogPosts } from '@/lib/blog-server'

export async function GET() {
  const baseUrl = 'https://www.sageideas.dev'

  const items = getAllBlogPosts()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <category>${post.category}</category>
      <author>sage@sageideas.org (Jason Teixeira)</author>
    </item>`)
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jason Teixeira — Engineering &amp; Architecture</title>
    <description>Technical writing on systems architecture, automation, trading systems, cloud infrastructure, and software engineering.</description>
    <link>${baseUrl}/blog</link>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <managingEditor>sage@sageideas.org (Jason Teixeira)</managingEditor>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>`

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
