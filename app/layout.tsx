import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { headers } from 'next/headers'
import { MarketingChrome } from '@/components/marketing-chrome'
import { CookieBanner } from '@/components/studio/cookie-banner'
import { ExitIntentModal } from '@/components/exit-intent-modal'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { WebVitalsReporter } from '@/components/web-vitals-reporter'
import { ClientErrorReporter } from '@/components/client-error-reporter'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#09090B',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

const SITE_URL = 'https://www.sageideas.dev'

export const metadata: Metadata = {
  title: {
    default: 'Sage Ideas — AI-Native Studio for B2B Operators',
    template: '%s — Sage Ideas',
  },
  description:
    'Sage Ideas is an AI-native studio that builds, automates, and scales B2B businesses. From $1,500 audits to flagship business sprints — we ship the same stack we run our own products on.',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: 'Sage Ideas — AI-Native Studio for B2B Operators',
    description:
      'AI-native studio. We build the businesses we’d want to run. Studio craft, agency rigor, productized engagements.',
    url: SITE_URL,
    siteName: 'Sage Ideas',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/og?title=Sage%20Ideas&subtitle=AI-Native%20Studio%20for%20B2B%20Operators`,
        width: 1200,
        height: 630,
        alt: 'Sage Ideas — AI-Native Studio for B2B Operators',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sage Ideas — AI-Native Studio for B2B Operators',
    description:
      'We build the businesses we’d want to run. AI products, internal tools, and full builds for B2B operators.',
    images: [`${SITE_URL}/og?title=Sage%20Ideas&subtitle=AI-Native%20Studio%20for%20B2B%20Operators`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: {
    canonical: SITE_URL,
    types: { 'application/rss+xml': `${SITE_URL}/feed.xml` },
  },
  keywords: [
    'AI automation agency',
    'AI development studio',
    'fractional CTO',
    'B2B software studio',
    'AI-native agency',
    'productized development',
    'Next.js development agency',
    'fintech software agency',
    'AI workflow automation',
    'programmatic SEO agency',
    'Stripe SaaS development',
    'AWS Terraform consultancy',
    'Sage Ideas',
    'Jason Teixeira',
    'remote software studio',
    'one-person agency',
  ],
  authors: [{ name: 'Jason Teixeira', url: SITE_URL }],
  creator: 'Sage Ideas',
  publisher: 'Sage Ideas LLC',
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Sage Ideas',
  legalName: 'Sage Ideas LLC',
  url: SITE_URL,
  logo: `${SITE_URL}/brand/logo.svg`,
  description:
    'AI-native studio for B2B operators. We design, build, automate, and operate production businesses.',
  founder: {
    '@type': 'Person',
    name: 'Jason Teixeira',
    url: `${SITE_URL}/founder`,
  },
  foundingDate: '2024',
  email: 'sage@sageideas.dev',
  sameAs: [
    'https://github.com/JasonTeixeira',
    'https://linkedin.com/in/jason-teixeira',
  ],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Orlando',
    addressRegion: 'FL',
    addressCountry: 'US',
  },
  knowsAbout: [
    'AI Automation',
    'Full-Stack Development',
    'Cloud Infrastructure',
    'Programmatic SEO',
    'Stripe Integration',
    'Fractional CTO Engagements',
    'Next.js Engineering',
  ],
}

const professionalServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  name: 'Sage Ideas LLC',
  url: SITE_URL,
  description:
    'AI-native studio. Productized engagements: audit, ship, automate, scale, build, operate. Solo studio, agency rigor.',
  founder: { '@type': 'Person', name: 'Jason Teixeira' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Orlando',
    addressRegion: 'FL',
    addressCountry: 'US',
  },
  areaServed: { '@type': 'Country', name: 'United States' },
  serviceType: [
    'AI Automation',
    'Custom Software Development',
    'Programmatic SEO',
    'Fractional CTO',
    'Stripe Integration',
    'Cloud Infrastructure',
  ],
  priceRange: '$$$',
  email: 'sage@sageideas.dev',
  sameAs: [
    'https://github.com/JasonTeixeira',
    'https://linkedin.com/in/jason-teixeira',
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const h = await headers()
  const isPortal = h.get('x-portal') === '1'
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} bg-[#09090B]`}
    >
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(professionalServiceSchema) }}
        />
        <PostHogProvider>
          <MarketingChrome position="top" />
          <MarketingChrome position="children">{children}</MarketingChrome>
          <MarketingChrome position="bottom" />
          {!isPortal && <CookieBanner />}
          {!isPortal && <ExitIntentModal />}
          <WebVitalsReporter />
          <ClientErrorReporter />
        </PostHogProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
