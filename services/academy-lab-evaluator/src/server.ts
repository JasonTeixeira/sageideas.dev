import http, { type IncomingMessage } from 'node:http'

import { EVALUATOR_LIMITS, type PrivateLabSpec } from '../../../lib/academy/lab-evaluator/contract'
import { loadEvaluatorConfig } from './config'
import { evaluateSubmission } from './evaluate'
import { executePrivateCase } from './executor'
import { createEvaluatorHttpHandler } from './handler'
import { evaluatorPreflight } from './preflight'
import { createReferenceProofCache } from './reference-proof'
import { loadPrivateSpec } from './spec-store'

async function readBoundedBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > EVALUATOR_LIMITS.requestBytes) throw new Error('request_too_large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks, bytes).toString('utf8')
}

async function main(): Promise<void> {
  const config = loadEvaluatorConfig()
  await evaluatorPreflight(config)

  const runCase = (code: string, testCase: PrivateLabSpec['cases'][number], spec: PrivateLabSpec, requestId: string) =>
    executePrivateCase({
      language: spec.language,
      code,
      testCase,
      image: config.images[spec.language],
      jobRoot: config.jobRoot,
      requestId,
    })
  const proveSpec = createReferenceProofCache((code, testCase, spec) =>
    runCase(code, testCase, spec, crypto.randomUUID()))

  const handler = createEvaluatorHttpHandler({
    secret: config.secret,
    evaluate: (request) => evaluateSubmission(request, {
      loadSpec: (labKey) => loadPrivateSpec(config.privateSpecRoot, labKey),
      runtimeImageFor: (spec) => config.images[spec.language],
      proveSpec,
      executeCase: (code, testCase, spec) => runCase(code, testCase, spec, request.requestId),
    }),
  })

  const server = http.createServer(async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    response.setHeader('x-content-type-options', 'nosniff')
    if (request.method === 'GET' && request.url === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
      response.end('{"status":"ready"}')
      return
    }
    if (request.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') {
      response.writeHead(415, { 'content-type': 'application/json; charset=utf-8' })
      response.end('{"error":"unsupported_media_type"}')
      return
    }
    try {
      const result = await handler({
        method: request.method ?? '',
        path: request.url ?? '',
        body: await readBoundedBody(request),
      })
      response.writeHead(result.status, result.headers)
      response.end(result.body)
    } catch (error) {
      const tooLarge = error instanceof Error && error.message === 'request_too_large'
      response.writeHead(tooLarge ? 413 : 500, { 'content-type': 'application/json; charset=utf-8' })
      response.end(tooLarge ? '{"error":"request_too_large"}' : '{"error":"internal_error"}')
    }
  })
  server.requestTimeout = 10_000
  server.headersTimeout = 5_000
  server.keepAliveTimeout = 5_000
  server.maxRequestsPerSocket = 100
  server.listen(config.port, config.host, () => {
    console.info(`[academy-evaluator] listening on ${config.host}:${config.port}`)
  })

  const shutdown = () => server.close(() => process.exit(0))
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

main().catch((error) => {
  console.error('[academy-evaluator] startup failed', error instanceof Error ? error.message : 'unknown error')
  process.exit(1)
})
