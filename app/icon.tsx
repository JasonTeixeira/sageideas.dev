import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Branded "S" icon — cyan-on-near-black with subtle violet accent. Matches site palette.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#09090B',
          color: '#0ED3CF',
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: 6,
          border: '1.5px solid #2A2826',
          boxShadow: 'inset 0 0 0 0.5px rgba(124, 58, 237, 0.4)',
        }}
      >
        S
      </div>
    ),
    { ...size }
  )
}
