import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Apple touch icon — branded "S" mark on signature dark with cyan/violet glow.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at 30% 25%, rgba(6,182,212,0.18), transparent 55%), radial-gradient(circle at 75% 80%, rgba(124,58,237,0.18), transparent 60%), #09090B',
          color: '#FAFAFA',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 110,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#0ED3CF',
              lineHeight: 1,
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.32em',
              color: '#A8A29E',
              fontFamily: 'ui-monospace, "SF Mono", monospace',
            }}
          >
            STUDIO
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
