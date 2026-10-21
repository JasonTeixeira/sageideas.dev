import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter'

export default class AccessibilityPerformanceReporter implements Reporter {
  private expected = 0
  private readonly tests: Array<{ title: string; status: string; durationMs: number }> = []

  onBegin(_config: FullConfig, suite: Suite) {
    this.expected = suite.allTests().length
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.push({
      title: test.titlePath().slice(1).join(' › '),
      status: result.status,
      durationMs: result.duration,
    })
  }

  onEnd(result: FullResult) {
    const destination = path.resolve('docs/evidence/project-loop/accessibility-browser-results.json')
    mkdirSync(path.dirname(destination), { recursive: true })
    const passed = this.tests.filter((test) => test.status === 'passed').length
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status: result.status,
      expected: this.expected,
      passed,
      failed: this.tests.filter((test) => !['passed', 'skipped'].includes(test.status)).length,
      tests: this.tests,
    }
    writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`)
  }
}
