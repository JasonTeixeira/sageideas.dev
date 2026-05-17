import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { readLegalDoc } from '@/lib/legal'
import { legalMdxComponents } from '@/components/studio/mdx-components'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of sageideas.dev and engagements with Sage Ideas LLC.',
  robots: { index: true, follow: true },
}

export default async function LegalDocPage() {
  const { frontmatter, body } = await readLegalDoc('terms')
  return (
    <>
      <header className="mb-12 pb-8 border-b border-[#2A2826]">
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-3">
          Legal Document
        </p>
        <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-[#FAFAFA] leading-tight">
          {frontmatter.title ?? 'Terms of Service'}
        </h1>
        {frontmatter.summary ? (
          <p className="mt-4 text-[#A8A29E] leading-relaxed">{frontmatter.summary}</p>
        ) : null}
        {frontmatter.lastUpdated ? (
          <p className="mt-4 text-xs font-mono text-[#78716C]">
            Last updated · {frontmatter.lastUpdated}
          </p>
        ) : null}
      </header>
      <MDXRemote source={body} components={legalMdxComponents} />
    </>
  )
}
