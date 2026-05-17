'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

export type EvidenceItem = {
  src: string
  caption: string
  label?: string
}

type Props = {
  items: EvidenceItem[]
  /** Section heading, e.g. "Receipts from real shipped infrastructure" */
  heading?: string
  /** Sub-paragraph context. */
  blurb?: string
  /** When true, links each tile to the artifact source. */
  linkArtifacts?: boolean
}

/**
 * A reusable strip of evidence SVGs/screenshots. Pulls from real artifacts
 * under /public — no fake mockups. Used on marketing pages to give every
 * claim a visual receipt.
 */
export function EvidenceStrip({ items, heading, blurb, linkArtifacts = false }: Props) {
  return (
    <div>
      {(heading || blurb) && (
        <div className="max-w-2xl mb-8">
          {heading && (
            <h3 className="text-2xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
              {heading}
            </h3>
          )}
          {blurb && (
            <p className="mt-3 text-[#A8A29E] text-sm leading-relaxed">
              {blurb}
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, i) => {
          const tile = (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group rounded-xl border border-[#2A2826] bg-[#12110F] overflow-hidden hover:border-[#0ED3CF]/30 transition-colors"
            >
              <div className="aspect-[16/10] bg-[#0B0A09] border-b border-[#2A2826] relative overflow-hidden">
                <Image
                  src={item.src}
                  alt={item.caption}
                  fill
                  className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.01]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-4">
                {item.label && (
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#0ED3CF] mb-1.5">
                    {item.label}
                  </div>
                )}
                <div className="text-sm text-[#E4E4E7] leading-snug flex items-start gap-1.5">
                  <span className="flex-1">{item.caption}</span>
                  {linkArtifacts && (
                    <ExternalLink className="h-3.5 w-3.5 text-[#78716C] shrink-0 mt-0.5" aria-hidden />
                  )}
                </div>
              </div>
            </motion.div>
          )
          return linkArtifacts ? (
            <Link
              key={item.src + i}
              href={item.src}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {tile}
            </Link>
          ) : (
            <div key={item.src + i}>{tile}</div>
          )
        })}
      </div>
    </div>
  )
}
