import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

export type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

const isProd = process.env.NODE_ENV === 'production';

function build(
  status: number,
  code: string,
  error: string,
  details?: unknown,
  extraHeaders?: HeadersInit,
): NextResponse {
  const body: ApiErrorBody = { error, code };
  // Only attach details outside production — they may contain stack traces or
  // raw Zod paths that we don't want to leak to end users.
  if (details !== undefined && !isProd) {
    body.details = details;
  }
  return NextResponse.json(body, { status, headers: extraHeaders });
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return build(400, 'bad_request', message, details);
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
  return build(401, 'unauthorized', message);
}

export function forbidden(message = 'Forbidden'): NextResponse {
  return build(403, 'forbidden', message);
}

export function notFound(message = 'Not found'): NextResponse {
  return build(404, 'not_found', message);
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return build(
    429,
    'too_many_requests',
    'Too many requests. Please try again shortly.',
    undefined,
    { 'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))) },
  );
}

export function serverError(message = 'Internal server error'): NextResponse {
  return build(500, 'server_error', message);
}

/** Wraps a ZodError as a 400 with structured `issues` (only in non-prod). */
export function fromZodError(error: ZodError): NextResponse {
  const issues = error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
  // Always return the first issue's message as the human-facing error so
  // forms can surface something useful even in production.
  const firstMessage = error.issues[0]?.message ?? 'Invalid request';
  return build(400, 'invalid_request', firstMessage, { issues });
}
