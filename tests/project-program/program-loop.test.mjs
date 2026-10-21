import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  PROGRAM_VERSION,
  SAFE_LOCAL_COMMANDS,
  WORKSTREAM_GRAPH,
  assertSafeCommands,
  auditContractFixture,
  buildCanonicalInventory,
  buildProductionReadinessBoard,
  buildRemediationBacklog,
  buildTaskPacket,
  classifyDependencyAudit,
  createProgramState,
  isCanonicalProjectFile,
  recordFailure,
  recordGreenCheckpoint,
  topologicalWorkstreams,
  validateGreenEvidence,
  validateProgramState,
} from '../../tools/project-program/core.mjs'

const fixture = (name) => JSON.parse(
  readFileSync(`tests/project-program/fixtures/${name}.json`, 'utf8'),
)

const generatedAt = '2026-09-04T12:00:00.000Z'

test('canonical inventory excludes generated evidence that verification commands rewrite', () => {
  assert.equal(isCanonicalProjectFile('app/page.tsx'), true)
  assert.equal(isCanonicalProjectFile('docs/academy/CONTROLLED_LAB_EVALUATOR.md'), true)
  assert.equal(isCanonicalProjectFile('docs/evidence/project-loop/observations-latest.json'), false)
  assert.equal(isCanonicalProjectFile('docs/evidence/academy/certification-v2/2026-09-05.json'), false)
  assert.equal(isCanonicalProjectFile('.next/server/app/page.js'), false)
})

test('known-good contract passes and deliberately broken fixture fails closed', () => {
  const good = auditContractFixture(fixture('known-good'))
  const broken = auditContractFixture(fixture('deliberately-broken'))

  assert.deepEqual(good.findings, [])
  assert.equal(good.ok, true)
  assert.equal(broken.ok, false)
  assert(broken.findings.some((finding) => finding.code === 'required_script_missing'))
  assert(broken.findings.some((finding) => finding.code === 'duplicate_migration_version'))
  assert(broken.findings.some((finding) => finding.code === 'dependency_cycle'))
  assert(broken.findings.some((finding) => finding.code === 'unsafe_command'))
  assert(broken.findings.some((finding) => finding.code === 'academy_certification_unproven'))
  assert(broken.findings.some((finding) => finding.code === 'lab_trust_unproven'))
})

test('canonical inventory is deterministic, hashed, and classifies project surfaces', () => {
  const input = {
    files: [
      'tests/unit/z.test.ts',
      'app/api/health/route.ts',
      'supabase/migrations/0002_profiles.sql',
      'app/academy/catalog/page.tsx',
      'app/page.tsx',
      'supabase/migrations/0001_accounts.sql',
      'tests/e2e/a.spec.ts',
      'app/api/checkout/route.ts',
    ],
    packageJson: fixture('known-good'),
    academyRegistry: { registryVersion: 'sha256:academy', totals: { courses: 32, lessons: 640, labBlocks: 640 } },
    git: { head: 'abc123', branch: 'production/test' },
    generatedAt,
  }
  const left = buildCanonicalInventory(input)
  const right = buildCanonicalInventory({ ...input, files: [...input.files].reverse() })

  assert.equal(left.programVersion, PROGRAM_VERSION)
  assert.equal(left.inventoryHash, right.inventoryHash)
  assert.deepEqual(left.files, [...input.files].sort())
  assert.deepEqual(left.counts, {
    trackedFiles: 8,
    appPages: 2,
    routeHandlers: 2,
    apiRoutes: 2,
    migrations: 2,
    tests: 2,
    academyCourses: 32,
    academyLessons: 640,
    academyLabs: 640,
  })
  assert.equal(left.migrations[0].version, '0001')
  assert.equal(left.trust.academyCertification, 'uncertified')
  assert.equal(left.trust.labTrust, 'untrusted_current_runtime')
})

test('workstream dependency graph covers all safe work before external boundaries', () => {
  const queue = topologicalWorkstreams(WORKSTREAM_GRAPH)
  const byId = new Map(queue.map((item) => [item.id, item]))
  const firstExternal = queue.findIndex((item) => item.boundary !== 'safe_local')

  assert.equal(new Set(queue.map((item) => item.id)).size, WORKSTREAM_GRAPH.length)
  assert(firstExternal > 0)
  assert(queue.slice(0, firstExternal).every((item) => item.boundary === 'safe_local'))
  assert(queue.slice(firstExternal).every((item) => item.boundary !== 'safe_local'))
  for (const item of queue) {
    for (const dependency of item.dependsOn) {
      assert(byId.has(dependency))
      assert(byId.get(dependency).sequence < item.sequence)
    }
  }
})

test('persistent state and task packet bind work to inventory and retain trust boundaries', () => {
  const inventory = buildCanonicalInventory({
    files: fixture('known-good').files,
    packageJson: fixture('known-good'),
    academyRegistry: { registryVersion: 'sha256:academy', totals: { courses: 32, lessons: 640, labs: 640 } },
    git: { head: 'abc123', branch: 'production/test' },
    generatedAt,
  })
  const state = createProgramState({ inventory, generatedAt })
  const packet = buildTaskPacket({ inventory, state, generatedAt })

  assert.equal(state.programVersion, PROGRAM_VERSION)
  assert.equal(state.inventoryHash, inventory.inventoryHash)
  assert.equal(state.current.workstreamId, 'repository-foundation')
  assert.equal(state.trustBoundary.academyCertification, 'uncertified')
  assert.equal(state.trustBoundary.labTrust, 'untrusted_current_runtime')
  assert.deepEqual(validateProgramState(state, inventory), [])
  assert.equal(packet.workstream.id, state.current.workstreamId)
  assert.equal(packet.inventoryHash, inventory.inventoryHash)
  assert.equal(packet.mutationBoundary, 'safe_local_only')
  assert(packet.definitionOfGreen.some((gate) => gate.id === 'unit-tests'))
  assert.doesNotThrow(() => assertSafeCommands(packet.commands))
})

test('repeated identical failure blocks on the third observation, not before', () => {
  const inventory = buildCanonicalInventory({
    files: fixture('known-good').files,
    packageJson: fixture('known-good'),
    academyRegistry: null,
    git: { head: 'abc123', branch: 'production/test' },
    generatedAt,
  })
  const initial = createProgramState({ inventory, generatedAt })
  const once = recordFailure(initial, { fingerprint: 'unit:discord', summary: 'same failure', generatedAt })
  const twice = recordFailure(once, { fingerprint: 'unit:discord', summary: 'same failure', generatedAt })
  const thrice = recordFailure(twice, { fingerprint: 'unit:discord', summary: 'same failure', generatedAt })

  assert.equal(once.status, 'active')
  assert.equal(twice.status, 'active')
  assert.equal(thrice.status, 'blocked')
  assert.equal(thrice.stopReason.code, 'repeated_failure_boundary')
  assert.equal(thrice.current.repeatedFailureCount, 3)
})

test('GREEN checkpoints fail closed, advance sequentially, and stop before external mutation', () => {
  const inventory = buildCanonicalInventory({
    files: fixture('known-good').files,
    packageJson: fixture('known-good'),
    academyRegistry: null,
    git: { head: 'abc123', branch: 'production/test' },
    generatedAt,
  })
  let state = createProgramState({ inventory, generatedAt })
  const evidenceFor = (workstreamId) => ({
    programVersion: PROGRAM_VERSION,
    inventoryHash: inventory.inventoryHash,
    workstreamId,
    commit: '0123456789abcdef',
    gates: {
      focusedTests: { status: 'pass' },
      unitTests: { status: 'pass' },
      typecheck: { status: 'pass' },
      lint: { status: 'pass' },
      build: { status: 'pass' },
      diffCheck: { status: 'pass' },
      securityReview: { status: 'pass' },
    },
    academyCertification: 'uncertified',
    labTrust: 'untrusted_current_runtime',
  })

  assert.deepEqual(validateGreenEvidence(state, evidenceFor(state.current.workstreamId)), [])
  assert(validateGreenEvidence(state, {
    ...evidenceFor(state.current.workstreamId),
    gates: { ...evidenceFor(state.current.workstreamId).gates, build: { status: 'fail' } },
  }).some((error) => error.includes('build')))
  assert(validateGreenEvidence(state, {
    ...evidenceFor(state.current.workstreamId),
    academyCertification: 'certified',
  }).some((error) => error.includes('academyCertification')))

  while (state.current?.boundary === 'safe_local') {
    state = recordGreenCheckpoint(state, evidenceFor(state.current.workstreamId), generatedAt)
  }

  assert.equal(state.status, 'blocked')
  assert.equal(state.stopReason.code, 'external_approval_boundary')
  assert.equal(state.current.boundary, 'external_approval')
  assert.equal(state.trustBoundary.academyCertification, 'uncertified')
  assert.equal(state.trustBoundary.labTrust, 'untrusted_current_runtime')
})

test('readiness board and remediation backlog are deterministic and severity ranked', () => {
  const inventory = buildCanonicalInventory({
    files: fixture('known-good').files,
    packageJson: fixture('known-good'),
    academyRegistry: { registryVersion: 'sha256:academy', totals: { courses: 32, lessons: 640, labs: 640 } },
    git: { head: 'abc123', branch: 'production/test' },
    generatedAt,
  })
  const state = createProgramState({ inventory, generatedAt })
  const findings = [
    { code: 'npm_audit_high', severity: 'high', workstreamId: 'build-quality', summary: '19 high vulnerabilities' },
    { code: 'unit_suite_failed', severity: 'critical', workstreamId: 'build-quality', summary: '16 unit failures' },
    { code: 'human_review_pending', severity: 'medium', workstreamId: 'human-beta-certification', summary: 'Human beta is pending' },
  ]
  const board = buildProductionReadinessBoard({ inventory, state, findings, generatedAt })
  const backlog = buildRemediationBacklog({ board, generatedAt })

  assert.equal(board.inventoryHash, inventory.inventoryHash)
  assert.equal(board.overallStatus, 'not_local_production_candidate')
  assert.equal(board.trust.academyCertification, 'uncertified')
  assert.deepEqual(backlog.items.map((item) => item.severity), ['critical', 'high', 'medium'])
  assert.deepEqual(backlog.items.map((item) => item.rank), [1, 2, 3])
})

test('dependency audit blocks production risk while preserving dev-only exceptions as evidence', () => {
  const audit = classifyDependencyAudit({
    all: { critical: 0, high: 6, moderate: 0, low: 0, total: 6 },
    production: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
    devExceptions: [{ package: '@lhci/cli', reason: 'Upstream Lighthouse toolchain has no non-breaking patched release.' }],
  })

  assert.equal(audit.ok, true)
  assert.equal(audit.production.ok, true)
  assert.equal(audit.devOnly.ok, false)
  assert.equal(audit.devOnly.exceptionCount, 1)

  const exposed = classifyDependencyAudit({
    all: { critical: 0, high: 1, moderate: 0, low: 0, total: 1 },
    production: { critical: 0, high: 1, moderate: 0, low: 0, total: 1 },
    devExceptions: [],
  })
  assert.equal(exposed.ok, false)

  const clean = classifyDependencyAudit({
    all: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
    production: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
    devExceptions: [{ package: 'obsolete-exception', reason: 'No longer applicable.' }],
  })
  assert.equal(clean.devOnly.exceptionCount, 0)
  assert.deepEqual(clean.devOnly.exceptions, [])
})

test('package scripts expose the complete local program control surface', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  const expected = {
    'test:admin': 'tsx --test tests/admin/admin-integrity.test.ts && npm run audit:admin',
    'audit:admin': 'tsx tools/admin/write-audit.ts',
    'test:communications': 'tsx --test tests/communications/communications-integrity.test.ts && npm run test:communications:sql && npm run discord:durable-jobs-readiness && npm run discord:security-privacy-readiness && npm run discord:observability-quality-readiness && npm run audit:communications',
    'test:communications:sql': 'node tools/communications/run-sql-integration.mjs',
    'audit:communications': 'tsx tools/communications/write-audit.ts',
    'test:observability-recovery': 'tsx --test tests/observability-recovery/observability-recovery.test.ts && npm run audit:observability-recovery',
    'audit:observability-recovery': 'tsx tools/observability-recovery/write-audit.ts',
    'test:release-readiness': 'node --test tests/release-readiness/release-readiness.test.mjs',
    'audit:release-readiness': 'node tools/release-readiness/write-manifest.mjs',
    'test:academy-production': 'npm run academy:audit:test && npm run academy:audit:all && npm run academy:program:verify && npm run academy:registry:verify && npm run academy:lab-evaluator:test',
    'project:program:inventory': 'node tools/project-program/cli.mjs inventory',
    'project:program:plan': 'node tools/project-program/cli.mjs plan',
    'project:program:once': 'node tools/project-program/cli.mjs once',
    'project:program:status': 'node tools/project-program/cli.mjs status',
    'project:program:verify': 'npm run project:program:test && node tools/project-program/cli.mjs verify',
    'project:program:test': 'node --test tests/project-program/program-loop.test.mjs',
    'project:program:observe': 'node tools/project-program/cli.mjs observe',
    'project:program:checkpoint': 'node tools/project-program/cli.mjs checkpoint',
    'project:program:fail': 'node tools/project-program/cli.mjs fail',
    'project:release:verify': 'node tools/project-program/cli.mjs release-verify',
    'test:staging:http': 'node --test tests/staging/staging-http-audit.test.mjs',
    'test:staging:contracts': 'node --test tests/staging/*.test.mjs',
    'staging:http:verify': 'node tools/staging/verify-http.mjs',
    'staging:rollback:verify': 'node tools/staging/verify-rollback.mjs',
    'staging:readiness:audit': 'node tools/staging/write-production-readiness-audit.mjs',
  }

  for (const [name, command] of Object.entries(expected)) {
    assert.equal(packageJson.scripts?.[name], command, `missing or changed package script: ${name}`)
  }

  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:academy-production'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:admin'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:communications'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:accessibility-performance'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:accessibility-performance:e2e'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:observability-recovery'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:release-readiness'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:staging:contracts'))
  const programCli = readFileSync('tools/project-program/cli.mjs', 'utf8')
  assert.match(programCli, /rm\(paths\.task,\s*\{\s*force:\s*true\s*\}\)/, 'boundary transitions must remove stale safe-local task packets')
})

test('build tooling uses the supported Node runtime and has no vulnerable legacy wrappers', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  const workflows = [
    '.github/workflows/ci.yml',
    '.github/workflows/e2e.yml',
    '.github/workflows/prod-synthetic-monitor.yml',
    '.github/workflows/i18n.yml',
    '.github/workflows/qa-portfolio-verification.yml',
    '.github/workflows/sage-gate.yml',
    '.github/workflows/quality-snapshot.yml',
    '.github/workflows/qa-metrics-template.yml',
  ].map((file) => readFileSync(file, 'utf8')).join('\n')
  const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8')
  const e2eWorkflow = readFileSync('.github/workflows/e2e.yml', 'utf8')
  const sageGateWorkflow = readFileSync('.github/workflows/sage-gate.yml', 'utf8')
  const staticServer = readFileSync('scripts/serve-export.mjs', 'utf8')
  const lighthouseRunner = readFileSync('scripts/qa/run-lighthouse-config.mjs', 'utf8')
  const googleAnalytics = readFileSync('components/analytics/google-analytics.tsx', 'utf8')
  const posthogProvider = readFileSync('components/analytics/posthog-provider.tsx', 'utf8')
  const localeProvider = readFileSync('components/i18n/locale-provider.tsx', 'utf8')
  const rootLayout = readFileSync('app/layout.tsx', 'utf8')
  const academyHome = readFileSync('components/academy/landing/SageHome.tsx', 'utf8')
  const heroLabLauncher = readFileSync('components/academy/landing/HeroLabLauncher.tsx', 'utf8')
  const deferredVideoSection = readFileSync('components/academy/landing/DeferredVideoSection.tsx', 'utf8')
  const heroTicker = readFileSync('components/academy/landing/HeroTicker.tsx', 'utf8')
  const academyChrome = readFileSync('components/academy/landing/AcademyChrome.tsx', 'utf8')
  const newsletterSignup = readFileSync('components/academy/landing/NewsletterSignup.tsx', 'utf8')
  const sageChat = readFileSync('components/academy/landing/SageChat.tsx', 'utf8')
  const sageChatPanel = readFileSync('components/academy/landing/SageChatPanel.tsx', 'utf8')
  const academyAnalytics = readFileSync('components/academy/landing/academyAnalytics.ts', 'utf8')
  const atlasLauncher = readFileSync('components/academy/atlas/AtlasLauncher.tsx', 'utf8')
  const ogRoutes = [readFileSync('app/og/route.tsx', 'utf8'), readFileSync('app/og/academy/route.tsx', 'utf8')].join('\n')

  assert.equal(packageJson.engines?.node, '>=22.19.0')
  assert.equal(packageJson.devDependencies?.['@lhci/cli'], undefined)
  assert.equal(packageJson.devDependencies?.['http-server'], undefined)
  assert.equal(packageJson.devDependencies?.lighthouse, '13.4.1')
  assert.doesNotMatch(workflows, /node-version:\s*['"]?20/)
  assert.doesNotMatch(workflows, /@lhci\/cli/)
  assert.doesNotMatch(ciWorkflow, /continue-on-error:\s*true/)
  assert.match(
    ciWorkflow,
    /name:\s*Production smoke verification\s*\n\s+if:\s*github\.event_name != 'pull_request'\s*\n\s+run:\s*npm run verify:prod/,
    'pull requests must not verify or depend on the live production deployment',
  )
  assert.doesNotMatch(
    e2eWorkflow,
    /https:\/\/(?:qa-portfolio-sage-ideas\.vercel\.app|www\.sageideas\.dev)/,
    'CI E2E must never target a production or production-project URL',
  )
  assert.match(e2eWorkflow, /run:\s*npm run test:critical-journeys:e2e/)
  assert.doesNotMatch(e2eWorkflow, /run:\s*npm run test:e2e(?:\s|$)/)
  assert.match(
    sageGateWorkflow,
    /name:\s*gitleaks[\s\S]*?env:\s*\n\s+GITHUB_TOKEN:\s*\$\{\{\s*secrets\.GITHUB_TOKEN\s*\}\}/,
    'pull-request secret scanning must receive the least-privilege automatic GitHub token',
  )
  assert.doesNotMatch(staticServer, /\b(?:npx|http-server|spawn)\b/)
  assert.match(lighthouseRunner, /node_modules.*\.bin.*lighthouse/)
  assert.match(lighthouseRunner, /listen\(0/)
  assert.match(lighthouseRunner, /environment\?\.benchmarkIndex/)
  assert.match(lighthouseRunner, /calculateCpuSlowdownMultiplier/)
  assert.match(lighthouseRunner, /resolveCpuExecutionMode/)
  assert.match(lighthouseRunner, /computeMedianRun/)
  assert.match(lighthouseRunner, /measurementRuns/)
  assert.match(lighthouseRunner, /assertionsForExecutionMode/)
  assert.match(
    ciWorkflow,
    /name:\s*Verify committed calibrated mobile proof\s*\n\s*run:\s*npm run project:release:verify/,
  )
  assert.match(
    ciWorkflow,
    /lighthouse-mobile:[\s\S]*?uses:\s*actions\/checkout@v4\s*\n\s*with:\s*\n\s*fetch-depth:\s*0/,
  )
  assert.match(
    ciWorkflow,
    /name:\s*Run Lighthouse mobile shared-runner smoke[\s\S]*?LIGHTHOUSE_CPU_MODE:\s*provided[\s\S]*?run:\s*npm run test:lh:config:mobile/,
  )
  assert.match(
    googleAnalytics,
    /googletagmanager\.com\/gtag\/js[\s\S]*?strategy="lazyOnload"/,
    'third-party analytics must not compete with initial page interactivity',
  )
  assert.match(googleAnalytics, /NEXT_PUBLIC_GA4_REQUIRE_CONSENT !== 'false'/)
  assert.match(
    googleAnalytics,
    /\{canLoadAnalytics && \([\s\S]*?googletagmanager\.com\/gtag\/js/,
    'Google Analytics must fail closed until explicit consent',
  )
  assert.doesNotMatch(posthogProvider, /^import posthog from ['"]posthog-js['"]/m)
  assert.match(posthogProvider, /import\(['"]posthog-js['"]\)/)
  assert.doesNotMatch(localeProvider, /import\s+\{[^}]*\btranslate\b[^}]*\}\s+from\s+['"]@\/lib\/i18n\/messages['"]/)
  assert.match(localeProvider, /import\s+type\s+\{\s*Messages\s*\}\s+from\s+['"]@\/lib\/i18n\/messages['"]/)
  assert.match(rootLayout, /getClientMessages\(locale\)/)
  assert.doesNotMatch(academyHome, /<SplashIntro\b/, 'the first visit must not block learning content behind a timed splash')
  assert.doesNotMatch(academyHome, /from ['"]\.\/HeroLab['"]|from ['"]\.\/VideoSection['"]/, 'heavy homepage interactions must not hydrate before learner intent')
  assert.match(academyHome, /<HeroLabLauncher\b/)
  assert.match(academyHome, /<DeferredVideoSection\b/)
  assert.match(heroLabLauncher, /lazy\([\s\S]*?import\(['"]\.\/HeroLab['"]\)/)
  assert.match(deferredVideoSection, /IntersectionObserver/)
  assert.match(deferredVideoSection, /lazy\([\s\S]*?import\(['"]\.\/VideoSection['"]\)/)
  assert.doesNotMatch(heroTicker, /^['"]use client['"]/m, 'truthful ticker copy must render without client-side rotation')
  assert.doesNotMatch(academyChrome, /^['"]use client['"]/m, 'academy navigation and footer chrome must render on the server')
  assert.doesNotMatch(academyChrome, /\buseState\b|\buseT\b/, 'chrome hover and translation must not hydrate the whole footer')
  assert.doesNotMatch(academyChrome, /\bLocaleLink\b/, 'static academy links must not each become a client island')
  assert.match(academyChrome, /\bgetT\b/)
  assert.match(academyChrome, /\blocalizeHref\b/)
  assert.match(academyChrome, /<NewsletterSignup\b/)
  assert.match(newsletterSignup, /^['"]use client['"]/m, 'only the interactive newsletter form should hydrate')
  assert.match(newsletterSignup, /\/api\/newsletter\/subscribe/)
  assert.doesNotMatch(`${sageChat}\n${sageChatPanel}\n${academyAnalytics}`, /^import posthog from ['"]posthog-js['"]/m, 'academy analytics must not eagerly load the PostHog client')
  assert.match(academyAnalytics, /import\(['"]posthog-js['"]\)/)
  assert.doesNotMatch(sageChatPanel, /question:\s*text/, 'free-form chat text must not be copied into analytics')
  assert.match(sageChat, /lazy\([\s\S]*?import\(['"]\.\/SageChatPanel['"]\)/)
  assert.doesNotMatch(sageChat, /const REPLIES\b/, 'chat reply engine must load only after learner intent')
  assert.match(sageChatPanel, /const REPLIES\b/)
  assert.doesNotMatch(atlasLauncher, /AUTO_OPEN_DELAY|\buseEffect\b|import\s+\{\s*AtlasIntake\s*\}/)
  assert.match(atlasLauncher, /lazy\([\s\S]*?import\(['"]\.\/AtlasIntake['"]\)/)
  assert.doesNotMatch(ogRoutes, /runtime\s*=\s*['"]edge['"]/)
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:lh:config'))
  assert.ok(SAFE_LOCAL_COMMANDS.includes('npm run test:lh:config:mobile'))
})
