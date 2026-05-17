import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090B]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <nav
          className="flex items-center gap-2 text-sm text-[#78716C] mb-8"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-[#A8A29E] transition-colors">
            Home
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/legal" className="hover:text-[#A8A29E] transition-colors">
            Legal
          </Link>
        </nav>
        <article>{children}</article>
        <div className="mt-16 pt-8 border-t border-[#2A2826]">
          <Link
            href="/legal"
            className="text-sm text-[#0ED3CF] hover:text-[#22D3EE] transition-colors"
          >
            ← Back to Legal Documents
          </Link>
        </div>
      </div>
    </div>
  )
}
