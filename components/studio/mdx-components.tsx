import type { MDXComponents } from 'mdx/types'
import type { ComponentPropsWithoutRef } from 'react'

/**
 * Typed MDX component overrides used by the legal pages. We deliberately don't
 * ship `@tailwindcss/typography` — these styles are tightly tuned to the
 * studio brand and easier to audit when they live in component code.
 */
export const legalMdxComponents: MDXComponents = {
  h1: (props: ComponentPropsWithoutRef<'h1'>) => (
    <h1
      className="text-4xl sm:text-5xl font-normal tracking-tight text-[#FAFAFA] mb-6 mt-2 leading-tight"
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<'h2'>) => (
    <h2
      className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#FAFAFA] mt-12 mb-4 leading-snug"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<'h3'>) => (
    <h3
      className="text-xl font-semibold tracking-tight text-[#FAFAFA] mt-8 mb-3 leading-snug"
      {...props}
    />
  ),
  h4: (props: ComponentPropsWithoutRef<'h4'>) => (
    <h4 className="text-lg font-semibold text-[#FAFAFA] mt-6 mb-2" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<'p'>) => (
    <p className="text-[#A8A29E] leading-relaxed my-4 text-[15px]" {...props} />
  ),
  a: (props: ComponentPropsWithoutRef<'a'>) => (
    <a
      className="text-[#0ED3CF] hover:text-[#22D3EE] underline underline-offset-4 transition-colors"
      {...props}
    />
  ),
  strong: (props: ComponentPropsWithoutRef<'strong'>) => (
    <strong className="text-[#FAFAFA] font-semibold" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<'em'>) => (
    <em className="text-[#FAFAFA] not-italic font-medium" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<'ul'>) => (
    <ul className="list-disc pl-6 space-y-1.5 my-4 text-[#A8A29E] marker:text-[#0ED3CF]" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<'ol'>) => (
    <ol
      className="list-decimal pl-6 space-y-1.5 my-4 text-[#A8A29E] marker:text-[#78716C]"
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<'li'>) => (
    <li className="leading-relaxed text-[15px]" {...props} />
  ),
  hr: (props: ComponentPropsWithoutRef<'hr'>) => (
    <hr className="border-t border-[#2A2826] my-10" {...props} />
  ),
  blockquote: (props: ComponentPropsWithoutRef<'blockquote'>) => (
    <blockquote
      className="border-l-2 border-[#0ED3CF] pl-4 my-6 text-[#A8A29E] italic"
      {...props}
    />
  ),
  code: (props: ComponentPropsWithoutRef<'code'>) => (
    <code
      className="text-[#0ED3CF] bg-[#12110F] border border-[#2A2826] px-1.5 py-0.5 rounded text-[13px] font-mono"
      {...props}
    />
  ),
  pre: (props: ComponentPropsWithoutRef<'pre'>) => (
    <pre
      className="bg-[#12110F] border border-[#2A2826] rounded-lg p-4 overflow-x-auto text-[13px] my-6"
      {...props}
    />
  ),
  table: (props: ComponentPropsWithoutRef<'table'>) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full text-[14px] border-collapse" {...props} />
    </div>
  ),
  thead: (props: ComponentPropsWithoutRef<'thead'>) => (
    <thead className="text-[#FAFAFA] border-b border-[#2A2826]" {...props} />
  ),
  th: (props: ComponentPropsWithoutRef<'th'>) => (
    <th className="text-left py-2 px-3 font-semibold text-[#FAFAFA]" {...props} />
  ),
  td: (props: ComponentPropsWithoutRef<'td'>) => (
    <td className="py-2 px-3 text-[#A8A29E] border-b border-[#2A2826]/50 align-top" {...props} />
  ),
}
