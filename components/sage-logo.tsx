"use client"

export type LogoSize = "sm" | "md" | "lg" | "xl"

interface SageLogoProps {
  size?: LogoSize
  showText?: boolean
  className?: string
}

/**
 * Scale config for each named size.
 * `mark` = rendered pixel width of the SVG mark (viewBox 100 × 160).
 */
const SIZE_MAP: Record<
  LogoSize,
  {
    mark: number
    gap: number
    fontSize: number
    letterSpacing: string
    subtitleSize: number
  }
> = {
  sm: { mark: 44,  gap: 9,  fontSize: 7.8,  letterSpacing: "0.12em", subtitleSize: 5 },
  md: { mark: 76,  gap: 15, fontSize: 13.5, letterSpacing: "0.12em", subtitleSize: 8.5 },
  lg: { mark: 116, gap: 22, fontSize: 20.5, letterSpacing: "0.12em", subtitleSize: 13 },
  xl: { mark: 192, gap: 36, fontSize: 33,   letterSpacing: "0.12em", subtitleSize: 21 },
}

// Unique ID suffix so multiple logos on one page don't clash
let _idCounter = 0

export function SageLogo({ size = "md", showText = true, className = "" }: SageLogoProps) {
  const { mark, gap, fontSize, letterSpacing, subtitleSize } = SIZE_MAP[size]

  // Each instance gets its own gradient/filter IDs
  // We use a stable value per render (not incremented each render in StrictMode)
  const uid = `sage-${size}`

  // Mark lives in viewBox 0 0 100 160 — we scale to `mark` px wide
  const vbW = 100
  const vbH = 160
  const markH = (mark / vbW) * vbH // preserves aspect ratio

  // Wordmark is wider than the mark — pad horizontally
  const padding = 8
  const totalW = showText ? Math.max(mark, mark * 2.05) + padding * 2 : mark + padding * 2
  const markOffsetX = (totalW - mark) / 2

  const textY = markH + gap
  const totalH = showText
    ? textY + fontSize * 1.15 + subtitleSize * 2.2 + 6
    : markH

  // ─────────────────────────────────────────────────────────────────────────────
  // THE RIBBON PATHS (in 100×160 coordinate space)
  // ─────────────────────────────────────────────────────────────────────────────
  //
  // The S-curve is a closed filled shape — outer contour + inner contour.
  // Designed as a ribbon that flows:
  //   • Top: arches to the RIGHT  (coral zone)
  //   • Mid: crosses through centre (lime transition)
  //   • Bottom: arches to the LEFT (cyan zone)
  //
  // Ribbon width (stroke equivalent) ≈ 18–22 units at its widest.

  // Outer (left) edge — traced top-to-bottom
  const outerEdge = `
    M 58 6
    C 88 4,  96 36,  68 54
    C 48 65,  24 68,  18 82
    C 10 98,  16 128, 44 150
    L 56 154
  `

  // Inner (right) edge — traced bottom-to-top to close the shape
  const innerEdge = `
    C 34 144,  28 118,  38 102
    C 48 88,   72 84,   82 68
    C 94 50,   86 14,   58 6
    Z
  `

  const ribbonD = outerEdge + innerEdge

  // Highlight sheen — thin bright path along the upper-inner face of the ribbon
  const sheenD = `
    M 62 10
    C 84 12,  88 42,  66 56
    C 50 66,  30 70,  24 84
  `

  // Secondary subtle sheen near bottom loop
  const sheenD2 = `
    M 36 104
    C 28 118,  30 140,  46 150
  `

  // Coral dot accent: floats just off the top-right curve of the S
  const dotCX = 81
  const dotCY = 18
  // Dot radius scales with mark size but stays crisp
  const dotR = Math.max(2.8, Math.min(5.5, mark * 0.052))

  return (
    <svg
      viewBox={`0 0 ${totalW} ${totalH}`}
      width={totalW}
      height={totalH}
      className={className}
      aria-label="Sage Ideas"
      role="img"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflow: "visible", display: "block" }}
    >
      <defs>
        {/* ── Ribbon gradient: coral → lime → cyan (vertical) ── */}
        <linearGradient id={`${uid}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E85D3A" />
          <stop offset="38%"  stopColor="#CC8C28" />
          <stop offset="58%"  stopColor="#A8C633" />
          <stop offset="100%" stopColor="#0ED3CF" />
        </linearGradient>

        {/* ── Sheen gradient: bright → transparent ── */}
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="white" stopOpacity="0.38" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* ── Ambient glow behind the whole mark ── */}
        <filter id={`${uid}-ambient`} x="-60%" y="-40%" width="220%" height="180%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>

        {/* ── Soft edge glow on the ribbon ── */}
        <filter id={`${uid}-edge-glow`} x="-20%" y="-10%" width="140%" height="120%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>

        {/* ── Dot glow halo ── */}
        <filter id={`${uid}-dot-glow`} x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feComposite in="SourceGraphic" in2="b" operator="over" />
        </filter>

        {/* ── Drop shadow under ribbon for depth ── */}
        <filter id={`${uid}-shadow`} x="-20%" y="-10%" width="150%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="6" floodColor="#E85D3A" floodOpacity="0.15" />
          <feDropShadow dx="1" dy="2" stdDeviation="3" floodColor="#0ED3CF" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* ═══════════════════════════════════════════
          MARK GROUP — scaled & centered
      ═══════════════════════════════════════════ */}
      <g transform={`translate(${markOffsetX}, 0) scale(${mark / vbW})`}>

        {/* Ambient chromatic atmospheres */}
        <ellipse cx="68" cy="22"  rx="34" ry="22" fill="#E85D3A" opacity="0.14" filter={`url(#${uid}-ambient)`} />
        <ellipse cx="50" cy="80"  rx="26" ry="20" fill="#A8C633" opacity="0.10" filter={`url(#${uid}-ambient)`} />
        <ellipse cx="42" cy="140" rx="32" ry="22" fill="#0ED3CF" opacity="0.14" filter={`url(#${uid}-ambient)`} />

        {/* Drop shadow layer */}
        <path
          d={ribbonD}
          fill={`url(#${uid}-grad)`}
          opacity="0.35"
          transform="translate(1.5, 3.5)"
          filter={`url(#${uid}-ambient)`}
        />

        {/* ── Main ribbon ── */}
        <path
          d={ribbonD}
          fill={`url(#${uid}-grad)`}
          filter={`url(#${uid}-shadow)`}
        />

        {/* Edge glow — slightly blurred copy at low opacity for chromatic bloom */}
        <path
          d={ribbonD}
          fill={`url(#${uid}-grad)`}
          opacity="0.28"
          filter={`url(#${uid}-edge-glow)`}
        />

        {/* ── Upper sheen ── */}
        <path
          d={sheenD}
          stroke={`url(#${uid}-sheen)`}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* ── Lower sheen ── */}
        <path
          d={sheenD2}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* ── Dark edge definition line (subtle, gives 3D form) ── */}
        <path
          d={outerEdge.trim() + " L 56 154"}
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
        />

        {/* ════════════════════════
            CORAL DOT ACCENT
        ════════════════════════ */}

        {/* Outer atmospheric halo */}
        <circle
          cx={dotCX}
          cy={dotCY}
          r={dotR * 4.5}
          fill="#E85D3A"
          opacity="0.18"
          filter={`url(#${uid}-dot-glow)`}
        />

        {/* Mid ring — dashed orbit feel */}
        <circle
          cx={dotCX}
          cy={dotCY}
          r={dotR * 2.2}
          stroke="#E85D3A"
          strokeWidth="0.7"
          strokeDasharray="2.2 2.8"
          opacity="0.35"
          fill="none"
        />

        {/* Solid dot */}
        <circle
          cx={dotCX}
          cy={dotCY}
          r={dotR}
          fill="#E85D3A"
        />

        {/* Specular highlight on dot */}
        <circle
          cx={dotCX - dotR * 0.28}
          cy={dotCY - dotR * 0.28}
          r={dotR * 0.4}
          fill="rgba(255,255,255,0.6)"
        />

      </g>

      {/* ═══════════════════════════════════════════
          WORDMARK
      ═══════════════════════════════════════════ */}
      {showText && (
        <g>
          {/* SAGE IDEAS */}
          <text
            x={totalW / 2}
            y={textY + fontSize}
            textAnchor="middle"
            fontFamily="'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="600"
            fontSize={fontSize}
            letterSpacing={letterSpacing}
            fill="#F4F2EF"
            style={{ userSelect: "none" }}
          >
            SAGE IDEAS
          </text>

          {/* AI-NATIVE STUDIO descriptor */}
          <text
            x={totalW / 2}
            y={textY + fontSize + subtitleSize * 2.0}
            textAnchor="middle"
            fontFamily="'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="400"
            fontSize={subtitleSize}
            letterSpacing="0.24em"
            fill="#6B6B7A"
            style={{ userSelect: "none" }}
          >
            AI‑NATIVE STUDIO
          </text>
        </g>
      )}
    </svg>
  )
}
