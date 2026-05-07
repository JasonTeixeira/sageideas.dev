// Alias of `/api/stripe/webhook` under the spec'd `/api/webhooks/stripe`
// path. Next.js requires `runtime` / `dynamic` to be statically declared
// per route file rather than re-exported, so they're inlined here and
// only the `POST` handler is delegated.
import { POST as canonical } from '@/app/api/stripe/webhook/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = canonical;
