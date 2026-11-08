import { getOwnerDestination } from '@/lib/studio-routing';
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

/**
 * Marketing pages whose ANONYMOUS server render is identical for every visitor —
 * safe to CDN edge-cache. Vercel only shares a cached response when it carries no
 * Set-Cookie, so signed-in requests (which bear auth cookies) are never cached and
 * stay personalized automatically. This turns a repeat anonymous hit from a full
 * ~300ms–1.5s dynamic render into a ~20ms edge HIT.
 */
function isCacheableMarketing(pathname: string): boolean {
  // ONLY the pages that render their own static client nav (AcademyChrome) and
  // are NOT wrapped in the studio MarketingChrome — MarketingChrome reads server
  // auth (getUser), so caching a page it wraps could serve a stale/anon nav to a
  // signed-in visitor. This list mirrors the `isAcademyHome` set in the root
  // layout (the pages the studio chrome never wraps); keep them in sync.
  return (
    pathname === '/' ||
    pathname === '/academy' ||
    pathname === '/academy/pricing' ||
    pathname === '/academy/catalog' ||
    pathname === '/academy/why-proof' ||
    pathname === '/academy/how-we-audit' ||
    pathname === '/academy/method' ||
    pathname === '/academy/projects' ||
    pathname === '/academy/try' ||
    pathname === '/academy/map' ||
    pathname === '/academy/starter' ||
    pathname === '/academy/about' ||
    pathname === '/academy/proof-not-paper' ||
    pathname === '/academy/help' ||
    pathname === '/how-it-works'
  );
}

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
    pathname.startsWith('/admin') ||
    // Authoring studio + full-screen learning views render their own chrome.
    pathname.startsWith('/academy-admin') ||
    // The signed-in learner area + academy auth use their own chrome, not the studio nav.
    pathname === '/academy/dashboard' ||
    pathname === '/academy/onboarding' ||
    pathname === '/academy/catalog' ||
    pathname.startsWith('/academy/course/') ||
    pathname === '/academy/evidence' ||
    pathname === '/academy/resources' ||
    pathname === '/academy/review' ||
    pathname === '/academy/leagues' ||
    pathname === '/academy/profile' ||
    pathname === '/academy/refer' ||
    pathname === '/academy/community' ||
    pathname === '/academy/build' ||
    pathname === '/academy/my-courses' ||
    pathname === '/academy/signup' ||
    pathname === '/academy/preview' ||
    pathname === '/academy/join' ||
    pathname === '/academy/legal' ||
    pathname === '/academy/resources/sprint-loop' ||
    pathname === '/artifacts/sample-audit' ||
    pathname.startsWith('/academy/engine') ||
    pathname.startsWith('/academy/learn/') ||
    (pathname.startsWith('/academy/') && pathname.endsWith('/learn'))
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
  const { pathname, search } = request.nextUrl;
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set('x-pathname', pathname + (search || ''));
  if (isPortalChrome(pathname)) {
    forwardedHeaders.set('x-portal', '1');
  }

  let response = NextResponse.next({ request: { headers: forwardedHeaders } });

  // Resilience: when Supabase env is absent (local dev without keys, or a prod
  // misconfig), skip auth entirely instead of 500-ing every request. Public
  // marketing pages still render; auth-gated zones simply won't have a user.
  // In production with env configured, behavior is unchanged.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    response.headers.set('x-pathname', pathname + (search || ''));
    if (isPortalChrome(pathname)) {
      response.headers.set('x-portal', '1');
    }
    return response;
  }

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
          response = NextResponse.next({ request: { headers: forwardedHeaders } });
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

  // Expose the request pathname to server components / layouts so that
  // auth-gated server code can build a `?next=` redirect target.
  response.headers.set('x-pathname', pathname + (search || ''));

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
  // Academy authoring studio: must at least be signed in to reach it (the page-level
  // getAdminUser enforces the academy admin/owner role — the canonical check). Gating
  // anon here keeps the admin UI bundle/RSC payload from rendering to the public.
  const needsAcademyAdmin = pathname === '/academy-admin' || pathname.startsWith('/academy-admin/');
  // The academy PRODUCT (catalog, courses, lessons, labs, dashboard, build, evidence,
  // resources) requires a signed-in account — you must log in to see the actual academy.
  // Public stays: the marketing landing (/academy), signup, pricing (/join), the sprint
  // demo (/engine), the printable sprint-loop, and shareable certificates.
  const isAcademyPublic =
    pathname === '/academy' ||
    // Metadata image routes must stay reachable by link-unfurl crawlers.
    pathname === '/academy/opengraph-image' ||
    /^\/academy\/(catalog|pricing|why-proof|how-we-audit)\/opengraph-image$/.test(pathname) ||
    pathname === '/academy/how-we-audit' ||
    pathname === '/academy/signup' ||
    pathname === '/academy/join' ||
    pathname === '/academy/engine' ||
    pathname === '/academy/engine/lab' ||
    pathname === '/academy/resources/sprint-loop' ||
    pathname === '/academy/efficacy' ||
    pathname === '/academy/legal' ||
    pathname === '/academy/guarantee' ||
    pathname === '/academy/interview/guarantee' ||
    pathname === '/academy/starter' ||
    pathname === '/academy/map' ||
    pathname === '/academy/method' ||
    pathname === '/academy/projects' ||
    pathname === '/academy/try' ||
    // Main-menu marketing pages: public sell surfaces in the academy skin.
    pathname === '/academy/catalog' ||
    pathname === '/academy/why-proof' ||
    pathname === '/academy/pricing' ||
    pathname === '/academy/about' ||
    pathname === '/academy/proof-not-paper' ||
    pathname === '/academy/help' ||
    // Interview Mastery add-on: the marketing/pricing landing is public (like /academy + /join).
    // Every other /academy/interview/* surface stays behind needsAcademyLogin.
    pathname === '/academy/interview/mastery' ||
    pathname.startsWith('/academy/voice/') ||
    pathname.startsWith('/academy/u/') ||
    pathname.startsWith('/academy/certificate/') ||
    // Concept pages: programmatic-SEO lesson previews — public by design.
    pathname === '/academy/concepts' ||
    pathname.startsWith('/academy/concepts/') ||
    // The Labs — the public workshop of buildable projects + per-lab specs.
    pathname === '/academy/labs' ||
    pathname.startsWith('/academy/labs/') ||
    // Course landings are the per-course sell pages — public like /academy.
    // Exactly one segment after /course/: the lesson player, map, and every
    // deeper surface stay behind needsAcademyLogin.
    /^\/academy\/course\/[^/]+$/.test(pathname);
  const needsAcademyLogin = pathname.startsWith('/academy/') && !isAcademyPublic;

  if (
    needsAdmin &&
    process.env.NODE_ENV !== 'production' &&
    process.env.LOCAL_ADMIN_BYPASS === 'job-os-preview' &&
    !process.env.VERCEL
  ) {
    return response;
  }

  // Academy product: just needs a signed-in account (any user), routed to the academy
  // login door. No approval/role check — academy learners aren't studio-approved.
  if (!user && needsAcademyLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?audience=academy&next=${encodeURIComponent(pathname + (search || ''))}`;
    return redirectWithSessionCookies(url, response);
  }

  if (!user && (needsAdmin || needsApprovedUser || needsAcademyAdmin)) {
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

    // Canonical owner destinations are role-gated; clients retain their portal.
    const ownerDestination = isAdmin ? getOwnerDestination(pathname) : null;
    if (ownerDestination) {
      const url = request.nextUrl.clone();
      url.pathname = ownerDestination;
      url.searchParams.delete('view');
      url.searchParams.delete('org');
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

  // Edge-cache anonymous hits on identical-for-everyone marketing pages. Vercel
  // won't share-cache a response that sets a cookie, so this only ever caches the
  // truly-anonymous render; signed-in visitors stay private + personalized.
  if (request.method === 'GET' && isCacheableMarketing(pathname)) {
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  }

  // Pass through (with refreshed cookies) for everything else, public or otherwise.
  if (isPublic(pathname)) return response;
  return response;
}
