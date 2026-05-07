import { redirect, permanentRedirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// /portal/home was a duplicate dashboard — Phase 2A.5 consolidates it into /portal.
// Use Next.js permanent redirect (308) so search engines and bookmarks follow.
export default function PortalHomeRedirect(): never {
  // permanentRedirect is preferred over redirect() to issue a 308 status.
  permanentRedirect('/portal');
  // Fallback in case the runtime ever lacks permanentRedirect:
  redirect('/portal');
}
