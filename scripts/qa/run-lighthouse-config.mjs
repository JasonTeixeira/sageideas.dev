import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import path from 'node:path'
import process from 'node:process'
import { computeMedianRun } from 'lighthouse/core/lib/median-run.js'

import {
  assertionsForExecutionMode,
  evaluateLighthouseAssertions,
} from '../../lib/accessibility-performance/contract.mjs'
import {
  calculateCpuSlowdownMultiplier,
  resolveCpuExecutionMode,
  selectMedianBenchmarkIndex,
} from '../../lib/accessibility-performance/cpu-calibration.mjs'

const root = process.cwd()
const configArg = process.argv.find((value) => value.startsWith('--config='))?.slice('--config='.length) ?? 'lighthouserc.json'
const configPath = path.resolve(root, configArg)
const config = JSON.parse(await readFile(configPath, 'utf8'))
const collect = config?.ci?.collect
const assertions = config?.ci?.assert?.assertions ?? {}
if (!collect || !Array.isArray(collect.url) || collect.url.length === 0) throw new Error('Lighthouse config must define ci.collect.url')

const configuredUrls = collect.url.map((value) => new URL(value))
if (configuredUrls.some((url) => !['127.0.0.1', 'localhost'].includes(url.hostname))) {
  throw new Error('Local Lighthouse runner refuses non-local targets')
}
if (configuredUrls.some((url) => (url.port || '80') !== (configuredUrls[0].port || '80'))) throw new Error('All Lighthouse URLs must use one local port')

const profile = configArg.includes('mobile') ? 'mobile' : 'desktop'
const cpuMode = profile === 'mobile'
  ? resolveCpuExecutionMode(process.env.LIGHTHOUSE_CPU_MODE)
  : 'configured'
const configuredMeasurementRuns = Number(collect.numberOfRuns ?? 1)
if (!Number.isInteger(configuredMeasurementRuns) || configuredMeasurementRuns < 1) {
  throw new Error('Lighthouse numberOfRuns must be a positive integer')
}
if (profile === 'mobile' && cpuMode === 'calibrated'
    && (configuredMeasurementRuns < 3 || configuredMeasurementRuns % 2 === 0)) {
  throw new Error('Calibrated mobile Lighthouse requires an odd numberOfRuns greater than or equal to three')
}
const measurementRuns = profile === 'mobile' && cpuMode === 'provided'
  ? 1
  : configuredMeasurementRuns
const executionAssertions = assertionsForExecutionMode(assertions, { profile, cpuMode })
const outputDir = path.join(root, '.lighthouseci', `config-${profile}`)
const lighthouseBin = path.join(root, 'node_modules', '.bin', 'lighthouse')

async function availablePort() {
  if (process.env.LIGHTHOUSE_PORT) {
    const requested = Number(process.env.LIGHTHOUSE_PORT)
    if (!Number.isInteger(requested) || requested < 1024 || requested > 65535) throw new Error('LIGHTHOUSE_PORT must be an unprivileged TCP port')
    return requested
  }
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.unref()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const selected = typeof address === 'object' && address ? address.port : null
      probe.close((error) => error ? reject(error) : resolve(selected))
    })
  })
}

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    })
    let output = ''
    if (capture) {
      child.stdout.on('data', (chunk) => { output += String(chunk) })
      child.stderr.on('data', (chunk) => { output += String(chunk) })
    }
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output || `${command} exited ${code}`)))
  })
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = 'not ready'
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
      if (response.status < 500) return
      lastError = `HTTP ${response.status}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error(`Lighthouse target did not become ready: ${lastError}`)
}

function lighthouseArgs(url, outputPath, overrides = {}) {
  const settings = collect.settings ?? {}
  const args = [
    url.toString(),
    '--output=json',
    `--output-path=${outputPath}`,
    `--only-categories=${(overrides.onlyCategories ?? settings.onlyCategories ?? ['performance', 'accessibility', 'best-practices', 'seo']).join(',')}`,
    '--chrome-flags=--headless=new --no-sandbox',
  ]
  if (settings.preset === 'desktop') args.push('--preset=desktop')
  if (settings.formFactor === 'mobile') {
    args.push('--form-factor=mobile')
    if (overrides.throttlingMethod) args.push(`--throttling-method=${overrides.throttlingMethod}`)
    const screen = settings.screenEmulation ?? {}
    if (screen.width) args.push(`--screenEmulation.width=${screen.width}`)
    if (screen.height) args.push(`--screenEmulation.height=${screen.height}`)
    if (screen.deviceScaleFactor) args.push(`--screenEmulation.deviceScaleFactor=${screen.deviceScaleFactor}`)
    if (overrides.throttlingMethod !== 'provided') {
      const throttling = {
        ...(settings.throttling ?? {}),
        ...(overrides.cpuSlowdownMultiplier === undefined ? {} : { cpuSlowdownMultiplier: overrides.cpuSlowdownMultiplier }),
      }
      for (const key of ['rttMs', 'throughputKbps', 'cpuSlowdownMultiplier']) {
        if (throttling[key] !== undefined) args.push(`--throttling.${key}=${throttling[key]}`)
      }
    }
  }
  return args
}

function benchmarkIndexFrom(report) {
  const benchmarkIndex = report?.environment?.benchmarkIndex
  if (!Number.isFinite(benchmarkIndex)) throw new Error('Lighthouse calibration report did not contain a finite environment.benchmarkIndex')
  return benchmarkIndex
}

async function calibrateCpu(url, outputDir) {
  const calibration = collect.settings?.cpuCalibration
  if (profile !== 'mobile' || cpuMode !== 'calibrated' || calibration?.enabled !== true) return null
  const runs = Number(calibration.runs)
  if (!Number.isInteger(runs) || runs < 3 || runs % 2 === 0) {
    throw new Error('Mobile Lighthouse CPU calibration requires an odd number of runs greater than or equal to three')
  }

  const benchmarkIndexSamples = []
  for (let index = 0; index < runs; index += 1) {
    const outputPath = path.join(outputDir, `calibration-${String(index + 1).padStart(2, '0')}.json`)
    await run(lighthouseBin, lighthouseArgs(url, outputPath, {
      onlyCategories: ['performance'],
      cpuSlowdownMultiplier: 1,
    }), { capture: true })
    const report = JSON.parse(await readFile(outputPath, 'utf8'))
    benchmarkIndexSamples.push(benchmarkIndexFrom(report))
  }

  const benchmarkIndex = selectMedianBenchmarkIndex(benchmarkIndexSamples)
  return {
    strategy: calibration.strategy,
    source: 'https://lighthouse-cpu-throttling-calculator.vercel.app/',
    benchmarkIndexSamples,
    benchmarkIndex,
    cpuSlowdownMultiplier: calculateCpuSlowdownMultiplier(benchmarkIndex),
  }
}

async function stopServer(server) {
  if (server.exitCode !== null) return
  await new Promise((resolve) => {
    const timeout = setTimeout(() => server.kill('SIGKILL'), 5000)
    server.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
    server.kill('SIGTERM')
  })
}

await rm(outputDir, { recursive: true, force: true })
await mkdir(outputDir, { recursive: true })
const port = await availablePort()
if (!port) throw new Error('Unable to allocate a local Lighthouse port')
const urls = configuredUrls.map((configured) => {
  const url = new URL(configured)
  url.hostname = '127.0.0.1'
  url.port = String(port)
  return url
})
const server = spawn(process.execPath, ['scripts/serve-prod.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
})

const results = []
let cpuCalibration = null
try {
  await waitForServer(urls[0], Number(collect.startServerReadyTimeout ?? 60_000))
  cpuCalibration = await calibrateCpu(urls[0], outputDir)
  for (const [index, url] of urls.entries()) {
    const name = `${String(index + 1).padStart(2, '0')}-${url.pathname.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/gi, '-') || 'home'}`
    const samples = []
    for (let runIndex = 0; runIndex < measurementRuns; runIndex += 1) {
      const runSuffix = measurementRuns === 1 ? '' : `-run-${String(runIndex + 1).padStart(2, '0')}`
      const outputPath = path.join(outputDir, `${name}${runSuffix}.json`)
      await run(lighthouseBin, lighthouseArgs(url, outputPath, {
        cpuSlowdownMultiplier: cpuMode === 'provided' ? 1 : cpuCalibration?.cpuSlowdownMultiplier,
        throttlingMethod: cpuMode === 'provided' ? 'provided' : undefined,
      }), { capture: true })
      samples.push({ outputPath, report: JSON.parse(await readFile(outputPath, 'utf8')) })
    }
    const report = measurementRuns === 1
      ? samples[0].report
      : computeMedianRun(samples.map((sample) => sample.report))
    const selectedRunIndex = samples.findIndex((sample) => sample.report === report)
    const selected = samples[selectedRunIndex]
    results.push({
      url: url.toString(),
      outputPath: path.relative(root, selected.outputPath),
      measurement: {
        strategy: measurementRuns === 1 ? 'single-host-native-smoke' : 'lighthouse-official-median-run',
        configuredRuns: configuredMeasurementRuns,
        executedRuns: measurementRuns,
        selectedRun: selectedRunIndex + 1,
        samples: samples.map((sample, sampleIndex) => ({
          run: sampleIndex + 1,
          outputPath: path.relative(root, sample.outputPath),
          firstContentfulPaint: sample.report?.audits?.['first-contentful-paint']?.numericValue ?? null,
          interactive: sample.report?.audits?.interactive?.numericValue ?? null,
          largestContentfulPaint: sample.report?.audits?.['largest-contentful-paint']?.numericValue ?? null,
          totalBlockingTime: sample.report?.audits?.['total-blocking-time']?.numericValue ?? null,
        })),
      },
      environment: {
        benchmarkIndex: benchmarkIndexFrom(report),
        throttlingMethod: report?.configSettings?.throttlingMethod ?? null,
        configuredCpuSlowdownMultiplier: report?.configSettings?.throttling?.cpuSlowdownMultiplier ?? null,
      },
      assertions: evaluateLighthouseAssertions(report, executionAssertions),
    })
  }
} finally {
  await stopServer(server)
}

const failures = results.flatMap((result) => result.assertions
  .filter((assertion) => !assertion.passed && assertion.level === 'error')
  .map((assertion) => `${result.url}: ${assertion.key} value ${assertion.value} outside ${assertion.minScore ?? assertion.maxNumericValue}`))
const warnings = results.flatMap((result) => result.assertions
  .filter((assertion) => !assertion.passed && assertion.level === 'warn')
  .map((assertion) => `${result.url}: ${assertion.key} value ${assertion.value} outside ${assertion.minScore ?? assertion.maxNumericValue}`))
const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  config: path.relative(root, configPath),
  profile,
  cpuMode,
  measurementRuns,
  assertionPolicy: profile === 'mobile' && cpuMode === 'provided'
    ? 'host-native-structural-smoke-timing-advisory'
    : 'canonical-release-proof',
  cpuCalibration,
  ok: failures.length === 0,
  failures,
  warnings,
  results,
}
await writeFile(path.join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
if (failures.length) process.exit(1)
