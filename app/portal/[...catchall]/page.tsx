import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PortalCatchAll() {
  // Touch headers() before throwing so Next treats the page as dynamic and
  // commits the 404 status from notFound() instead of the cached 200 a
  // statically-traced render would emit.
  await headers();
  notFound();
}
