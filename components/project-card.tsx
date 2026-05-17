'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { Github, ExternalLink, FileText, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Project } from '@/data/projects'

const statusColors = {
  production: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
  active: 'bg-[#0ED3CF]/10 text-[#0ED3CF] border-[#0ED3CF]/20',
  'open-source': 'bg-[#E85D3A]/10 text-[#E85D3A] border-[#E85D3A]/20',
  archived: 'bg-[#78716C]/10 text-[#78716C] border-[#78716C]/20',
}

const statusLabels = {
  production: 'Production',
  active: 'Active',
  'open-source': 'Open Source',
  archived: 'Archived',
}

const categoryLabels: Record<string, string> = {
  'full-stack': 'Full-Stack',
  fintech: 'FinTech',
  cloud: 'Cloud',
  qa: 'QA',
  ai: 'AI',
  security: 'Security',
  'open-source': 'Open Source',
}

interface ProjectCardProps {
  project: Project
  index?: number
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative bg-[#1A1917] border border-[#2A2826] rounded-2xl overflow-hidden transition-all duration-300"
      whileHover={{ y: -4 }}
    >
      {/* Glow effect following cursor */}
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
          style={{
            background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(6, 182, 212, 0.1), transparent 40%)`
          }}
        />
      )}
      
      {/* Gradient border on hover */}
      <div
        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{
          padding: '1px',
          background: 'linear-gradient(135deg, #0ED3CF, transparent 50%, #E85D3A)',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude'
        }}
      />

      {/* Image Placeholder */}
      <div className="aspect-video bg-[#2A2826] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0ED3CF]/5 to-[#E85D3A]/5" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#78716C] font-mono text-sm">{project.name}</span>
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-3 right-3">
          <span className="text-xs font-mono text-[#A8A29E] bg-[#09090B]/80 backdrop-blur-sm px-2 py-1 rounded">
            {categoryLabels[project.category]}
          </span>
        </div>
        
        {/* Hover overlay with quick actions */}
        <motion.div
          className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        >
          {project.github && (
            <Link
              href={project.github}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-[#1A1917] rounded-full text-[#A8A29E] hover:text-[#0ED3CF] hover:bg-[#2A2826] transition-all"
            >
              <Github className="h-5 w-5" />
            </Link>
          )}
          {project.liveUrl && (
            <Link
              href={project.liveUrl}
              target={project.liveUrl.startsWith('http') ? '_blank' : undefined}
              rel={project.liveUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="p-3 bg-[#1A1917] rounded-full text-[#A8A29E] hover:text-[#0ED3CF] hover:bg-[#2A2826] transition-all"
            >
              <ExternalLink className="h-5 w-5" />
            </Link>
          )}
          {project.caseStudy && (
            <Link
              href={project.caseStudy}
              className="p-3 bg-[#1A1917] rounded-full text-[#A8A29E] hover:text-[#0ED3CF] hover:bg-[#2A2826] transition-all"
            >
              <FileText className="h-5 w-5" />
            </Link>
          )}
        </motion.div>
      </div>

      {/* Content */}
      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-[#FAFAFA] group-hover:text-[#0ED3CF] transition-colors">
            {project.name}
          </h3>
          {project.isPrivate && (
            <Lock className="h-4 w-4 text-[#78716C] flex-shrink-0" />
          )}
        </div>

        <p className="text-sm text-[#A8A29E] mb-4 line-clamp-2">
          {project.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono text-[#78716C] bg-[#2A2826] px-2 py-1 rounded hover:bg-[#3D3A37] transition-colors"
            >
              {tag}
            </span>
          ))}
          {project.tags.length > 4 && (
            <span className="text-xs font-mono text-[#78716C]">
              +{project.tags.length - 4}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#2A2826]">
          <div className="flex items-center gap-3">
            {project.stars && project.stars > 0 && (
              <span className="text-xs text-[#78716C] flex items-center gap-1">
                <span className="text-[#F59E0B]">★</span> {project.stars}
              </span>
            )}
          </div>

          <span className={`text-xs font-medium px-2 py-1 rounded border ${statusColors[project.status]}`}>
            {statusLabels[project.status]}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
