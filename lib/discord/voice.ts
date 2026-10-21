import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';

export type SproutVoiceResult = {
  ok: true;
  provider: 'macos-say' | 'piper';
  filename: string;
  mimeType: 'audio/mpeg';
  bytes: Buffer;
} | {
  ok: false;
  reason: 'not_configured' | 'synthesis_failed' | 'text_invalid';
  message: string;
};

const MAX_TTS_CHARS = 700;

function cleanText(input: string): string {
  return input
    .replace(/<@!?\d+>/g, '')
    .replace(/[`*_#>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TTS_CHARS);
}

function run(command: string, args: string[], options: { input?: string } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}: ${stderr.slice(0, 500)}`));
    });
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

function voiceProvider(): 'macos-say' | 'piper' | null {
  if (process.env.SPROUT_TTS_PROVIDER === 'piper') return 'piper';
  if (process.env.SPROUT_TTS_PROVIDER === 'macos-say') return 'macos-say';
  if (process.platform === 'darwin') return 'macos-say';
  if (process.env.PIPER_BIN && process.env.PIPER_VOICE_MODEL) return 'piper';
  if (bundledPiperBin() && bundledPiperModel()) return 'piper';
  return null;
}

function bundledPiperBin(): string | null {
  const candidate = path.join(process.cwd(), 'bin', 'piper', 'piper');
  return existsSync(candidate) ? candidate : null;
}

function bundledPiperModel(): string | null {
  const candidate = path.join(process.cwd(), 'voices', 'sprout.onnx');
  return existsSync(candidate) ? candidate : null;
}

function ffmpegBin(): string {
  const configured = process.env.FFMPEG_BIN?.trim();
  if (configured) return configured;
  if (ffmpegStatic && existsSync(ffmpegStatic)) return ffmpegStatic;
  return 'ffmpeg';
}

async function synthesizeWithMacSay(text: string, dir: string): Promise<Buffer> {
  const aiffPath = path.join(dir, 'sprout.aiff');
  const mp3Path = path.join(dir, 'sprout.mp3');
  const voice = process.env.SPROUT_MACOS_VOICE || 'Samantha';
  await run('/usr/bin/say', ['-v', voice, '-o', aiffPath, text]);
  await run(ffmpegBin(), ['-y', '-i', aiffPath, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3Path]);
  return readFile(mp3Path);
}

async function synthesizeWithPiper(text: string, dir: string): Promise<Buffer> {
  const piperBin = process.env.PIPER_BIN?.trim() || bundledPiperBin();
  const model = process.env.PIPER_VOICE_MODEL?.trim() || bundledPiperModel();
  if (!piperBin || !model) throw new Error('PIPER_BIN and PIPER_VOICE_MODEL are required for Piper TTS.');
  const wavPath = path.join(dir, 'sprout.wav');
  const mp3Path = path.join(dir, 'sprout.mp3');
  await run(piperBin, ['--model', model, '--output_file', wavPath], { input: text });
  await run(ffmpegBin(), ['-y', '-i', wavPath, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3Path]);
  return readFile(mp3Path);
}

export async function synthesizeSproutVoice(input: {
  text: string;
  filename?: string;
}): Promise<SproutVoiceResult> {
  const text = cleanText(input.text);
  if (text.length < 3) {
    return { ok: false, reason: 'text_invalid', message: 'Give Sprout at least a few words to say.' };
  }

  const provider = voiceProvider();
  if (!provider) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'Sprout voice is not configured on this server yet. Free setup path: install Piper, set PIPER_BIN and PIPER_VOICE_MODEL, then redeploy.',
    };
  }

  const dir = await mkdtemp(path.join(tmpdir(), 'sprout-voice-'));
  try {
    const bytes = provider === 'macos-say'
      ? await synthesizeWithMacSay(text, dir)
      : await synthesizeWithPiper(text, dir);
    return {
      ok: true,
      provider,
      filename: input.filename || 'sprout.mp3',
      mimeType: 'audio/mpeg',
      bytes,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'synthesis_failed',
      message: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
