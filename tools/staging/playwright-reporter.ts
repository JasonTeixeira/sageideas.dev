import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'

import { buildStagingBrowserEvidence } from '../../lib/staging/browser-evidence.mjs'

export default class StagingEvidenceReporter implements Reporter {
  private discoveredTests = 0
  private readonly tests: Array<{ title: string; status: string; durationMs: number }> = []

  onBegin(_config: FullConfig, suite: Suite) {
    this.discoveredTests = suite.allTests().length
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.push({
      title: test.titlePath().slice(1).join(' › '),
      status: result.status,
      durationMs: result.duration,
    })
  }

  onEnd(result: FullResult) {
    const destination = path.resolve('docs/evidence/project-loop/staging-browser-latest.json')
    mkdirSync(path.dirname(destination), { recursive: true })
    const evidence = buildStagingBrowserEvidence({
      expected: {
        baseURL: process.env.STAGING_BASE_URL,
        deploymentId: process.env.STAGING_DEPLOYMENT_ID,
        commitSha: process.env.STAGING_EXPECTED_COMMIT,
        branch: process.env.STAGING_EXPECTED_BRANCH,
      },
      resultStatus: result.status,
      expectedTests: this.discoveredTests,
      tests: this.tests,
    })
    writeFileSync(destination, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o640 })
  }
}
