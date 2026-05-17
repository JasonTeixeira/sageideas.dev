import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

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
          border: '1.5px solid #2A2826',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 24,
            height: 24,
            background: 'linear-gradient(135deg, #E85D3A, #A8C633, #0ED3CF)',
            borderRadius: 5,
            color: '#09090B',
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size }
  )
}
