#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const evidenceDir = path.join(root, 'docs', 'evidence', 'engineering-loop');
const jsonPath = path.join(evidenceDir, 'sprout-voice-production-readiness-latest.json');
const mdPath = path.join(evidenceDir, 'sprout-voice-production-readiness-latest.md');

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : '';
}

function hasAll(text, patterns) {
  return patterns.every((pattern) => text.includes(pattern));
}

function localEvidence() {
  const fullPath = path.join(root, 'docs/evidence/discord/sprout-voice-smoke.json');
  if (!existsSync(fullPath)) return null;
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch {
    return null;
  }
}

const dockerfile = read('Dockerfile.worker');
const voiceSource = read('lib/discord/voice.ts');
const commandSource = read('lib/discord/sage-commands.ts');
const registerSource = read('scripts/discord/register-sage-commands.mjs');
const smoke = localEvidence();

const checks = [
  {
    key: 'local_voice_smoke_passed',
    passed: smoke?.ok === true && Number(smoke?.bytes ?? 0) > 1000,
    evidence: `provider=${smoke?.provider ?? 'missing'} bytes=${smoke?.bytes ?? 0}`,
    recovery: 'Run npm run discord:smoke-sprout-voice locally and fix synthesis failures.',
  },
  {
    key: 'piper_provider_wired',
    passed: hasAll(voiceSource, ['SPROUT_TTS_PROVIDER', 'PIPER_BIN', 'PIPER_VOICE_MODEL', 'synthesizeWithPiper']),
    evidence: 'lib/discord/voice.ts supports Piper env-based synthesis.',
    recovery: 'Keep the Piper provider path wired before deploying voice commands.',
  },
  {
    key: 'discord_voice_commands_registered',
    passed: hasAll(commandSource, ["name: 'speak'", "name: 'voice-summary'"])
      && hasAll(registerSource, ["name: 'speak'", "name: 'voice-summary'"]),
    evidence: 'Slash command definitions and registration include speak and voice-summary.',
    recovery: 'Add voice commands to both sage-commands.ts and register-sage-commands.mjs.',
  },
  {
    key: 'worker_image_has_ffmpeg',
    passed: /apt-get.*install[\s\S]*ffmpeg/.test(dockerfile) || dockerfile.includes('FFMPEG_BIN'),
    evidence: 'Dockerfile.worker should install ffmpeg for MP3 conversion.',
    recovery: 'Install ffmpeg in Dockerfile.worker or set FFMPEG_BIN to a bundled binary.',
  },
  {
    key: 'worker_image_documents_piper_paths',
    passed: hasAll(dockerfile, ['SPROUT_TTS_PROVIDER', 'PIPER_BIN', 'PIPER_VOICE_MODEL']),
    evidence: 'Dockerfile.worker documents production Piper env paths.',
    recovery: 'Set SPROUT_TTS_PROVIDER=piper, PIPER_BIN, and PIPER_VOICE_MODEL in Railway.',
  },
  {
    key: 'piper_binary_asset_present',
    passed: existsSync(path.join(root, 'bin', 'piper', 'piper')),
    evidence: 'Expected production binary path: bin/piper/piper',
    recovery: 'Add the Linux Piper binary at bin/piper/piper or change PIPER_BIN to the deployed binary path.',
  },
  {
    key: 'piper_voice_model_present',
    passed: existsSync(path.join(root, 'voices', 'sprout.onnx')),
    evidence: 'Expected production model path: voices/sprout.onnx',
    recovery: 'Add the selected professional Piper ONNX voice model as voices/sprout.onnx, plus its JSON config if required by the chosen voice.',
  },
];

const failures = checks.filter((check) => !check.passed).map((check) => check.key);
const evidence = {
  ok: failures.length === 0,
  version: 'sprout-voice-production-readiness-v1',
  generatedAt: new Date().toISOString(),
  mutationMode: 'local_file_evidence_only',
  releaseMeaning: 'This proves local voice synthesis and production wiring readiness. It does not prove Railway has a Piper binary/model until /speak returns a live Discord audio attachment from production.',
  checks,
  failures,
  requiredRailwayEnv: {
    SPROUT_TTS_PROVIDER: 'piper',
    PIPER_BIN: '/app/bin/piper/piper',
    PIPER_VOICE_MODEL: '/app/voices/<selected-professional-voice>.onnx',
    FFMPEG_BIN: '/usr/bin/ffmpeg',
  },
  professionalVoiceRecommendation: [
    'Use a medium/high quality en_US Piper voice first, then compare live Discord clips for warmth, pacing, and intelligibility.',
    'Keep voice notes short: 10-25 seconds. Long synthesized lectures feel worse in Discord.',
    'Use /voice-summary for recaps and /speak for short personality moments, not every answer.',
  ],
  liveProofRequired: [
    'Deploy worker/runtime with Piper binary and selected voice model.',
    'Set Railway env vars for Piper paths.',
    'Run /speak in Discord and confirm Sprout attaches an MP3.',
    'Store live message id, filename, byte size, and provider in evidence.',
  ],
};

mkdirSync(evidenceDir, { recursive: true });
writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
writeFileSync(mdPath, [
  '# Sprout Voice Production Readiness',
  '',
  `Generated: ${evidence.generatedAt}`,
  `Status: ${evidence.ok ? 'ready' : 'blocked'}`,
  '',
  '## Checks',
  '',
  ...checks.map((check) => `- ${check.key}: ${check.passed ? 'passed' : 'blocked'} — ${check.evidence}`),
  '',
  '## Required Railway Env',
  '',
  ...Object.entries(evidence.requiredRailwayEnv).map(([key, value]) => `- ${key}=${value}`),
  '',
  '## Live Proof Required',
  '',
  ...evidence.liveProofRequired.map((item) => `- ${item}`),
  '',
].join('\n'));

console.log(JSON.stringify({
  ok: evidence.ok,
  failures,
  evidencePath: path.relative(root, jsonPath),
  markdownPath: path.relative(root, mdPath),
}, null, 2));
