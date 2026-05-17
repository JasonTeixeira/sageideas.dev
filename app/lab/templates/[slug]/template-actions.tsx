'use client'

import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'

type Props = {
  body: string
  filename: string
}

export function TemplateActions({ body, filename }: Props) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function download() {
    if (typeof window === 'undefined') return
    const blob = new Blob([body], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.split('/').pop() ?? 'template.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-lg bg-[#0ED3CF] px-4 py-2 text-sm font-medium text-[#09090B] transition-all hover:bg-[#0AA8A5]"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy to clipboard'}
      </button>
      <button
        type="button"
        onClick={download}
        className="inline-flex items-center gap-2 rounded-lg border border-[#2A2826] bg-[#1A1917] px-4 py-2 text-sm font-medium text-[#FAFAFA] transition-all hover:border-[#3D3A37]"
      >
        <Download className="h-4 w-4" />
        Download
      </button>
    </div>
  )
}
