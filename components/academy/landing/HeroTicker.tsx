/**
 * Truthful ticker from the Sage Home design. It is intentionally server-rendered
 * so a cosmetic rotation never competes with initial learning interactions.
 * Honesty delta: the mock's fictional user events ("arjun_r passed gate…")
 * are replaced with true statements about the system — no invented people
 * or activity until the real event feed is wired post-DB-restore.
 */

import { getT } from '@/lib/i18n/t'

const ITEMS = [
  'every lab starts failing — fixing it for real is the only way through',
  'certificates are public records, verifiable at sageideas.dev/verify',
  'spaced recall fires at 1 / 3 / 7 / 30 days — a miss resets the card',
  'every lesson makes the failure a location, not a feeling',
  'scores are capped by your weakest proof — the repair lifts the cap',
  'decision memos and passing checks — pick any claim, follow the artifact',
]

export async function HeroTicker() {
  const t = await getT()

  return (
    <span
      style={{
        fontFamily: 'var(--font-mono), monospace',
        fontSize: 11.5,
        color: '#9C9CA6',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {t(ITEMS[0])}
    </span>
  )
}
