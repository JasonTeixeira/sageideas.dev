const REQUIRED_SCRIPTS = Object.freeze({
  'test:accessibility-performance': 'node --test tests/accessibility-performance/accessibility-performance.test.mjs && npm run audit:accessibility-performance',
  'test:accessibility-performance:e2e': 'playwright test --config=playwright.accessibility-performance.config.ts',
})

export const REQUIRED_PUBLIC_ROUTES = Object.freeze([
  '/',
  '/services',
  '/work',
  '/pricing',
  '/blog',
  '/contact',
])

export const REQUIRED_ACCESSIBILITY_ROUTES = Object.freeze([
  ...REQUIRED_PUBLIC_ROUTES,
  '/login',
  '/signup',
  '/academy/catalog',
  '/academy/method',
  '/academy/labs',
  '/academy/try',
  '/checkout/audit',
])

const VITAL_BUDGETS = Object.freeze({
  desktop: Object.freeze({
    'largest-contentful-paint': 2500,
    'cumulative-layout-shift': 0.1,
    'total-blocking-time': 200,
  }),
  mobile: Object.freeze({
    'largest-contentful-paint': 2500,
    'cumulative-layout-shift': 0.1,
    'total-blocking-time': 300,
  }),
})

const HOST_VARIANT_MOBILE_AUDITS = new Set([
  'largest-contentful-paint',
  'total-blocking-time',
])

function add(findings, code, message, details = undefined) {
  findings.push({ code, severity: 'critical', message, ...(details ? { details } : {}) })
}

function configBody(value) {
  return value?.ci ?? value ?? {}
}

function auditConfig(findings, value, profile) {
  const config = configBody(value)
  const collect = config.collect ?? {}
  const assertions = config.assert?.assertions ?? {}
  const urls = Array.isArray(collect.url) ? collect.url : []
  const paths = new Set()

  for (const raw of urls) {
    try {
      const url = new URL(raw)
      paths.add(url.pathname.replace(/\/$/, '') || '/')
      if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
        add(findings, 'remote_lighthouse_target', `${profile} Lighthouse target must be loopback-only`, { target: raw })
      }
    } catch {
      add(findings, 'remote_lighthouse_target', `${profile} Lighthouse target is not a valid local URL`, { target: raw })
    }
  }

  const missingRoutes = REQUIRED_PUBLIC_ROUTES.filter((route) => !paths.has(route))
  if (missingRoutes.length) add(findings, 'critical_route_missing', `${profile} Lighthouse coverage is incomplete`, { profile, missingRoutes })

  const categories = new Set(collect.settings?.onlyCategories ?? [])
  const a11y = assertions['categories:accessibility']
  if (!categories.has('accessibility') || !Array.isArray(a11y) || a11y[0] !== 'error' || Number(a11y[1]?.minScore) < 0.95) {
    add(findings, 'accessibility_not_hard_gated', `${profile} accessibility must hard-fail below 0.95`)
  }

  for (const [auditId, maxNumericValue] of Object.entries(VITAL_BUDGETS[profile])) {
    const rule = assertions[auditId]
    if (!categories.has('performance') || !Array.isArray(rule) || rule[0] !== 'error' || Number(rule[1]?.maxNumericValue) > maxNumericValue) {
      add(findings, 'core_web_vital_not_hard_gated', `${profile} ${auditId} must hard-fail above ${maxNumericValue}`, { profile, auditId })
    }
  }

  if (profile === 'mobile') {
    const screen = collect.settings?.screenEmulation ?? {}
    if (collect.settings?.formFactor !== 'mobile' || screen.width !== 390 || screen.height !== 844) {
      add(findings, 'mobile_profile_missing', 'Mobile Lighthouse must use the canonical 390x844 profile')
    }
    const calibration = collect.settings?.cpuCalibration ?? {}
    const calibrationRuns = Number(calibration.runs)
    const measurementRuns = Number(collect.numberOfRuns)
    if (!Number.isInteger(measurementRuns) || measurementRuns < 3 || measurementRuns % 2 === 0) {
      add(findings, 'performance_sampling_missing', 'Mobile Lighthouse must select the official median run from an odd sample of at least three measurements per route')
    }
    if (calibration.enabled !== true
        || calibration.strategy !== 'lighthouse-official-mid-tier-mobile-v1'
        || !Number.isInteger(calibrationRuns)
        || calibrationRuns < 3
        || calibrationRuns % 2 === 0
        || collect.settings?.throttling?.cpuSlowdownMultiplier !== undefined) {
      add(findings, 'cpu_calibration_missing', 'Mobile Lighthouse must use an odd, multi-sample official CPU calibration without a fixed multiplier')
    }
  }
}

export function auditAccessibilityPerformanceContract(input) {
  const findings = []
  for (const [name, command] of Object.entries(REQUIRED_SCRIPTS)) {
    if (input.packageScripts?.[name] !== command) add(findings, 'script_missing', `Missing or changed package script: ${name}`)
  }

  auditConfig(findings, input.desktopConfig, 'desktop')
  auditConfig(findings, input.mobileConfig, 'mobile')

  if (/maximumScale\s*:\s*1|userScalable\s*:\s*false/.test(input.layoutSource ?? '')) {
    add(findings, 'zoom_disabled', 'The viewport must not disable browser zoom')
  }
  if (!/:focus-visible\b/.test(input.globalCss ?? '')) {
    add(findings, 'focus_contract_missing', 'A visible global focus contract is required')
  }
  const css = input.globalCss ?? ''
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css)
      || !/animation-duration\s*:\s*0\.01ms\s*!important/.test(css)
      || !/transition-duration\s*:\s*0\.01ms\s*!important/.test(css)
      || !/scroll-behavior\s*:\s*auto\s*!important/.test(css)) {
    add(findings, 'reduced_motion_contract_missing', 'The global reduced-motion kill switch is incomplete')
  }
  const chrome = input.chromeSource ?? ''
  if (!/SkipToContent/.test(chrome) || !/main[^>]+id=["'{]main-content/.test(chrome) || !/tabIndex=\{-1\}/.test(chrome)) {
    add(findings, 'skip_link_contract_missing', 'Marketing chrome must provide a skip link and focusable main landmark')
  }

  const browserConfig = input.browserConfigSource ?? ''
  if (!/127\.0\.0\.1/.test(browserConfig) || !/localhost/.test(browserConfig) || !/reuseExistingServer\s*:\s*false/.test(browserConfig)) {
    add(findings, 'local_browser_boundary_missing', 'Accessibility browser proof must be isolated and loopback-only')
  }
  const browserSpec = input.browserSpecSource ?? ''
  if (!/AxeBuilder/.test(browserSpec) || !/wcag22aa/.test(browserSpec)) {
    add(findings, 'axe_wcag22_contract_missing', 'Browser proof must run axe against WCAG 2.2 AA tags')
  }
  if (!/REQUIRED_ACCESSIBILITY_ROUTES/.test(browserSpec) || !/for\s*\([^)]*of\s+REQUIRED_ACCESSIBILITY_ROUTES\)/.test(browserSpec)) {
    add(findings, 'accessibility_route_matrix_missing', 'Browser proof must sweep the canonical risk-based accessibility route matrix')
  }
  if (!/keyboard\.press\(['"]Tab['"]\)/.test(browserSpec)) {
    add(findings, 'keyboard_contract_missing', 'Browser proof must exercise keyboard navigation')
  }
  if (!/reducedMotion\s*:\s*['"]reduce['"]/.test(browserSpec)) {
    add(findings, 'reduced_motion_contract_missing', 'Browser proof must emulate reduced motion')
  }
  if (!/scrollWidth\s*<=\s*document\.documentElement\.clientWidth/.test(browserSpec)) {
    add(findings, 'responsive_overflow_contract_missing', 'Browser proof must detect horizontal viewport overflow')
  }
  if (!/blockedbyclient/.test(browserSpec)) {
    add(findings, 'local_browser_boundary_missing', 'Browser proof must block outbound network traffic')
  }
  return findings
}

/**
 * A single uncalibrated shared runner is useful as a structural smoke test, but
 * its timing cannot replace the calibrated multi-run release proof. Preserve
 * every configured budget and surface timing misses as warnings in that mode.
 */
export function assertionsForExecutionMode(assertions, { profile, cpuMode } = {}) {
  if (profile !== 'mobile' || cpuMode !== 'provided') return assertions
  return Object.fromEntries(Object.entries(assertions ?? {}).map(([key, rule]) => {
    if (!HOST_VARIANT_MOBILE_AUDITS.has(key) || !Array.isArray(rule)) return [key, rule]
    return [key, ['warn', rule[1] ?? {}]]
  }))
}

export function evaluateLighthouseAssertions(report, assertions) {
  const withinNumericBound = (value, bound, direction) => {
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(value), Math.abs(bound)) * 16
    return direction === 'min' ? value + tolerance >= bound : value - tolerance <= bound
  }
  const results = []
  for (const [key, rule] of Object.entries(assertions ?? {})) {
    if (!Array.isArray(rule)) continue
    const [level, options = {}] = rule
    const category = key.match(/^categories:(.+)$/)
    const value = category ? report.categories?.[category[1]]?.score : report.audits?.[key]?.numericValue
    const min = options.minScore
    const max = options.maxNumericValue
    const passed = typeof value === 'number'
      && (min === undefined || withinNumericBound(value, Number(min), 'min'))
      && (max === undefined || withinNumericBound(value, Number(max), 'max'))
    results.push({ key, level, value: value ?? null, ...(min === undefined ? {} : { minScore: Number(min) }), ...(max === undefined ? {} : { maxNumericValue: Number(max) }), passed })
  }
  return results
}
