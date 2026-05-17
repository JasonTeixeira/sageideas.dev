'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { ArrowRight, Home, RotateCcw } from 'lucide-react'
import { reportError } from '@/components/client-error-reporter'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfaces in Vercel logs; client-side console for local dev.
    console.error('[app/error]', error)
    reportError({
      message: error.message,
      stack: error.stack ?? null,
      digest: error.digest ?? null,
      severity: 'error',
    })
  }, [error])

  return (
    <div className="min-h-[80vh] bg-[#09090B] flex items-center">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#FCD34D]">
            Status 500 · unexpected error
          </span>
        </div>
        <h1 className="text-6xl sm:text-7xl font-bold text-[#FAFAFA] leading-none tracking-tight">
          Something failed.
        </h1>
        <p className="mt-6 text-lg text-[#A8A29E] leading-relaxed max-w-xl">
          A runtime error popped on the server. It’s being logged. Try again, head home, or send a quick note if it keeps happening — we read every report.
        </p>

        {error.digest && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#2A2826] bg-[#12110F] px-3 py-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#78716C]">Digest</span>
            <span className="text-xs font-mono text-[#A8A29E]">{error.digest}</span>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#0ED3CF] hover:bg-[#22D3EE] text-[#09090B] font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-[#2A2826] hover:border-[#3D3A37] text-[#FAFAFA] font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            Back home
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-[#2A2826] hover:border-[#3D3A37] text-[#FAFAFA] font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Report it
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
