import { NextResponse } from 'next/server'
import {
  HEALTH_TIMEOUT_MS,
  checkPublicReadiness,
  createRequestId,
  publicHealthErrorCode,
} from '@/lib/observability/health'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Public readiness without provider messages, credentials, rows, or internal URLs. */
export async function GET() {
  const requestId = createRequestId()
  const db = await checkPublicReadiness()
  const ok = db.ok
  const body = {
    status: ok ? 'healthy' : 'unavailable',
    ok,
    request_id: requestId,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    environment: process.env.VERCEL_ENV ?? 'local',
    region: process.env.VERCEL_REGION ?? null,
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        status: ok ? 'ok' : 'fail',
        latency_ms: db.latencyMs,
        error_code: db.errorCode ? publicHealthErrorCode(db.errorCode) : null,
        timeout_ms: HEALTH_TIMEOUT_MS,
      },
    },
  }
  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Request-Id': requestId,
    },
  })
}
