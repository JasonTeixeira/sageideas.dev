/**
 * "Why not a bootcamp or a cert?" — an honest three-way comparison that makes
 * the proof-first position concrete. Sage is the highlighted column. Every
 * claim is defensible (no invented competitor numbers — ranges, framed as
 * "typical"). Horizontally scrollable on narrow screens.
 */

import { getT } from '@/lib/i18n/t'

const INK = '#F2EFE9'
const LINE = '#1E1E24'
const GREEN = '#18B663'
const DIM = '#9598A2'

const mono = { fontFamily: 'var(--font-mono), monospace' } as const
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' } as const

type Row = { label: string; sage: string; bootcamp: string; cert: string; sageWin?: boolean }

const ROWS: Row[] = [
  { label: 'Price', sage: '$25 / month', bootcamp: '$10k–$20k up front', cert: '$15–$40 / month', sageWin: true },
  { label: 'What you walk away with', sage: 'Proof a reviewer can run', bootcamp: 'A certificate', cert: 'A completion badge', sageWin: true },
  { label: 'How the work is checked', sage: 'By code — pass or fail', bootcamp: 'Instructor judgement', cert: 'Auto-quiz, or nothing', sageWin: true },
  { label: 'Labs that fail on purpose', sage: 'Every lesson', bootcamp: 'Sometimes', cert: 'Rarely', sageWin: true },
  { label: 'Pace', sage: 'Yours — cancel anytime', bootcamp: '12–24 weeks, full-time', cert: 'Self-paced' },
  { label: 'The promise', sage: 'Verifiable skill', bootcamp: 'A job (fine print)', cert: 'Hours of video', sageWin: true },
]

export async function CompareTable() {
  const t = await getT()

  return (
    <section id="compare" style={{ borderTop: `1px solid ${LINE}`, background: '#0D0D11' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px, 8vw, 100px) clamp(20px, 4vw, 48px)' }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ ...mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#8FA0FF' }}>{t('The honest comparison')}</div>
          <h2 style={{ ...serif, margin: '14px 0 0', fontWeight: 600, fontSize: 'clamp(30px, 3.6vw, 48px)', lineHeight: 1.04, letterSpacing: '-0.025em', textWrap: 'balance' }}>
            {t('Not a bootcamp. Not another')} <em style={{ fontStyle: 'italic', color: '#8FA0FF' }}>{t('certificate.')}</em>
          </h2>
          <p style={{ margin: '18px 0 0', color: '#9C9CA6', fontSize: 16.5, maxWidth: '58ch', textWrap: 'pretty' }}>
            {t('The industry sells you a price tag or a piece of paper. We sell the one thing a hiring manager can actually check.')}
          </p>
        </div>

        <div aria-label={t('Course comparison table')} tabIndex={0} style={{ marginTop: 40, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 640, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: 'left', padding: '0 18px 16px 0' }}>
                  <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>{t('Comparison criteria')}</span>
                </th>
                <th
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '16px 20px',
                    background: 'rgba(61,90,254,0.08)',
                    border: '1px solid rgba(61,90,254,0.4)',
                    borderBottom: 'none',
                    borderTopLeftRadius: 14,
                    borderTopRightRadius: 14,
                  }}
                >
                  <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: INK }}>Sage Academy</div>
                  <div style={{ ...mono, fontSize: 10.5, color: '#8FA0FF', marginTop: 2 }}>{t('proof, not paper')}</div>
                </th>
                <th scope="col" style={{ textAlign: 'left', padding: '16px 20px' }}>
                  <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: DIM }}>{t('Bootcamp')}</div>
                  <div style={{ ...mono, fontSize: 10.5, color: DIM, marginTop: 2 }}>{t('the big bet')}</div>
                </th>
                <th scope="col" style={{ textAlign: 'left', padding: '16px 20px' }}>
                  <div style={{ ...serif, fontSize: 18, fontWeight: 600, color: DIM }}>{t('Cert / video library')}</div>
                  <div style={{ ...mono, fontSize: 10.5, color: DIM, marginTop: 2 }}>{t('the badge')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => {
                const last = i === ROWS.length - 1
                return (
                  <tr key={r.label}>
                    <th scope="row" style={{ padding: '16px 18px 16px 0', verticalAlign: 'top', textAlign: 'left', fontSize: 13.5, fontWeight: 500, color: DIM, whiteSpace: 'nowrap' }}>{t(r.label)}</th>
                    <td
                      style={{
                        padding: '16px 20px',
                        background: 'rgba(61,90,254,0.06)',
                        borderLeft: '1px solid rgba(61,90,254,0.4)',
                        borderRight: '1px solid rgba(61,90,254,0.4)',
                        borderBottom: last ? '1px solid rgba(61,90,254,0.4)' : `1px solid ${LINE}`,
                        borderBottomLeftRadius: last ? 14 : 0,
                        borderBottomRightRadius: last ? 14 : 0,
                        fontSize: 14.5,
                        color: INK,
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8 }}>
                        {r.sageWin ? <span style={{ color: GREEN }}>✓</span> : null}
                        {t(r.sage)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, fontSize: 14, color: DIM }}>{t(r.bootcamp)}</td>
                    <td style={{ padding: '16px 20px', borderBottom: `1px solid ${LINE}`, fontSize: 14, color: DIM }}>{t(r.cert)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
