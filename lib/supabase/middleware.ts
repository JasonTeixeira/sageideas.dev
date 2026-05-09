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

// First-segment routes that exist under /portal. Anything not in this set
// falls through to the catch-all route, which renders the portal 404. We
// detect that here so the response can be served with HTTP 404 (Next's
// notFound() inside a Suspense-wrapped tree otherwise stays at 200).
const PORTAL_VALID_SEGMENTS = new Set([
  'billing',
  'calendar',
  'catalog',
  'documents',
  'engagements',
  // 'files' is not a real segment — it's redirected to 'documents' in next.config.ts.
  // Listed here so the middleware allowlist doesn't 404 the request before Next's
  // redirects() machinery runs.
  'files',
  'help',
  'home',
  'inbox',
  'invoices',
  'booking',
  'bookings',
  'intake',
  'messages',
  'projects',
  'proposals',
  'settings',
  // Internal target for the not-found rewrite below — must not be 404'd.
  'not-found-render',
]);

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

// Build a redirect response that carries any refreshed-session cookies from
// `source` (the response that the supabase-ssr setAll callback writes to).
// Without this, redirects from middleware drop the refresh-cookie set, which
// breaks the session on the next navigation.
function redirectWithSessionCookies(target: URL, source: NextResponse) {
  const r = NextResponse.redirect(target);
  source.cookies.getAll().forEach((c) => {
    r.cookies.set(c);
  });
  return r;
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
    return redirectWithSessionCookies(url, response);
  }

  // Protected zones.
  const needsAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const needsApprovedUser = pathname === '/portal' || pathname.startsWith('/portal/');

  if (!user && (needsAdmin || needsApprovedUser)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
    return redirectWithSessionCookies(url, response);
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
      return redirectWithSessionCookies(url, response);
    }
    if (needsApprovedUser && !isApproved && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/pending-approval';
      url.search = '';
      return redirectWithSessionCookies(url, response);
    }

    // Admin-only hardening: MFA step-up + sliding idle timeout.
    if (needsAdmin && isAdmin) {
      const mfaRequired = process.env.MFA_REQUIRED_FOR_ADMIN === 'true';
      if (mfaRequired) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        // currentLevel === 'aal1' means the session has not satisfied the
        // step-up factor. nextLevel === 'aal2' means a TOTP factor is enrolled
        // and step-up is possible. If no factor is enrolled at all, both
        // levels are 'aal1' — push them to /portal/settings to enroll.
        if (aal?.currentLevel === 'aal1') {
          const url = request.nextUrl.clone();
          if (aal.nextLevel === 'aal2') {
            url.pathname = '/auth/mfa';
            url.search = `?next=${encodeURIComponent(pathname + (search || ''))}`;
          } else {
            url.pathname = '/portal/settings';
            url.search = '?mfa=required';
          }
          return redirectWithSessionCookies(url, response);
        }
      } else if (process.env.NODE_ENV !== 'production') {
        // Loud-ish in dev so reviewers know the gate is intentionally off.
        console.debug('[middleware] MFA_REQUIRED_FOR_ADMIN=false — admin MFA gate skipped');
      }

      // Sliding 30-min idle timeout for admin sessions only.
      const IDLE_MS = 30 * 60 * 1000;
      const lastActiveRaw = request.cookies.get('admin_last_active')?.value;
      const lastActive = lastActiveRaw ? Number(lastActiveRaw) : NaN;
      const now = Date.now();
      if (Number.isFinite(lastActive) && now - lastActive > IDLE_MS) {
        await supabase.auth.signOut();
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.search = `?reason=idle&next=${encodeURIComponent(pathname + (search || ''))}`;
        const r = redirectWithSessionCookies(url, response);
        r.cookies.set('admin_last_active', '', {
          path: '/admin',
          maxAge: 0,
        });
        return r;
      }
      response.cookies.set('admin_last_active', String(now), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/admin',
        maxAge: Math.ceil(IDLE_MS / 1000),
      });
    }
  }

  // Unknown /portal/* sub-route: rewrite to the dedicated portal not-found
  // page with HTTP 404. Notes:
  //   - We rewrite to a real URL (not the original) because Next treats a
  //     same-URL rewrite + 404 as the framework's own 404 path and renders
  //     the root app/not-found.tsx, dropping portal chrome.
  //   - Calling notFound() directly from a catch-all page commits status 200
  //     because the portal segment has loading.tsx, so the response stream
  //     flushes before the throw.
  if (
    needsApprovedUser &&
    pathname !== '/portal' &&
    pathname.startsWith('/portal/')
  ) {
    const firstSegment = pathname.slice('/portal/'.length).split('/')[0];
    if (firstSegment && !PORTAL_VALID_SEGMENTS.has(firstSegment)) {
      const target = request.nextUrl.clone();
      target.pathname = '/portal/not-found-render';
      target.search = '';
      const rewrite = NextResponse.rewrite(target, {
        status: 404,
        request: { headers: request.headers },
      });
      response.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
      return rewrite;
    }
  }

  // Pass through (with refreshed cookies) for everything else, public or otherwise.
  if (isPublic(pathname)) return response;
  return response;
}
