import { NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-guard'
import { supabaseAdmin } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  const guard = await requireAdminApi()
  if (guard instanceof NextResponse) return guard

  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('academy_waitlist')
    .select('email, ref_code, referred_by, created_at')
    .order('created_at', { ascending: true })
    .limit(10000)

  if (error) {
    return NextResponse.json({ error: 'export_failed' }, { status: 500 })
  }

  const header = ['email', 'signed_up_at', 'ref_code', 'referred_by']
  const lines = [header.join(',')]
  for (const r of data ?? []) {
    lines.push([r.email, r.created_at, r.ref_code, r.referred_by].map(csvCell).join(','))
  }
  const csv = lines.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="academy-waitlist.csv"',
    },
  })
}
