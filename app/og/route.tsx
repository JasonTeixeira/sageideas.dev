import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const SIZE = { width: 1200, height: 630 } as const

// Allow-listed brand accents — never trust raw user input as a CSS color.
const ACCENT_MAP: Record<string, { hex: string; rgb: string }> = {
  teal:    { hex: '#3D5AFE', rgb: '61,90,254' },
  cyan:    { hex: '#3D5AFE', rgb: '61,90,254' },
  coral:   { hex: '#E85D3A', rgb: '232,93,58' },
  lime:    { hex: '#A8C633', rgb: '168,198,51' },
  magenta: { hex: '#C7236E', rgb: '199,35,110' },
}

function resolveAccent(raw: string | null) {
  const key = (raw ?? '').toLowerCase()
  return ACCENT_MAP[key] ?? ACCENT_MAP.teal
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get('title') ?? 'Sage Ideas').slice(0, 80)
  const subtitle = (
    searchParams.get('subtitle') ?? 'AI-Native Studio for B2B Operators'
  ).slice(0, 120)
  const eyebrow = (searchParams.get('eyebrow') ?? 'SAGE IDEAS · STUDIO').slice(0, 60)
  const accent = resolveAccent(searchParams.get('accent'))

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#09090B',
          padding: '56px 72px',
          position: 'relative',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Ambient brand gradient — blue top-left */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            left: -100,
            width: 500,
            height: 500,
            background:
              `radial-gradient(circle at center, rgba(${accent.rgb},0.18), transparent 65%)`,
            display: 'flex',
          }}
        />

        {/* Ambient brand gradient — coral bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -180,
            right: -100,
            width: 450,
            height: 450,
            background:
              'radial-gradient(circle at center, rgba(232,93,58,0.08), transparent 65%)',
            display: 'flex',
          }}
        />

        {/* Dot grid texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              `radial-gradient(circle, ${accent.hex} 0.6px, transparent 0.6px)`,
            backgroundSize: '32px 32px',
            display: 'flex',
          }}
        />

        {/* Top-left wordmark with logomark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            position: 'relative',
          }}
        >
          {/* Logomark — multicolor S indicator */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: `linear-gradient(135deg, #E85D3A, ${accent.hex})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#09090B',
              fontWeight: 800,
              fontSize: 24,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
            }}
          >
            S
          </div>
          <span
            style={{
              color: '#FAFAFA',
              fontSize: 22,
              letterSpacing: '0.12em',
              fontWeight: 700,
            }}
          >
            SAGE IDEAS
          </span>
        </div>

        {/* Main copy block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            marginTop: 28,
            position: 'relative',
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: 'flex',
              fontSize: 16,
              color: accent.hex,
              letterSpacing: '0.2em',
              fontFamily: 'monospace',
              marginBottom: 20,
            }}
          >
            {eyebrow}
          </div>

          {/* Title — editorial serif feel */}
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              color: '#F4F2EF',
              fontWeight: 400,
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              fontFamily: 'Georgia, serif',
              marginBottom: 24,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: '#A8A29E',
              fontWeight: 400,
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Bottom strip — brand bar */}
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
          <span>sageideas.dev</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Brand color dots — logo palette */}
            <div style={{ display: 'flex', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#3D5AFE',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#E85D3A',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#A8C633',
                  display: 'flex',
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#C7236E',
                  display: 'flex',
                }}
              />
            </div>
            <span style={{ color: accent.hex }}>solo studio · agency rigor</span>
          </div>
        </div>
      </div>
    ),
    SIZE,
  )
}
