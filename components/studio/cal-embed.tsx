'use client'

import Cal, { getCalApi } from '@calcom/embed-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Calendar, Mail } from 'lucide-react'

const CAL_LINK = process.env.NEXT_PUBLIC_CAL_LINK || 'sage-ideas/discovery'
const CAL_TIMEOUT_MS = 6000

export function CalEmbed({ calLink = CAL_LINK }: { calLink?: string }) {
  const [embedReady, setEmbedReady] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        const cal = await getCalApi()
        cal('ui', {
          theme: 'dark',
          styles: { branding: { brandColor: '#0ED3CF' } },
          hideEventTypeDetails: false,
        })

        // The embed renders its own iframe; if Cal cannot reach the username
        // (for example: account not yet provisioned), the iframe paints a
        // 404 inside. We give it a window to load — if it errors out or
        // times out, surface our manual fallback so /book is never a dead end.
        const iframeCheck = setTimeout(() => {
          if (cancelled) return
          const iframe = document.querySelector<HTMLIFrameElement>(
            'iframe[src*="cal.com"]'
          )
          if (!iframe) {
            setEmbedReady('failed')
            return
          }
          setEmbedReady('ready')
        }, CAL_TIMEOUT_MS)

        return () => clearTimeout(iframeCheck)
      } catch {
        if (!cancelled) setEmbedReady('failed')
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [calLink])

  if (embedReady === 'failed') {
    return <ManualBookingFallback />
  }

  return (
    <div className="relative">
      {embedReady === 'loading' && <EmbedSkeleton />}
      <Cal
        calLink={calLink}
        style={{ width: '100%', height: '100%', minHeight: 700 }}
        config={{ layout: 'month_view' }}
      />
    </div>
  )
}

function EmbedSkeleton() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#12110F] pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-[#2A2826] border-t-[#0ED3CF] animate-spin" />
        <p className="text-xs font-mono uppercase tracking-widest text-[#78716C]">
          Loading scheduler
        </p>
      </div>
    </div>
  )
}

function ManualBookingFallback() {
  return (
    <div className="px-6 py-12 sm:py-16 text-center">
      <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-[#0ED3CF]/10 border border-[#0ED3CF]/30 mb-5">
        <Calendar className="h-5 w-5 text-[#0ED3CF]" />
      </div>
      <h3 className="text-2xl font-bold text-[#FAFAFA]">
        Schedule directly with the founder
      </h3>
      <p className="mt-3 text-[#A8A29E] text-sm leading-relaxed max-w-md mx-auto">
        Fill out a short structured inquiry — project, timeline, preferred days.
        You&apos;ll have three call options within{' '}
        <span className="text-[#FAFAFA] font-semibold">2 business hours</span>.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/contact?type=consult&source=cal-embed"
          className="inline-flex items-center gap-2 bg-[#0ED3CF] hover:bg-[#0AA8A5] text-[#09090B] font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Mail className="h-4 w-4" />
          Request a call
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 border border-[#3D3A37] text-[#FAFAFA] hover:border-[#0ED3CF] hover:text-[#0ED3CF] font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Use the contact form
        </Link>
      </div>
      <p className="mt-6 text-xs font-mono text-[#78716C]">
        Response within 2 business hours · 9am–6pm ET, Mon–Fri
      </p>
    </div>
  )
}
