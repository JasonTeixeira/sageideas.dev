import { NextResponse } from 'next/server'
import { checkPublicReadiness, createRequestId } from '@/lib/observability/health'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const requestId = createRequestId()
  const readiness = await checkPublicReadiness()
  const body = { ok: readiness.ok, ts: new Date().toISOString(), request_id: requestId }
  const headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Request-Id': requestId }
  if (!readiness.ok) {
    return NextResponse.json(body, { status: 503, headers })
  }
  return NextResponse.json(
    body,
    { status: 200, headers },
  )
}
