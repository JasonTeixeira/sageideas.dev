'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Home, RotateCcw } from 'lucide-react'

export default function PortalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[portal/error]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-xl w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#FCD34D]">
            Portal · runtime error
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[#FAFAFA] tracking-tight">
          We couldn&apos;t load that page.
        </h1>
        <p className="mt-4 text-[#A1A1AA] leading-relaxed">
          Something went wrong while loading your portal. The error has been logged. Try again or head back to your home — if it keeps happening, send a note with the digest.
        </p>

        {error.digest && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#0F0F12] px-3 py-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#71717A]">Digest</span>
            <span className="text-xs font-mono text-[#A1A1AA]">{error.digest}</span>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#06B6D4] hover:bg-[#22D3EE] text-[#09090B] font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/portal/home"
            className="inline-flex items-center gap-2 border border-[#27272A] hover:border-[#3F3F46] text-[#FAFAFA] font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            Portal home
          </Link>
        </div>
      </div>
    </div>
  )
}
