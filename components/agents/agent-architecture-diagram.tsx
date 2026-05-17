'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCw } from 'lucide-react'

export type ArchNode = {
  id: string
  label: string
  sub?: string
  /** Column index, 0-based, left → right */
  col: number
  /** Row index within the column, 0-based, top → bottom */
  row: number
  variant?: 'input' | 'core' | 'tool' | 'output' | 'guard'
}

export type ArchConnection = {
  from: string
  to: string
  /** Optional label shown midway */
  label?: string
  /** Dashed line for async/optional flows */
  dashed?: boolean
}

type Props = {
  title?: string
  subtitle?: string
  nodes: ArchNode[]
  connections: ArchConnection[]
  accent?: string
}

const VARIANT_COLOR: Record<NonNullable<ArchNode['variant']>, string> = {
  input: '#A78BFA',
  core: '#22D3EE',
  tool: '#F59E0B',
  output: '#34D399',
  guard: '#F472B6',
}

const COL_WIDTH = 200
const ROW_HEIGHT = 110
const NODE_W = 168
const NODE_H = 76
const PAD_X = 32
const PAD_Y = 40

function nodeCenter(node: ArchNode) {
  return {
    cx: PAD_X + node.col * COL_WIDTH + NODE_W / 2,
    cy: PAD_Y + node.row * ROW_HEIGHT + NODE_H / 2,
  }
}

export function AgentArchitectureDiagram({
  title,
  subtitle,
  nodes,
  connections,
  accent = '#22D3EE',
}: Props) {
  const [replayKey, setReplayKey] = useState(0)
  const cols = Math.max(...nodes.map((n) => n.col)) + 1
  const rows = Math.max(...nodes.map((n) => n.row)) + 1
  const width = PAD_X * 2 + cols * COL_WIDTH - (COL_WIDTH - NODE_W)
  const height = PAD_Y * 2 + rows * ROW_HEIGHT - (ROW_HEIGHT - NODE_H)

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0B0B0F] to-[#0F1014] p-6 sm:p-8 overflow-x-auto">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          {title && (
            <h3 className="text-base font-mono uppercase tracking-widest text-[#A8A29E]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-[#78716C] max-w-2xl">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setReplayKey((k) => k + 1)}
          className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-[#A8A29E] hover:text-[#FAFAFA] border border-white/10 hover:border-white/30 rounded-full px-3 py-1.5 transition-colors"
          aria-label="Replay diagram animation"
        >
          <RotateCw className="w-3 h-3" />
          Replay
        </button>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="min-w-[640px]"
        role="img"
        aria-label={title ?? 'Agent architecture diagram'}
      >
        <defs>
          <marker
            id={`arrow-${accent.replace('#', '')}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" fill={accent} />
          </marker>
          <linearGradient id="nodeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1A1917" />
            <stop offset="100%" stopColor="#0B0B0F" />
          </linearGradient>
        </defs>

        {/* Connections */}
        {connections.map((conn, i) => {
          const from = nodeById.get(conn.from)
          const to = nodeById.get(conn.to)
          if (!from || !to) return null
          const a = nodeCenter(from)
          const b = nodeCenter(to)
          // Anchor on right edge of `from` and left edge of `to` if same row,
          // otherwise route via curve.
          const fromRight = {
            x: PAD_X + from.col * COL_WIDTH + NODE_W,
            y: a.cy,
          }
          const toLeft = { x: PAD_X + to.col * COL_WIDTH, y: b.cy }
          const midX = (fromRight.x + toLeft.x) / 2
          const path = `M ${fromRight.x} ${fromRight.y} C ${midX} ${fromRight.y}, ${midX} ${toLeft.y}, ${toLeft.x} ${toLeft.y}`
          return (
            <g key={`${conn.from}-${conn.to}-${i}-${replayKey}`}>
              <motion.path
                d={path}
                fill="none"
                stroke={accent}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                strokeDasharray={conn.dashed ? '4 4' : undefined}
                markerEnd={`url(#arrow-${accent.replace('#', '')})`}
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: i * 0.12 }}
              />
              {conn.label && (
                <text
                  x={midX}
                  y={(fromRight.y + toLeft.y) / 2 - 6}
                  fill="#78716C"
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                  textAnchor="middle"
                >
                  {conn.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const x = PAD_X + node.col * COL_WIDTH
          const y = PAD_Y + node.row * ROW_HEIGHT
          const color = VARIANT_COLOR[node.variant ?? 'core']
          return (
            <motion.g
              key={`${node.id}-${replayKey}`}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                ry={10}
                fill="url(#nodeFill)"
                stroke={color}
                strokeOpacity={0.55}
                strokeWidth={1}
              />
              <rect
                x={x}
                y={y}
                width={4}
                height={NODE_H}
                rx={2}
                ry={2}
                fill={color}
                opacity={0.85}
              />
              <text
                x={x + 16}
                y={y + 28}
                fill="#FAFAFA"
                fontSize={13}
                fontWeight={600}
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {node.label}
              </text>
              {node.sub && (
                <text
                  x={x + 16}
                  y={y + 48}
                  fill="#78716C"
                  fontSize={10.5}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                >
                  {node.sub}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-mono uppercase tracking-widest text-[#78716C]">
        {(['input', 'core', 'tool', 'output', 'guard'] as const).map((v) => {
          if (!nodes.some((n) => (n.variant ?? 'core') === v)) return null
          return (
            <span key={v} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-sm"
                style={{ backgroundColor: VARIANT_COLOR[v] }}
              />
              {v}
            </span>
          )
        })}
      </div>
    </div>
  )
}
