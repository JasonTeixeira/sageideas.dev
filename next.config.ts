import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Build-time TS errors should not block deploys for now (we lint separately).
  typescript: { ignoreBuildErrors: true },
  // Required because we run inside a monorepo-like workspace and Turbopack
  // otherwise warns about lockfile inference.
  turbopack: { root: __dirname },
  images: { unoptimized: true },
  async redirects() {
    return [
      // Apex → www (canonical hostname)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'sageideas.dev' }],
        destination: 'https://www.sageideas.dev/:path*',
        permanent: true,
      },
      // Blog/feed canonicalization
      { source: '/insights', destination: '/blog', permanent: true },
      { source: '/insights/:slug*', destination: '/blog/:slug*', permanent: true },
      { source: '/rss.xml', destination: '/feed.xml', permanent: true },
      { source: '/atom.xml', destination: '/feed.xml', permanent: true },
      // Studio relaunch IA migration
      { source: '/hire', destination: '/founder', permanent: true },
      { source: '/start', destination: '/contact', permanent: true },
      { source: '/about', destination: '/studio', permanent: true },
      { source: '/resume', destination: '/founder', permanent: true },
      { source: '/services/all', destination: '/services', permanent: false },
      // Old case-study URLs → new /work URLs
      { source: '/case-studies', destination: '/work', permanent: true },
      { source: '/case-studies/:slug*', destination: '/work/:slug*', permanent: true },
      { source: '/projects', destination: '/lab', permanent: true },
      // Phase 2A.5 — /portal/home was a duplicate dashboard, consolidated into /portal
      { source: '/portal/home', destination: '/portal', permanent: true },
      // Phase 2H — Files feature lives at /portal/documents; stale /portal/files links 404'd.
      { source: '/portal/files', destination: '/portal/documents', permanent: false },
      { source: '/portal/files/:path*', destination: '/portal/documents/:path*', permanent: false },
      // Phase 2A.6 — /portal/admin/* consolidated into /admin/*
      { source: '/portal/admin', destination: '/admin', permanent: true },
      { source: '/portal/admin/clients', destination: '/admin/crm', permanent: true },
      { source: '/portal/admin/activity', destination: '/admin/audit-log', permanent: true },
      { source: '/portal/admin/settings', destination: '/admin/settings', permanent: true },
      { source: '/portal/admin/:path*', destination: '/admin/:path*', permanent: true },
      // Legacy QA-portfolio routes — redirect to closest Sage Ideas equivalent
      // (kept as 308 so they can be reverted if we decide to repurpose them)
      { source: '/dashboard', destination: '/portal', permanent: false },
      { source: '/artifacts', destination: '/work', permanent: false },
      { source: '/platform', destination: '/capabilities', permanent: false },
      { source: '/platform/:path*', destination: '/capabilities', permanent: false },
    ]
  },
  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.sentry.io https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://o*.ingest.sentry.io https://va.vercel-scripts.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')
    const cspEnforce = process.env.CSP_ENFORCE === 'true'
    const cspKey = cspEnforce
      ? 'Content-Security-Policy'
      : 'Content-Security-Policy-Report-Only'

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: cspKey, value: cspDirectives },
        ],
      },
    ]
  },
}

// Wrap the config with Sentry so source maps + tunneling are wired up.
// All Sentry behavior is gated on NEXT_PUBLIC_SENTRY_DSN — without it the
// SDK is initialized as a no-op and these wrapper options are inert.
const sentryWebpackPluginOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppress upload during local builds where SENTRY_AUTH_TOKEN isn't set.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Tunnel ad-blocked requests through our origin so client errors still report.
  tunnelRoute: '/monitoring',
  // Hide Sentry from the public source map output.
  hideSourceMaps: true,
  // Avoid breaking the build if Sentry can't reach its API in CI.
  errorHandler: () => {},
  disableLogger: true,
}

export default process.env.SENTRY_AUTH_TOKEN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig
