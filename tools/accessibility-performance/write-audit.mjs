import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  REQUIRED_ACCESSIBILITY_ROUTES,
  REQUIRED_PUBLIC_ROUTES,
  auditAccessibilityPerformanceContract,
} from '../../lib/accessibility-performance/contract.mjs'

const root = process.cwd()
const json = async (file) => JSON.parse(await readFile(path.join(root, file), 'utf8'))
const text = async (file) => readFile(path.join(root, file), 'utf8')
const optionalJson = async (file) => {
  try { return await json(file) } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

const input = {
  packageScripts: (await json('package.json')).scripts,
  desktopConfig: await json('lighthouserc.json'),
  mobileConfig: await json('lighthouserc.mobile.json'),
  layoutSource: await text('app/layout.tsx'),
  globalCss: await text('app/globals.css'),
  chromeSource: await text('components/marketing-chrome.tsx'),
  browserConfigSource: await text('playwright.accessibility-performance.config.ts'),
  browserSpecSource: await text('tests/accessibility-performance/accessibility-performance.spec.ts'),
}
const findings = auditAccessibilityPerformanceContract(input)
const [browser, lighthouseDesktop, lighthouseMobile] = await Promise.all([
  optionalJson('docs/evidence/project-loop/accessibility-browser-results.json'),
  optionalJson('.lighthouseci/config-desktop/summary.json'),
  optionalJson('.lighthouseci/config-mobile/summary.json'),
])
const executionEvidenceReady = browser?.status === 'passed'
  && browser.expected === REQUIRED_ACCESSIBILITY_ROUTES.length + 2
  && browser.passed === browser.expected
  && browser.failed === 0
  && lighthouseDesktop?.ok === true
  && lighthouseDesktop.results?.length === REQUIRED_PUBLIC_ROUTES.length
  && lighthouseMobile?.ok === true
  && lighthouseMobile.results?.length === REQUIRED_PUBLIC_ROUTES.length
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  standard: 'WCAG 2.2 Level AA automated subset',
  status: findings.length > 0 ? 'fail' : executionEvidenceReady ? 'pass' : 'pending_execution_evidence',
  routeCoverage: {
    axeKeyboardResponsive: REQUIRED_ACCESSIBILITY_ROUTES,
    lighthouseDesktopMobile: REQUIRED_PUBLIC_ROUTES,
  },
  deterministicChecks: [
    'viewport zoom remains enabled',
    'visible focus and skip navigation contracts',
    'global reduced-motion fallback',
    'loopback-only axe/keyboard/responsive browser proof',
    'desktop and mobile Lighthouse accessibility and Core Web Vitals budgets',
    'known-good and deliberately broken fixtures',
  ],
  executionEvidence: {
    browser: browser ? { status: browser.status, expected: browser.expected, passed: browser.passed, failed: browser.failed } : { status: 'pending' },
    lighthouseDesktop: lighthouseDesktop ? { status: lighthouseDesktop.ok ? 'passed' : 'failed', routes: lighthouseDesktop.results?.length ?? 0, failures: lighthouseDesktop.failures ?? [] } : { status: 'pending' },
    lighthouseMobile: lighthouseMobile ? { status: lighthouseMobile.ok ? 'passed' : 'failed', routes: lighthouseMobile.results?.length ?? 0, failures: lighthouseMobile.failures ?? [] } : { status: 'pending' },
  },
  humanEvidenceNotClaimed: [
    'No VoiceOver, NVDA, JAWS, or TalkBack session was performed',
    'No user testing with people with disabilities was performed',
    'Automated checks do not establish complete WCAG conformance',
    'Field Core Web Vitals were not measured; Lighthouse results are local lab evidence',
  ],
  findings,
}
const destination = path.join(root, 'docs/evidence/project-loop/accessibility-performance-audit.json')
await mkdir(path.dirname(destination), { recursive: true })
await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
if (findings.length) process.exit(1)
