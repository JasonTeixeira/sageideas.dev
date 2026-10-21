#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const evidenceDir = path.join(root, 'docs', 'evidence', 'engineering-loop');
const jsonPath = path.join(evidenceDir, 'sagebot-content-operating-loop-latest.json');
const mdPath = path.join(evidenceDir, 'sagebot-content-operating-loop-latest.md');

const BASELINE_LOCAL_GATES = [
  'git diff --check',
  'npm run discord:content-engine-proof',
  'npm run discord:evaluate-content',
  'npm run test:unit',
  'npm run build',
];

const DEPLOY_GATES = [
  'vercel deploy --prod --yes',
];

function parseArgs(argv) {
  const flags = new Set(argv);
  return {
    plan: flags.has('--plan'),
    local: flags.has('--local') || flags.has('--local-only'),
    deploy: flags.has('--deploy'),
    maxCycles: Number(argv.find((arg) => arg.startsWith('--max-cycles='))?.split('=')[1] ?? 1),
  };
}

function run(command) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    command,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode: result.status,
    ok: result.status === 0,
    stdoutTail: (result.stdout ?? '').slice(-10000),
    stderrTail: (result.stderr ?? '').slice(-10000),
  };
}

function renderMarkdown(report) {
  const phaseLines = report.phases.map((phase) => [
    `### ${phase.title}`,
    `- Key: ${phase.key}`,
    `- Status: ${phase.status}`,
    `- Score: ${phase.score}/100`,
    `- Objective: ${phase.objective}`,
    `- Missing evidence: ${phase.missingEvidence.length ? phase.missingEvidence.join(', ') : 'None'}`,
    `- Missing signals: ${phase.missingSignals.length ? phase.missingSignals.join(', ') : 'None'}`,
    `- Stop conditions: ${phase.stopConditions.join(' | ')}`,
  ].join('\n'));
  const gateLines = report.gates.map((gate) => `- ${gate.command}: ${gate.ok ? 'passed' : 'failed'} (${gate.exitCode})`);
  return [
    '# SageBot Content Operating Loop',
    '',
    `Generated: ${report.generatedAt}`,
    `Finished: ${report.finishedAt}`,
    `Status: ${report.ok ? 'passed' : 'blocked'}`,
    `Mode: ${report.mode}`,
    `Score: ${report.score}/100`,
    `Next phase: ${report.nextRecommendedPhase ?? 'none'}`,
    '',
    '## Gates',
    '',
    ...(gateLines.length ? gateLines : ['- Plan mode only. No commands were run.']),
    '',
    '## Phases',
    '',
    ...phaseLines,
    '',
    '## Failures',
    '',
    ...(report.failures.length ? report.failures.map((failure) => `- ${failure}`) : ['- None']),
    '',
    '## Boundary',
    '',
    report.authorizationPhrase,
    '',
    report.releaseMeaning,
    '',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.plan && !options.local && !options.deploy) options.plan = true;
  if (!Number.isInteger(options.maxCycles) || options.maxCycles < 1 || options.maxCycles > 3) {
    throw new Error('--max-cycles must be an integer from 1 through 3.');
  }

  const {
    buildContentOperatingLoopReport,
    validateContentOperatingLoopReport,
  } = await import('../../lib/discord/content-operating-loop.ts');

  const gates = [];
  const mode = options.deploy ? 'deploy' : options.local ? 'local' : 'plan';

  for (let cycle = 0; cycle < (options.plan ? 0 : options.maxCycles); cycle += 1) {
    for (const command of BASELINE_LOCAL_GATES) {
      const gate = run(command);
      gates.push(gate);
      if (!gate.ok) {
        cycle = options.maxCycles;
        break;
      }
    }
    if (gates.some((gate) => !gate.ok)) break;
  }

  if (options.deploy && gates.every((gate) => gate.ok)) {
    for (const command of DEPLOY_GATES) {
      const gate = run(command);
      gates.push(gate);
      if (!gate.ok) break;
    }
  }

  const report = buildContentOperatingLoopReport({
    root,
    generatedAt: new Date().toISOString(),
    mode,
  });
  const validation = validateContentOperatingLoopReport(report);
  const finalReport = {
    ...report,
    ok: report.ok && validation.ok && gates.every((gate) => gate.ok),
    finishedAt: new Date().toISOString(),
    options,
    gates,
    validation,
    failures: [
      ...report.failures,
      ...validation.failures.map((failure) => `validator:${failure}`),
      ...gates.filter((gate) => !gate.ok).map((gate) => `gate_failed:${gate.command}`),
    ],
  };

  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(finalReport, null, 2)}\n`);
  writeFileSync(mdPath, renderMarkdown(finalReport));

  console.log(JSON.stringify({
    ok: finalReport.ok,
    mode: finalReport.mode,
    score: finalReport.score,
    nextRecommendedPhase: finalReport.nextRecommendedPhase,
    failures: finalReport.failures,
    evidencePath: path.relative(root, jsonPath),
    markdownPath: path.relative(root, mdPath),
  }, null, 2));

  if (!finalReport.ok && !options.plan) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
