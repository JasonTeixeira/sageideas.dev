import type { Metadata } from 'next'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { readLegalDoc } from '@/lib/legal'
import { legalMdxComponents } from '@/components/studio/mdx-components'

export const metadata: Metadata = {
  title: 'Mutual NDA',
  description: 'Standard mutual non-disclosure agreement template.',
  robots: { index: true, follow: true },
}

export default async function LegalDocPage() {
  const { frontmatter, body } = await readLegalDoc('nda')
  return (
    <>
      <header className="mb-12 pb-8 border-b border-[#2A2826]">
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#0ED3CF] mb-3">
          Legal Document
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#FAFAFA] leading-tight">
          {frontmatter.title ?? 'Mutual NDA'}
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
