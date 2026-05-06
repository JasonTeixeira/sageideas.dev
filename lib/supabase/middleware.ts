import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PATHS = new Set(['/login', '/signup']);
const PUBLIC_PREFIXES = [
  '/auth',
  '/_next',
  '/api/portal/health',
  '/api/portal/webhooks',
  '/api/og',
  '/og',
  '/feed.xml',
  '/sitemap',
  '/robots',
  '/favicon',
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isPortalChrome(pathname: string) {
  return (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/pending-approval' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/signup/') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/admin')
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session cookie if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Expose the request pathname to server components / layouts so that
  // auth-gated server code can build a `?next=` redirect target.
  response.headers.set('x-pathname', pathname + (search || ''));
  request.headers.set('x-pathname', pathname + (search || ''));

  // Tag portal/auth routes so the marketing chrome stays out of their way.
  if (isPortalChrome(pathname)) {
    response.headers.set('x-portal', '1');
  }

  // Already-authenticated users hitting /login or /signup → bounce them out.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/redirect';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Protected zones.
  const needsAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const needsApprovedUser = pathname === '/portal' || pathname.startsWith('/portal/');

  if (!user && (needsAdmin || needsApprovedUser)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
    return NextResponse.redirect(url);
  }

  if (user && (needsAdmin || needsApprovedUser)) {
    // Look up role + approval; supabase client respects RLS so we read own profile.
    const { data: profile } = await supabase
      .from('profiles')
      .select('app_role, approval_status')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.app_role === 'admin';
    const isApproved = profile?.approval_status === 'approved';

    if (needsAdmin && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = isApproved ? '/portal' : '/pending-approval';
      url.search = '';
      return NextResponse.redirect(url);
    }
    if (needsApprovedUser && !isApproved && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/pending-approval';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Pass through (with refreshed cookies) for everything else, public or otherwise.
  if (isPublic(pathname)) return response;
  return response;
}
