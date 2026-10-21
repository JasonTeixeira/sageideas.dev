import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

import { REQUIRED_ACCESSIBILITY_ROUTES } from '../../lib/accessibility-performance/contract.mjs'
import { isApprovedStagingPreviewHostname } from '../../lib/staging/preview-target.mjs'

test.beforeEach(async ({ context }, testInfo) => {
  const configuredBaseURL = testInfo.project.use.baseURL
  if (typeof configuredBaseURL !== 'string') throw new Error('Playwright baseURL is required.')
  const allowedHostname = new URL(configuredBaseURL).hostname
  const stagingBypass = process.env.STAGING_BYPASS_SECRET?.trim()

  await context.route(/^https?:\/\//, async (route) => {
    const hostname = new URL(route.request().url()).hostname
    if (hostname !== allowedHostname) {
      await route.abort('blockedbyclient')
      return
    }

    if (stagingBypass && isApprovedStagingPreviewHostname(hostname)) {
      await route.continue({
        headers: {
          ...route.request().headers(),
          'x-vercel-protection-bypass': stagingBypass,
        },
      })
      return
    }

    await route.continue()
  })
})

test('the axe gate proves its deliberately broken and known-good fixtures', async ({ page }) => {
  await page.setContent('<main><button></button><img src="missing.png"></main>')
  const broken = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(broken.violations.map((violation) => violation.id)).toEqual(
    expect.arrayContaining(['button-name', 'image-alt']),
  )

  await page.setContent('<!doctype html><html lang="en"><head><title>Known-good fixture</title></head><body><main><h1>Known-good fixture</h1><button>Continue</button><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt=""></main></body></html>')
  const knownGood = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(knownGood.violations).toEqual([])
})

for (const route of REQUIRED_ACCESSIBILITY_ROUTES) {
  test(`${route} meets automated WCAG 2.2 AA and responsive contracts`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    // Let finite entrance transitions settle without waiting for analytics or
    // other intentionally blocked external traffic to become network-idle.
    await page.waitForTimeout(1_000)

    expect(pageErrors, `${route} emitted browser errors during hydration`).toEqual([])

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const summary = results.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => ({ target: node.target, html: node.html })),
    }))
    expect(results.violations, JSON.stringify(summary, null, 2)).toEqual([])

    await expect(page.locator('main')).toHaveCount(1)
    await expect(page.locator('h1:visible')).toHaveCount(1)
    const fitsViewport = await page.evaluate(() => (
      document.documentElement.scrollWidth <= document.documentElement.clientWidth
    ))
    expect(fitsViewport, `${route} has horizontal overflow at 390px`).toBe(true)

    const longRunningAnimations = await page.evaluate(() => document.getAnimations()
      .filter((animation) => animation.playState === 'running' && Number(animation.effect?.getTiming().duration) > 100)
      .length)
    expect(longRunningAnimations, `${route} keeps non-trivial animation running with reduced motion`).toBe(0)
  })
}

test('skip navigation is the first keyboard stop and transfers focus to main', async ({ page }) => {
  await page.goto('/services', { waitUntil: 'domcontentloaded' })
  await page.keyboard.press('Tab')
  const skipLink = page.getByRole('link', { name: 'Skip to main content' })
  await expect(skipLink).toBeFocused()
  await expect(skipLink).toBeVisible()
  await skipLink.press('Enter')
  await expect(page.locator('main#main-content')).toBeFocused()
})
