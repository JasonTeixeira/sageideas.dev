import type { NextConfig } from 'next'

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
      // Legacy QA-portfolio routes — redirect to closest Sage Ideas equivalent
      // (kept as 308 so they can be reverted if we decide to repurpose them)
      { source: '/dashboard', destination: '/portal/home', permanent: false },
      { source: '/artifacts', destination: '/work', permanent: false },
      { source: '/platform', destination: '/capabilities', permanent: false },
      { source: '/platform/:path*', destination: '/capabilities', permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ]
  },
}

export default nextConfig
