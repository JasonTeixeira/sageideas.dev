import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const SIZE = { width: 1200, height: 630 } as const
const ACCENT = '#3D6BFF'

type Kind = 'proof' | 'streak' | 'gain'
const KIND_META: Record<Kind, { glyph: string; eyebrow: string; tint: string }> = {
  proof: { glyph: '⬡', eyebrow: 'SAGE ACADEMY · PROOF OF WORK', tint: '#3D6BFF' },
  streak: { glyph: '🔥', eyebrow: 'SAGE ACADEMY · STREAK', tint: '#F5A623' },
  gain: { glyph: '↗', eyebrow: 'SAGE ACADEMY · LEARNING GAIN', tint: '#2DD4BF' },
}

function resolveKind(raw: string | null): Kind {
  const k = (raw ?? '').toLowerCase()
  return k === 'streak' || k === 'gain' ? k : 'proof'
}

/** Academy social cards: proof-of-work, streak, and normalized-gain (Hake's g). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const kind = resolveKind(searchParams.get('kind'))
  const meta = KIND_META[kind]
  const stat = (searchParams.get('stat') ?? '').slice(0, 24)
  const title = (searchParams.get('title') ?? 'A Sage Academy learner').slice(0, 64)
  const subtitle = (searchParams.get('subtitle') ?? 'Learn · build · ship — and prove it.').slice(0, 120)

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#0b0d0c',
          padding: '56px 72px',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -120,
            width: 560,
            height: 560,
            background: `radial-gradient(circle at center, ${meta.tint}30, transparent 65%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            backgroundImage: `radial-gradient(circle, ${ACCENT} 0.6px, transparent 0.6px)`,
            backgroundSize: '32px 32px',
            display: 'flex',
          }}
        />

        {/* wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
              <g transform="translate(0 -6)">
                <path
                  d="M20 44 A10 10 0 0 1 20 24 A13 13 0 0 1 45 21 A9 9 0 0 1 48 44 Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="4.5"
                  strokeLinejoin="round"
                />
                <circle cx="26" cy="54" r="3.5" fill="#fff" />
                <circle cx="36" cy="54" r="3.5" fill="#fff" />
                <circle cx="46" cy="54" r="3.5" fill="#fff" />
              </g>
            </svg>
          </div>
          <span style={{ color: '#FAFAFA', fontSize: 22, letterSpacing: '0.12em', fontWeight: 700 }}>
            SAGE ACADEMY
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            marginTop: 24,
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 16,
              color: meta.tint,
              letterSpacing: '0.2em',
              fontFamily: 'monospace',
              marginBottom: 18,
            }}
          >
            {meta.eyebrow}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 18 }}>
            <span style={{ fontSize: 96, display: 'flex' }}>{meta.glyph}</span>
            {stat ? (
              <span
                style={{
                  display: 'flex',
                  fontSize: 110,
                  color: '#f2efe9',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                }}
              >
                {stat}
              </span>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 52,
              color: '#F4F2EF',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              fontFamily: 'Georgia, serif',
              marginBottom: 16,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#A8A29E', maxWidth: 900 }}>{subtitle}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#78716C',
            fontSize: 18,
            fontFamily: 'monospace',
            paddingTop: 24,
            borderTop: '1px solid #2A2826',
            position: 'relative',
          }}
        >
          <span>sageideas.dev/academy</span>
          <span style={{ color: meta.tint }}>learn · build · ship</span>
        </div>
      </div>
    ),
    SIZE,
  )
}
