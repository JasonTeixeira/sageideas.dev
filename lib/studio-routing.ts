/** Exact list aliases only: signed client detail/token links remain intact. */
const OWNER_DESTINATIONS: Record<string, string> = {
  '/portal': '/admin',
  '/portal/home': '/admin',
  '/portal/projects': '/admin/pipeline',
  '/portal/engagements': '/admin/pipeline',
  '/portal/calendar': '/admin/calendar',
  '/portal/invoices': '/admin/invoices',
  '/portal/documents': '/admin/documents',
  '/portal/proposals': '/admin/proposals',
};

export function getOwnerDestination(pathname: string): string | null {
  return Object.hasOwn(OWNER_DESTINATIONS, pathname) ? OWNER_DESTINATIONS[pathname] : null;
}
