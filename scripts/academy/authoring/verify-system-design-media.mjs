import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const courseSlug = 'system-design'
const lessonPath = `data/academy/authoring/${courseSlug}.lessons.json`
const outputPath = `docs/academy/evidence/${courseSlug}/media-integrity.json`
const allowFail = process.argv.includes('--allow-fail')
const lessons = JSON.parse(readFileSync(lessonPath, 'utf8'))
const promised = []

function visit(value, lessonSlug) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, lessonSlug)
    return
  }
  if (!value || typeof value !== 'object') return
  if (typeof value.audio === 'string') {
    promised.push({ lessonSlug, url: value.audio, transcript: String(value.say ?? '') })
  }
  for (const child of Object.values(value)) visit(child, lessonSlug)
}

for (const [lessonSlug, blocks] of Object.entries(lessons)) visit(blocks, lessonSlug)
if (promised.length !== 159) throw new Error(`Expected 159 narrated assets; found ${promised.length}`)
if (new Set(promised.map((asset) => asset.url)).size !== promised.length) throw new Error('Narrated asset URLs must be unique')
if (promised.some((asset) => asset.transcript.length < 20)) throw new Error('Every narrated asset needs an adjacent transcript')

async function inspect(asset) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(asset.url, { method: 'HEAD', redirect: 'follow', signal: controller.signal })
    return {
      ...asset,
      httpStatus: response.status,
      contentType: response.headers.get('content-type') ?? '',
      contentLength: Number(response.headers.get('content-length') ?? 0),
      error: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    return { ...asset, httpStatus: null, contentType: '', contentLength: 0, error: error instanceof Error ? error.message : String(error) }
  } finally {
    clearTimeout(timer)
  }
}

const assets = []
for (let offset = 0; offset < promised.length; offset += 8) {
  assets.push(...await Promise.all(promised.slice(offset, offset + 8).map(inspect)))
}
const failures = assets.filter((asset) => asset.httpStatus !== 200 || !asset.contentType.startsWith('audio/'))
const evidence = {
  schemaVersion: 1,
  courseSlug,
  checkedAt: new Date().toISOString(),
  status: failures.length ? 'fail' : 'pass',
  summary: failures.length
    ? `${failures.length}/${assets.length} narrated assets could not be proven reachable audio; activation remains blocked.`
    : `${assets.length}/${assets.length} narrated assets returned HTTP 200 with an audio content type.`,
  assets,
}
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`)
console.log(evidence.summary)
if (failures.length && !allowFail) process.exitCode = 1
