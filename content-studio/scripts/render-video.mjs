// render-video.mjs — the render engine.
// composition (window.__scene(i)) + per-scene VO durations  ->  synced MP4.
// Playwright captures each beat as a still; ffmpeg gives it a slow push-in,
// crossfades the beats, and muxes the narration track. Sync Law by construction:
// beat i is on screen for exactly the length of VO clip i.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > -1 ? process.argv[i + 1] : d; };

const comp   = resolve(ROOT, arg('comp', 'video/rag-flagship.html'));
const durs   = JSON.parse(arg('durations', process.env.VO_DURATIONS || '[]')); // seconds, one per scene
const audio  = resolve(ROOT, arg('audio', 'renders/video/vo-full.mp3'));
const out    = resolve(ROOT, arg('out', 'renders/video/rag.mp4'));
const W = +arg('w', 1920), H = +arg('h', 1080), FPS = 30, XF = 0.45; // crossfade seconds

const work = resolve(ROOT, 'renders/video/_work');
rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
const q = s => `'${String(s).replace(/'/g, "'\\''")}'`;
const sh = c => execSync(c, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

if (!durs.length) { console.error('no --durations'); process.exit(1); }
console.log(`▸ ${durs.length} beats · ${durs.reduce((a, b) => a + b, 0).toFixed(1)}s · ${W}x${H}`);

// 1) capture one clean still per beat (no caption crawl, no chrome)
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + comp, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts && document.fonts.ready);
await page.addStyleTag({ content: `#cap,.cap,#startbtn,.brand,.logo,.wordmark{opacity:0!important;visibility:hidden!important}
  body{background:#0B0B0E!important}` });
for (let i = 0; i < durs.length; i++) {
  await page.evaluate(n => window.__scene(n), i);
  await page.waitForTimeout(900); // let reveal transitions settle
  await page.screenshot({ path: `${work}/beat-${String(i).padStart(2, '0')}.png` });
  process.stdout.write(`  captured beat ${i + 1}/${durs.length}\r`);
}
await browser.close();
console.log('\n▸ frames captured');

// each beat's segment is its VO length + one crossfade, so the XF overlap doesn't
// steal from the narration timeline (total video ends up sum(durs)+XF ≥ audio).
const L = durs.map(d => Math.max(d, 1.2) + XF);

// 2) per-beat segment: gentle push-in so the still breathes.
// zoompan owns the frame count (d=frames); NO -t (that would multiply frames per input).
L.forEach((dur, i) => {
  const frames = Math.round(dur * FPS);
  const zExpr = `min(zoom+0.0004,1.07)`;
  const png = `${work}/beat-${String(i).padStart(2, '0')}.png`;
  const seg = `${work}/seg-${String(i).padStart(2, '0')}.mp4`;
  const vf = `zoompan=z='${zExpr}':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},format=yuv420p`;
  sh(`ffmpeg -y -loop 1 -framerate ${FPS} -i ${q(png)} -vf "${vf}" -frames:v ${frames} -an -c:v libx264 -preset veryfast -crf 20 ${q(seg)}`);
  process.stdout.write(`  built segment ${i + 1}/${durs.length}\r`);
});
console.log('\n▸ segments built');

// 3) crossfade beats together (chained xfade), keeping absolute offsets
let filter = '', prev = '0:v', tPrev = L[0];
const inputs = L.map((_, i) => `-i ${q(`${work}/seg-${String(i).padStart(2, '0')}.mp4`)}`).join(' ');
for (let i = 1; i < L.length; i++) {
  const off = (tPrev - XF).toFixed(3);
  const lbl = i === L.length - 1 ? 'vout' : `x${i}`;
  filter += `[${prev}][${i}:v]xfade=transition=fade:duration=${XF}:offset=${off}[${lbl}];`;
  prev = lbl; tPrev = tPrev + L[i] - XF;
}
const silent = `${work}/silent.mp4`;
if (durs.length === 1) sh(`ffmpeg -y -i ${q(`${work}/seg-00.mp4`)} -c copy ${silent}`);
else sh(`ffmpeg -y ${inputs} -filter_complex "${filter.replace(/;$/, '')}" -map "[vout]" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p ${q(silent)}`);
console.log('▸ crossfaded');

// 4) mux narration
sh(`ffmpeg -y -i ${q(silent)} -i ${q(audio)} -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest ${q(out)}`);
const meta = sh(`ffprobe -v error -show_entries format=duration:stream=width,height,codec_type -of default=nw=1 ${q(out)}`).trim();
console.log(`\n✓ ${out}\n${meta}`);
