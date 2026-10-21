import { execSync } from 'node:child_process'
import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

// Capture build-time provenance for the telemetry footer. Both reads are
// wrapped in try/catch so a missing .git directory (e.g. CI container without
// full history) never breaks the build — we just fall back to 'dev'.
function safeExec(cmd: string, fallback: string) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || fallback
  } catch {
    return fallback
  }
}
const GIT_SHA = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
  ?? safeExec('git rev-parse --short HEAD', 'dev')
const BUILD_TIME = new Date().toISOString()

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_GIT_SHA: GIT_SHA,
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
  },
  typescript: { ignoreBuildErrors: false },
  // Required because we run inside a monorepo-like workspace and Turbopack
  // otherwise warns about lockfile inference.
  turbopack: { root: __dirname },
  // Phase 0: Image optimization enabled. Vercel handles AVIF/WebP/resize automatically.
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [16, 32, 64, 96, 128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
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
      // Studio relaunch IA migration
      { source: '/hire', destination: '/founder', permanent: true },
      { source: '/start', destination: '/contact', permanent: true },
      { source: '/about', destination: '/studio', permanent: true },
      { source: '/resume', destination: '/founder', permanent: true },
      // Legacy per-track academy → the one canonical academy. These 4 track URLs
      // (+ /enroll, /learn) were indexed with Course/Offer JSON-LD; 301 them into
      // the catalog so no indexed URL 404s. Explicit slugs (not a wildcard) keep
      // the new /academy/catalog, /course, /build, /engine routes untouched.
      { source: '/academy/ai-native-product-building/:path*', destination: '/academy/catalog', permanent: true },
      { source: '/academy/premium-conversion-sites/:path*', destination: '/academy/catalog', permanent: true },
      { source: '/academy/content-engine/:path*', destination: '/academy/catalog', permanent: true },
      { source: '/academy/ai-automation-systems/:path*', destination: '/academy/catalog', permanent: true },
      { source: '/academy/my-courses', destination: '/academy/dashboard', permanent: true },
      // Manifesto consolidation: proof-not-paper is the canonical anti-cert
      // wedge; fold the near-duplicate why-proof into it so attention (and link
      // equity) lands on one page.
      { source: '/academy/why-proof', destination: '/academy/proof-not-paper', permanent: true },
      { source: '/services/all', destination: '/services', permanent: false },
      // Old case-study URLs → new /work URLs
      { source: '/case-studies', destination: '/work', permanent: true },
      { source: '/case-studies/:slug*', destination: '/work/:slug*', permanent: true },
      { source: '/projects', destination: '/lab', permanent: true },
      // Academy consolidation — /learn collapses into /academy, but the dedicated
      // founding-waitlist page at /learn/waitlist stays live (it is not a duplicate).
      { source: '/learn', destination: '/academy', permanent: false },
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
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.sentry.io https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://va.vercel-scripts.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "frame-ancestors 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ')
    // Production must fail closed. Local/preview environments can opt in while
    // tightening directives without weakening the deployed security boundary.
    const cspEnforce = process.env.NODE_ENV === 'production' || process.env.CSP_ENFORCE === 'true'
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
      // Phase 1: PWA service worker headers.
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
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
