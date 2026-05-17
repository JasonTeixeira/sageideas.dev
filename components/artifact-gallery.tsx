'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type Artifact = {
  src: string
  caption: string
  kind: 'diagram' | 'screenshot' | 'terminal' | 'dashboard' | 'report'
  /** Optional aspect ratio override. Defaults vary by kind. */
  aspect?: 'video' | 'square' | 'wide' | 'portrait'
  /** Optional subtitle/label */
  label?: string
}

const aspectClass: Record<NonNullable<Artifact['aspect']>, string> = {
  video: 'aspect-video',
  square: 'aspect-square',
  wide: 'aspect-[16/7]',
  portrait: 'aspect-[3/4]',
}

const kindLabel: Record<Artifact['kind'], string> = {
  diagram: 'Architecture',
  screenshot: 'Screenshot',
  terminal: 'Terminal',
  dashboard: 'Dashboard',
  report: 'Report',
}

const kindAccent: Record<Artifact['kind'], string> = {
  diagram: 'text-[#0ED3CF] border-[#0ED3CF]/30',
  screenshot: 'text-[#E85D3A] border-[#E85D3A]/30',
  terminal: 'text-[#10B981] border-[#10B981]/30',
  dashboard: 'text-[#F59E0B] border-[#F59E0B]/30',
  report: 'text-[#EC4899] border-[#EC4899]/30',
}

type Props = {
  /** Section eyebrow shown above the grid */
  eyebrow?: string
  /** Section title */
  title?: string
  /** Optional intro paragraph */
  description?: string
  artifacts: Artifact[]
  /** 1, 2, or 3 columns at desktop. Defaults to 2. */
  columns?: 1 | 2 | 3
  className?: string
}

/**
 * Visual proof strip. Renders artifacts (architecture diagrams, screenshots,
 * dashboards, terminal output) with mono-styled caption frames.
 *
 * Use on case studies before "What shipped", on the process page between
 * phase blocks, and anywhere the wall of prose needs evidence.
 */
export function ArtifactGallery({
  eyebrow = 'Evidence',
  title,
  description,
  artifacts,
  columns = 2,
  className,
}: Props) {
  if (!artifacts || artifacts.length === 0) return null

  const colClass =
    columns === 1
      ? 'grid-cols-1'
      : columns === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-1 lg:grid-cols-2'

  return (
    <section className={cn('relative', className)}>
      {(eyebrow || title || description) && (
        <div className="mb-8">
          {eyebrow && (
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#0ED3CF] mb-3">
              {eyebrow}
            </div>
          )}
          {title && (
            <h3 className="text-2xl sm:text-3xl font-normal tracking-tight text-[#FAFAFA]">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-[#A8A29E] text-base leading-relaxed mt-3 max-w-2xl">
              {description}
            </p>
          )}
        </div>
      )}

      <div className={cn('grid gap-5', colClass)}>
        {artifacts.map((a, i) => {
          const aspect = a.aspect ?? (a.kind === 'diagram' ? 'wide' : 'video')
          return (
            <motion.figure
              key={a.src + i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group relative bg-[#12110F] border border-[#2A2826] rounded-2xl overflow-hidden hover:border-[#3D3A37] transition-colors"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#2A2826]">
                <span
                  className={cn(
                    'text-[10px] font-mono uppercase tracking-[0.22em] px-2 py-1 rounded border bg-[#09090B]',
                    kindAccent[a.kind],
                  )}
                >
                  {kindLabel[a.kind]}
                </span>
                {a.label && (
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#78716C]">
                    {a.label}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'relative bg-[#09090B] overflow-hidden',
                  aspectClass[aspect],
                )}
              >
                <Image
                  src={a.src}
                  alt={a.caption}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
              <figcaption className="px-5 py-4 text-sm text-[#A8A29E] leading-relaxed border-t border-[#2A2826]">
                {a.caption}
              </figcaption>
            </motion.figure>
          )
        })}
      </div>
    </section>
  )
}
