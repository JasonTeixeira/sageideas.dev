import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** Branded S-mark favicon — gradient matching the real logo colors */
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
          borderRadius: 6,
        }}
      >
        {/* Gradient S matching the logo ribbon flow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            background: 'linear-gradient(180deg, #E85D3A 0%, #C7236E 35%, #A8C633 65%, #0ED3CF 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size }
  )
}
