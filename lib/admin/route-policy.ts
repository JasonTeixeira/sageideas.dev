export function isAdminPagePath(pathname: string): boolean {
  return pathname === '/admin'
    || pathname.startsWith('/admin/')
    || pathname === '/academy-admin'
    || pathname.startsWith('/academy-admin/')
}
