import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  buildDiscordInteractionEngineReport,
  validateDiscordInteractionEngineReport,
} from '@/lib/discord/interaction-engine';

const root = process.cwd();
const evidenceDir = path.join(root, 'docs', 'evidence', 'engineering-loop');
const jsonPath = path.join(evidenceDir, 'discord-interaction-engine-readiness-latest.json');
const mdPath = path.join(evidenceDir, 'discord-interaction-engine-readiness-latest.md');

function renderMarkdown(report: ReturnType<typeof buildDiscordInteractionEngineReport>, validationFailures: string[]): string {
  return [
    '# Discord Interaction Engine Readiness',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.ok && validationFailures.length === 0 ? 'ready' : 'blocked'}`,
    `Lanes: ${report.laneCount} (${report.dailyLaneCount} daily, ${report.weeklyLaneCount} weekly)`,
    `Content factory slots: ${report.contentFactorySlotCount}`,
    '',
    '## Operating Loop',
    '',
    ...report.operatingLoop.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Lanes',
    '',
    ...report.lanes.map((lane) => `- ${lane.label} -> #${lane.channel}: ${lane.memberAction}`),
    '',
    '## Failures',
    '',
    ...(validationFailures.length ? validationFailures.map((failure) => `- ${failure}`) : ['- None']),
    '',
    '## Boundary',
    '',
    report.releaseMeaning,
    '',
  ].join('\n');
}

async function main() {
  const report = buildDiscordInteractionEngineReport();
  const validation = validateDiscordInteractionEngineReport(report);
  const evidence = {
    ...report,
    validation,
  };
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(mdPath, renderMarkdown(report, validation.failures));
  console.log(JSON.stringify({
    ok: report.ok && validation.ok,
    status: report.ok && validation.ok ? 'interaction_engine_ready' : 'interaction_engine_blocked',
    laneCount: report.laneCount,
    dailyLaneCount: report.dailyLaneCount,
    weeklyLaneCount: report.weeklyLaneCount,
    contentFactorySlotCount: report.contentFactorySlotCount,
    failures: validation.failures,
    evidencePath: path.relative(root, jsonPath),
    markdownPath: path.relative(root, mdPath),
  }, null, 2));
  if (!report.ok || !validation.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
