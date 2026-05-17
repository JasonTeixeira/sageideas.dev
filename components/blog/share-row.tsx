'use client'

import { Linkedin, Twitter, Link as LinkIcon } from 'lucide-react'

export function ShareRow({ url, title }: { url: string; title: string }) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="text-xs text-[#78716C]">Share:</span>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-[#1A1917] border border-[#2A2826] rounded-lg text-[#78716C] hover:text-[#0ED3CF] hover:border-[#0ED3CF]/50 transition-colors"
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-[#1A1917] border border-[#2A2826] rounded-lg text-[#78716C] hover:text-[#0ED3CF] hover:border-[#0ED3CF]/50 transition-colors"
        aria-label="Share on X"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(url)}
        className="p-2 bg-[#1A1917] border border-[#2A2826] rounded-lg text-[#78716C] hover:text-[#0ED3CF] hover:border-[#0ED3CF]/50 transition-colors"
        aria-label="Copy link"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
