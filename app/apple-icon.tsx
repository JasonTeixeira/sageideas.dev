import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

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
            'radial-gradient(circle at 30% 25%, rgba(14,211,207,0.15), transparent 55%), radial-gradient(circle at 75% 80%, rgba(232,93,58,0.12), transparent 60%), #09090B',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 100,
              height: 100,
              background: 'linear-gradient(135deg, #E85D3A, #A8C633, #0ED3CF)',
              borderRadius: 22,
              color: '#09090B',
              fontSize: 72,
              fontWeight: 800,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              lineHeight: 1,
            }}
          >
            S
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.28em',
              color: '#A8A29E',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            SAGE IDEAS
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
