import type { ReactNode } from 'react'

export const COLORS = {
  bg: '#09090B',
  surface: '#1A1917',
  border: '#2A2826',
  borderStrong: '#3D3A37',
  text: '#FAFAFA',
  textMuted: '#A8A29E',
  textDim: '#78716C',
  cyan: '#0ED3CF',
  cyanDark: '#0AA8A5',
  violet: '#E85D3A',
  amber: '#F59E0B',
  emerald: '#10B981',
  rose: '#F43F5E',
} as const

interface BoxProps {
  x: number
  y: number
  w: number
  h: number
  label: string
  sublabel?: string
  accent?: string
  fontSize?: number
}

export function Box({ x, y, w, h, label, sublabel, accent = COLORS.cyan, fontSize = 14 }: BoxProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill={COLORS.surface}
        stroke={COLORS.border}
        strokeWidth={1.5}
      />
      <rect
        x={x}
        y={y}
        width={4}
        height={h}
        rx={2}
        fill={accent}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + (sublabel ? -4 : 5)}
        textAnchor="middle"
        fill={COLORS.text}
        fontSize={fontSize}
        fontWeight={600}
        fontFamily="ui-sans-serif, system-ui"
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 16}
          textAnchor="middle"
          fill={COLORS.textDim}
          fontSize={11}
          fontFamily="ui-monospace, monospace"
        >
          {sublabel}
        </text>
      )}
    </g>
  )
}

interface ArrowProps {
  x1: number
  y1: number
  x2: number
  y2: number
  color?: string
  dashed?: boolean
  label?: string
}

export function Arrow({ x1, y1, x2, y2, color = COLORS.cyan, dashed, label }: ArrowProps) {
  const id = `arrow-${color.replace('#', '')}-${dashed ? 'd' : 's'}`
  const dx = x2 - x1
  const dy = y2 - y1
  const mx = x1 + dx / 2
  const my = y1 + dy / 2
  return (
    <g>
      <defs>
        <marker
          id={id}
          markerWidth={10}
          markerHeight={10}
          refX={8}
          refY={5}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 Z" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '4 4' : undefined}
        markerEnd={`url(#${id})`}
        opacity={0.85}
      />
      {label && (
        <text
          x={mx}
          y={my - 6}
          textAnchor="middle"
          fill={COLORS.textMuted}
          fontSize={10}
          fontFamily="ui-monospace, monospace"
          letterSpacing={0.5}
        >
          {label}
        </text>
      )}
    </g>
  )
}

interface DiagramFrameProps {
  title: string
  desc: string
  viewBox?: string
  children: ReactNode
}

export function DiagramFrame({ title, desc, viewBox = '0 0 1200 600', children }: DiagramFrameProps) {
  return (
    <svg
      role="img"
      aria-labelledby="diagram-title diagram-desc"
      viewBox={viewBox}
      className="w-full h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title id="diagram-title">{title}</title>
      <desc id="diagram-desc">{desc}</desc>
      {children}
    </svg>
  )
}

interface LabelProps {
  x: number
  y: number
  text: string
  color?: string
  size?: number
  anchor?: 'start' | 'middle' | 'end'
  mono?: boolean
  weight?: number
}

export function Label({ x, y, text, color = COLORS.textMuted, size = 11, anchor = 'middle', mono = true, weight = 500 }: LabelProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      fontFamily={mono ? 'ui-monospace, monospace' : 'ui-sans-serif, system-ui'}
      letterSpacing={mono ? 0.5 : 0}
    >
      {text}
    </text>
  )
}
