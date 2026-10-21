import { ImageResponse } from 'next/og'

export const alt = 'Sage Academy pricing — one membership, every course, a portfolio at the end'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0B0B0E',
          backgroundImage: 'radial-gradient(90% 60% at 50% -10%, rgba(143,160,255,0.14) 0%, rgba(11,11,14,0) 60%)',
          padding: '72px 84px',
          color: '#F2EFE9',
        }}
      >
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 6, color: '#8FA0FF', textTransform: 'uppercase' }}>
          Sage Academy · Pricing
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, letterSpacing: -2, lineHeight: 1.08, maxWidth: 1000 }}>
            You’re not buying hours of video. You’re buying a body of work.
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#9C9CA6' }}>$20/mo · $200/yr · cancel anytime</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '2px solid rgba(143,160,255,0.4)',
              borderRadius: 999,
              padding: '10px 26px',
              fontSize: 23,
              color: '#C7CFFF',
            }}
          >
            <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 999, background: '#18B663' }} />
            every plan includes everything
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#6B6B76' }}>sageideas.dev</div>
        </div>
      </div>
    ),
    size,
  )
}
