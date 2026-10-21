import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { logAudit } from '@/lib/admin-guard';
import { attributeReferral } from '@/lib/academy/referrals';
import { safeRelativeRedirect } from '@/lib/security/safe-redirect';
import { canonicalSiteOrigin } from '@/lib/security/site-origin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = canonicalSiteOrigin({
    configured: process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    forwardedHost: request.headers.get('x-forwarded-host') ?? requestUrl.host,
    host: request.headers.get('host'),
    forwardedProto: request.headers.get('x-forwarded-proto') ?? requestUrl.protocol.slice(0, -1),
    production: process.env.NODE_ENV === 'production',
  });
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeRelativeRedirect(searchParams.get('next'), '/auth/redirect');
  const errorParam = searchParams.get('error_description') ?? searchParams.get('error');

  if (errorParam) {
    console.error('[auth/callback] provider returned an error', errorParam);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication could not be completed. Please try again.')}`);
  }

  // Build the response we will return, then bind cookies to IT so that
  // session cookies set by exchangeCodeForSession/verifyOtp persist on the redirect.
  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] code exchange failed', error);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication could not be completed. Please try again.')}`);
    }
  } else if (tokenHash && type && ['email', 'magiclink', 'recovery', 'invite', 'signup'].includes(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'email' | 'magiclink' | 'recovery' | 'invite' | 'signup',
      token_hash: tokenHash,
    });
    if (error) {
      console.error('[auth/callback] OTP verification failed', error);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Authentication could not be completed. Please try again.')}`);
    }
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAudit({
        actorId: user.id,
        actorEmail: user.email ?? '',
        action: 'auth.login',
        entityType: 'session',
        entityId: user.id,
        after: { method: code ? 'oauth_or_magic' : `otp_${type}` },
      });
      if (user.user_metadata?.audience === 'academy') {
        const referralCode = request.cookies.get('sage_ref')?.value;
        if (referralCode) {
          try {
            await attributeReferral(user.id, referralCode);
            response.cookies.delete('sage_ref');
          } catch (error) {
            console.error('[auth] verified referral attribution failed', error);
          }
        }
      }
    }
  } catch {
    // never block sign-in on audit failures
  }

  return response;
}
