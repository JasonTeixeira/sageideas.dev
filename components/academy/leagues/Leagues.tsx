import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { LeagueStandings, StandingRow } from '@/lib/academy/leagues'
import { LEAGUE_TIERS, relegationStake } from '@/lib/academy/leagues-logic'
import { XP_REWARDS } from '@/lib/academy/gamification-logic'
import { LeagueCountdown } from './LeagueCountdown'
import { CopyInvite } from './CopyInvite'
import styles from './leagues.module.css'

/**
 * Avatar monogram from a real display name ("Maya R." → "MR"); falls back to the
 * last two letters. Never invents identity — derives only from the real handle.
 */
function initials(handle: string): string {
  const parts = handle.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const letters = handle.replace(/[^a-zA-Z0-9]/g, '')
  return (letters.slice(0, 2) || handle.slice(-2)).toUpperCase()
}

/** Whole days remaining until the (real) reset instant, clamped at ≥ 0. */
function daysLeft(resetAtIso: string): number {
  const ms = new Date(resetAtIso).getTime() - Date.now()
  if (!Number.isFinite(ms)) return 0
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

const DAY_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'] as const
function daysPhrase(n: number): string {
  if (n <= 0) return 'Resets today.'
  const word = n <= 7 ? DAY_WORDS[n] : String(n)
  const cap = word.charAt(0).toUpperCase() + word.slice(1)
  return `${cap} ${n === 1 ? 'day' : 'days'} left.`
}

/**
 * The learner's real "this week" secondary detail. Real league data carries only
 * weeklyXp and movement per member — there is NO per-member activity breakdown in
 * the store, so we surface the real, verifiable movement fate rather than invent
 * activity counts. For the current user we show their real relegation stake.
 */
function weekDetail(row: StandingRow, total: number, tier: number, relegateZone: number): string {
  if (row.movement === 'promote') return 'in the promotion zone'
  if (row.movement === 'relegate') return 'in the relegation zone'
  if (row.isYou) {
    const stake = relegationStake({ rank: row.rank, weeklyXp: row.weeklyXp }, [], total, tier, relegateZone)
    if (stake.kind === 'safe') return 'holding — safe this week'
    if (stake.kind === 'relegating') return 'holding — under pressure'
  }
  return 'holding this week'
}

export function Leagues({
  standings,
  nextRank: _nextRank,
  inviteLink,
}: {
  standings: LeagueStandings
  nextRank?: { gapXp: number } | null
  inviteLink?: string | null
}) {
  const { tier, tierName, color, total, rows, you, promoteZone, relegateZone, topTier, bottomTier, resetAt } =
    standings
  const rootStyle = { ['--tier']: color } as CSSProperties

  const stake = relegationStake(you, rows, total, tier, relegateZone)
  const lowerTier = bottomTier ? null : LEAGUE_TIERS[tier - 1]
  // The drop-line splits the board: rows ranked worse than (total - relegateZone)
  // relegate. Only meaningful when relegation can actually bite (stake !== none).
  const dropLineRank = total - relegateZone
  const canRelegate = stake.kind !== 'none' && !bottomTier
  const safeRows = canRelegate ? rows.filter((r) => r.rank <= dropLineRank) : rows
  const belowRows = canRelegate ? rows.filter((r) => r.rank > dropLineRank) : []

  // Honest cohort framing: no invented global member count. `total` is the real
  // roster size. A solo/near-solo cohort reads as "forming", never as competitors.
  const solo = total <= 1
  const cohortSize = total

  // Status card: real rank-margin to the relegation line (or promotion framing at
  // the top tier where relegation can't apply).
  const statusHeadline = (() => {
    if (stake.kind === 'safe') return { sign: '+', n: stake.marginXp, tail: 'above the line' }
    if (stake.kind === 'relegating') return { sign: '−', n: stake.marginXp, tail: 'below the line' }
    // No relegation pressure (bottom tier, or cohort too thin to demote anyone).
    return null
  })()

  return (
    <div className={styles.page} style={rootStyle}>
      <main className={styles.main}>
        {/* Hero: real tier + real days-left from the reset instant. No sub-tier
            numbering ("II") — the real model has none. */}
        <header className={styles.hero}>
          <div className={styles.heroText}>
            <h1 className={styles.title}>
              {tierName}. {daysPhrase(daysLeft(resetAt))}
            </h1>
            <p className={styles.sub}>
              XP comes from finished lessons, labs, quizzes and reviews — not logins.{' '}
              {!topTier ? `Top ${promoteZone} promote; ` : ''}
              {canRelegate ? 'below the line relegates. ' : 'hold your rank. '}
              {solo ? (
                <span className={styles.subEm}>Your cohort is forming — you&rsquo;re the first in {tierName} this week.</span>
              ) : (
                <span className={styles.subEm}>
                  Your cohort of {cohortSize} {cohortSize === 1 ? 'learner' : 'learners'} is the table below.
                </span>
              )}
            </p>
            <div className={styles.heroMeta}>
              <LeagueCountdown resetAt={resetAt} />
            </div>
          </div>

          {statusHeadline ? (
            <div className={styles.status}>
              <div className={styles.statusLabel}>{stake.kind === 'safe' ? 'XP margin to stay safe' : 'XP to escape the drop'}</div>
              <div className={styles.statusValue}>
                you&rsquo;re {statusHeadline.sign}
                {statusHeadline.n} <span className={styles.statusTail}>{statusHeadline.tail}</span>
              </div>
            </div>
          ) : (
            <div className={styles.status} data-neutral="true">
              <div className={styles.statusLabel}>Your rank</div>
              <div className={styles.statusValue}>
                #{you.rank} <span className={styles.statusTail}>of {total || 1}</span>
              </div>
            </div>
          )}
        </header>

        {/* Leaderboard — REAL standings only. Rank, member (initials + handle +
            "promotes" tag), the real movement detail, and the real weekly XP.
            The current-user row carries the accent rail + "you · safe/at-risk". */}
        <div className={styles.board}>
          <div className={styles.boardHead}>
            <span>#</span>
            <span>Member</span>
            <span>This week</span>
            <span className={styles.headXp}>XP</span>
          </div>

          {solo ? (
            <div className={styles.forming}>
              <p className={styles.formingLine}>
                No one else has earned XP in {tierName} yet this week. Finish a lesson or lab and you&rsquo;ll head the
                table — invite a teammate below and grow the cohort.
              </p>
            </div>
          ) : null}

          {safeRows.map((r) => (
            <div key={r.rank} className={`${styles.row} ${r.isYou ? styles.rowYou : ''}`}>
              <span className={styles.rank}>{String(r.rank).padStart(2, '0')}</span>
              <div className={styles.member}>
                <span className={`${styles.avatar} ${r.isYou ? styles.avatarYou : ''}`}>{initials(r.handle)}</span>
                <span className={`${styles.handle} ${r.isYou ? styles.handleYou : ''}`}>{r.isYou ? 'you' : r.handle}</span>
                {r.movement === 'promote' ? <span className={styles.tagPromote}>↑ promotes</span> : null}
                {r.isYou && stake.kind === 'safe' ? (
                  <span className={styles.tagYou}>you · +{stake.marginXp} safe</span>
                ) : r.isYou && stake.kind === 'relegating' ? (
                  <span className={styles.tagYouRisk}>you · at risk</span>
                ) : r.isYou ? (
                  <span className={styles.tagYou}>you</span>
                ) : null}
              </div>
              <span className={styles.detail}>{weekDetail(r, total, tier, relegateZone)}</span>
              <span className={`${styles.xp} ${r.isYou ? styles.xpYou : ''}`}>{r.weeklyXp}</span>
            </div>
          ))}

          {canRelegate && belowRows.length > 0 ? (
            <div className={styles.dropLine} role="separator" aria-label={`Drop line — below relegates to ${lowerTier?.name ?? ''}`}>
              <span className={styles.dropRule} aria-hidden="true" />
              <span className={styles.dropLabel}>DROP LINE — below relegated to {lowerTier?.name ?? 'the lower tier'}</span>
              <span className={styles.dropRule} aria-hidden="true" />
            </div>
          ) : null}

          {belowRows.map((r) => (
            <div key={r.rank} className={`${styles.row} ${styles.rowBelow} ${r.isYou ? styles.rowYou : ''}`}>
              <span className={styles.rank}>{String(r.rank).padStart(2, '0')}</span>
              <div className={styles.member}>
                <span className={`${styles.avatar} ${r.isYou ? styles.avatarYou : ''}`}>{initials(r.handle)}</span>
                <span className={`${styles.handle} ${r.isYou ? styles.handleYou : ''}`}>{r.isYou ? 'you' : r.handle}</span>
                {r.isYou ? <span className={styles.tagYouRisk}>you · at risk</span> : null}
              </div>
              <span className={styles.detail}>{weekDetail(r, total, tier, relegateZone)}</span>
              <span className={styles.xp}>{r.weeklyXp}</span>
            </div>
          ))}
        </div>

        {/* HOW XP IS EARNED — the REAL academy XP weights (lesson/lab/quiz/review).
            The mock's proof/gate/recall/repair model is a different product's
            economy and does not exist here. Logins earn nothing. */}
        <div className={styles.legend}>
          <span className={styles.legendLabel}>How XP is earned</span>
          <span className={styles.legendItem}>
            lesson finished <span className={styles.legendGreen}>+{XP_REWARDS.lesson}</span>
          </span>
          <span className={styles.legendItem}>
            lab completed <span className={styles.legendGreen}>+{XP_REWARDS.lab}</span>
          </span>
          <span className={styles.legendItem}>
            quiz passed <span className={styles.legendGold}>+{XP_REWARDS.quiz}</span>
          </span>
          <span className={styles.legendItem}>
            review done <span className={styles.legendAccent}>+{XP_REWARDS.review}</span>
          </span>
          <span className={styles.legendMuted}>logins earn nothing.</span>
        </div>

        {/* Cohort invite — copy for the design, but a REAL working referral link
            (?ref=CODE, the same format the referral page uses). No fabricated
            join code. Omits the link chip entirely if the real code was unavailable. */}
        <div className={styles.invite}>
          <div className={styles.inviteBody}>
            <div className={styles.inviteKicker}>
              {solo ? 'Your cohort is forming' : `Your cohort of ${cohortSize}`}
            </div>
            <div className={styles.inviteTitle}>Cohorts that ship together, promote together.</div>
            <div className={styles.inviteCopy}>
              Bring a teammate — you both bank bonus XP and a streak freeze when they finish their first lesson. Not when
              they sign up; when they ship.
            </div>
          </div>
          {inviteLink ? (
            <div className={styles.inviteActions}>
              <span className={styles.inviteLink}>{inviteLink.replace(/^https?:\/\//, '')}</span>
              <CopyInvite link={inviteLink} />
            </div>
          ) : (
            <div className={styles.inviteActions}>
              <Link className={styles.inviteFallback} href="/academy/refer">
                Get your invite link
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
