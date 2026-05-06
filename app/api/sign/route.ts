import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const usage = {
  ok: false,
  error: 'token_required',
  message:
    'Sign endpoint requires a per-document token. POST to /api/sign/[token] with JSON body { "name": "Signer Name" }.',
};

export async function GET() {
  return NextResponse.json(usage, { status: 405 });
}

export async function POST() {
  return NextResponse.json(usage, { status: 405 });
}
