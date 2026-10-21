import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { synthesizeSproutVoice } from '../../lib/discord/voice';

const evidenceDir = path.join(process.cwd(), 'docs', 'evidence', 'discord');

async function main() {
  const startedAt = new Date().toISOString();
  const result = await synthesizeSproutVoice({
    text: 'Hey, I am Sprout. Bring me the messy version and I will help you find the next clean move.',
    filename: 'sprout-smoke.mp3',
  });
  const evidence = {
    ok: result.ok,
    provider: result.ok ? result.provider : null,
    filename: result.ok ? result.filename : null,
    mimeType: result.ok ? result.mimeType : null,
    bytes: result.ok ? result.bytes.length : 0,
    reason: result.ok ? null : result.reason,
    message: result.ok ? null : result.message,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, 'sprout-voice-smoke.json');
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));
  if (!evidence.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  const evidence = {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    finishedAt: new Date().toISOString(),
  };
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = path.join(evidenceDir, 'sprout-voice-smoke.json');
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.error(JSON.stringify({ ...evidence, evidencePath }, null, 2));
  process.exit(1);
});
