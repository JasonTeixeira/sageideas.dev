import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight, Scale } from 'lucide-react'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      {/* Subtle brand header strip */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#0ED3CF]/20 to-transparent" />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        {/* Breadcrumb with icon */}
        <nav
          className="flex items-center gap-2 text-sm text-[#78716C] mb-8"
          aria-label="Breadcrumb"
        >
          <Scale className="w-4 h-4 text-[#0ED3CF]" />
          <Link href="/" className="hover:text-[#A8A29E] transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/legal" className="hover:text-[#A8A29E] transition-colors">
            Legal
          </Link>
        </nav>

        {/* Article with prose styling */}
        <article className="prose-sage">{children}</article>

        {/* Back link */}
        <div className="mt-16 pt-8 border-t border-[#2A2826]">
          <div className="flex items-center justify-between">
            <Link
              href="/legal"
              className="text-sm text-[#0ED3CF] hover:text-[#33EBE8] transition-colors"
            >
              &larr; Back to Legal Documents
            </Link>
            <span className="text-xs text-[#57534E] font-mono">
              sage@sageideas.dev
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
