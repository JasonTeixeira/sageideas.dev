'use client'

import { useEffect, useState } from 'react'
import { Github, Linkedin, Star, GitFork } from 'lucide-react'

const GITHUB_USER = 'JasonTeixeira'

type GhStats = { stars: number; repos: number }

export function SocialBadges({ className = '' }: { className?: string }) {
  const [gh, setGh] = useState<GhStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
          { headers: { Accept: 'application/vnd.github+json' } }
        )
        if (!res.ok) throw new Error(`status ${res.status}`)
        const repos = (await res.json()) as Array<{
          stargazers_count: number
          fork: boolean
        }>
        if (cancelled) return
        const publicNonForks = repos.filter((r) => !r.fork)
        const stars = publicNonForks.reduce(
          (sum, r) => sum + (r.stargazers_count ?? 0),
          0
        )
        setGh({ stars, repos: publicNonForks.length })
      } catch {
        if (!cancelled) setError(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const fmtStars = gh ? gh.stars.toLocaleString() : error ? '—' : '…'
  const fmtRepos = gh ? gh.repos.toLocaleString() : error ? '—' : '…'

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={`https://github.com/${GITHUB_USER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-[#2A2826] bg-[#1A1917] px-3.5 py-1.5 text-xs font-mono text-[#A8A29E] hover:border-[#0ED3CF]/40 hover:text-[#FAFAFA] transition-colors"
      >
        <Github className="w-3.5 h-3.5" />
        <Star className="w-3 h-3 text-[#F59E0B]" />
        <span className="text-[#FAFAFA]">{fmtStars}</span>
        <span className="uppercase tracking-widest">stars</span>
      </a>
      <a
        href={`https://github.com/${GITHUB_USER}?tab=repositories`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-[#2A2826] bg-[#1A1917] px-3.5 py-1.5 text-xs font-mono text-[#A8A29E] hover:border-[#0ED3CF]/40 hover:text-[#FAFAFA] transition-colors"
      >
        <GitFork className="w-3.5 h-3.5" />
        <span className="text-[#FAFAFA]">{fmtRepos}</span>
        <span className="uppercase tracking-widest">public repos</span>
      </a>
      <a
        href="https://www.linkedin.com/in/jason-teixeira/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-[#2A2826] bg-[#1A1917] px-3.5 py-1.5 text-xs font-mono text-[#A8A29E] hover:border-[#0ED3CF]/40 hover:text-[#FAFAFA] transition-colors"
      >
        <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
        <span className="text-[#FAFAFA]">5k+</span>
        <span className="uppercase tracking-widest">LinkedIn</span>
      </a>
    </div>
  )
}
