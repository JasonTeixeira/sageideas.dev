import { Writable } from 'node:stream'

import {
  EVALUATOR_LIMITS,
  type LabLanguage,
  type PrivateCaseResult,
  type PrivateLabCase,
  type PrivateLabSpec,
} from '../../../lib/academy/lab-evaluator/contract'

export type VercelSandboxCreateConfig = {
  image: string
  networkPolicy: 'deny-all'
  persistent: false
  resources: { vcpus: number }
  timeout: number
  tags: Record<string, string>
}

type SandboxFile = { path: string; content: string | Uint8Array; mode?: number }
type SandboxCommand = {
  cmd: string
  args: string[]
  timeoutMs: number
  sudo: false
  signal: AbortSignal
  stdout: Writable
  stderr: Writable
}

export type VercelSandboxLike = {
  writeFiles: (files: SandboxFile[]) => Promise<void>
  runCommand: (command: SandboxCommand) => Promise<{ exitCode: number }>
  delete: () => Promise<void>
}

export type VercelSandboxCreate = (
  config: VercelSandboxCreateConfig,
) => Promise<VercelSandboxLike>

const WORK_ROOT = '/vercel/sandbox'

const SQL_RUNNER = String.raw`import sqlite3
import sys

FIXTURE_START = "-- academy-public-fixture:start"
FIXTURE_END = "-- academy-public-fixture:end"

def deny_dangerous(opcode, _arg1, _arg2, _database, _trigger):
    return sqlite3.SQLITE_DENY if opcode in {sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH} else sqlite3.SQLITE_OK

def statements(source):
    buffer = ""
    for character in source:
        buffer += character
        if character == ";" and sqlite3.complete_statement(buffer):
            if buffer.strip():
                yield buffer
            buffer = ""
    if buffer.strip():
        raise ValueError("incomplete SQL statement")

def strip_public_fixture(source):
    start = source.find(FIXTURE_START)
    end = source.find(FIXTURE_END)
    if start == -1 and end == -1:
        return source
    if start == -1 or end == -1 or end < start:
        raise ValueError("invalid public fixture markers")
    return source[:start] + source[end + len(FIXTURE_END):]

def execute(connection, source, emit_results):
    for statement in statements(source):
        cursor = connection.execute(statement)
        if emit_results and cursor.description:
            print(" | ".join(column[0] for column in cursor.description))
            for row in cursor.fetchall():
                print(" | ".join("" if value is None else str(value) for value in row))

source = open(sys.argv[1], "r", encoding="utf-8").read()
private_setup = open(sys.argv[2], "r", encoding="utf-8").read()
connection = sqlite3.connect(":memory:")
connection.enable_load_extension(False)
connection.set_authorizer(deny_dangerous)
connection.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH, 65536)
connection.setlimit(sqlite3.SQLITE_LIMIT_LENGTH, 1048576)
if private_setup.strip():
    execute(connection, private_setup, False)
    source = strip_public_fixture(source)
execute(connection, source, True)
`

type CapturedOutput = {
  stdout: Buffer[]
  stderr: Buffer[]
  outputBytes: number
  outputLimited: boolean
}

function boundedSink(
  stream: 'stdout' | 'stderr',
  capture: CapturedOutput,
  controller: AbortController,
): Writable {
  return new Writable({
    write(chunk: Buffer | string, _encoding, callback) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      const remaining = Math.max(0, EVALUATOR_LIMITS.outputBytes - capture.outputBytes)
      if (remaining > 0) capture[stream].push(value.subarray(0, remaining))
      capture.outputBytes += value.length
      if (capture.outputBytes > EVALUATOR_LIMITS.outputBytes) {
        capture.outputLimited = true
        controller.abort()
      }
      callback()
    },
  })
}

function filenameFor(language: LabLanguage): string {
  if (language === 'python') return 'submission.py'
  if (language === 'javascript') return 'submission.js'
  return 'submission.sql'
}

function executionCommand(language: LabLanguage): string {
  const source = `${WORK_ROOT}/${filenameFor(language)}`
  if (language === 'python') return `python3 ${source} < ${WORK_ROOT}/input.txt`
  if (language === 'javascript') {
    return `node --max-old-space-size=${EVALUATOR_LIMITS.javascriptHeapMb} --max-semi-space-size=${EVALUATOR_LIMITS.javascriptSemiSpaceMb} ${source} < ${WORK_ROOT}/input.txt`
  }
  return `python3 ${WORK_ROOT}/sql_runner.py ${source} ${WORK_ROOT}/input.txt`
}

function constrainedShell(language: LabLanguage): string {
  const fileBlocks = Math.ceil(EVALUATOR_LIMITS.outputBytes / 512)
  const addressSpaceLimits = language === 'javascript' ? [] : [
    `ulimit -S -v ${EVALUATOR_LIMITS.memoryMb * 1024}`,
    `ulimit -H -v ${EVALUATOR_LIMITS.memoryMb * 1024}`,
  ]
  return [
    'umask 077',
    ...addressSpaceLimits,
    `ulimit -S -t ${EVALUATOR_LIMITS.cpuSeconds}`,
    `ulimit -H -t ${EVALUATOR_LIMITS.cpuSeconds + 1}`,
    `ulimit -S -u ${EVALUATOR_LIMITS.pids}`,
    `ulimit -H -u ${EVALUATOR_LIMITS.pids}`,
    `ulimit -S -f ${fileBlocks}`,
    `ulimit -H -f ${fileBlocks}`,
    `cd ${WORK_ROOT}`,
    `exec /usr/local/bin/academy-setpriv --no-new-privs --bounding-set=-all --inh-caps=-all --ambient-caps=-all timeout --signal=TERM --kill-after=1 ${EVALUATOR_LIMITS.wallTimeMs / 1000}s ${executionCommand(language)}`,
  ].join('; ')
}

async function defaultCreateSandbox(config: VercelSandboxCreateConfig): Promise<VercelSandboxLike> {
  const { Sandbox } = await import('@vercel/sandbox')
  return Sandbox.create(config) as Promise<VercelSandboxLike>
}

function runtimeError(testCase: PrivateLabCase, capture?: CapturedOutput): PrivateCaseResult {
  return {
    caseId: testCase.id,
    status: 'runtime_error',
    stdout: capture ? Buffer.concat(capture.stdout).toString('utf8') : '',
    expectedStdout: testCase.expectedStdout,
    outputBytes: capture?.outputBytes ?? 0,
  }
}

export async function executePrivateCaseInVercelSandbox(input: {
  language: LabLanguage
  code: string
  testCase: PrivateLabCase
  spec: PrivateLabSpec
  image: string
  requestId: string
}, deps: {
  createSandbox?: VercelSandboxCreate
} = {}): Promise<PrivateCaseResult> {
  const createSandbox = deps.createSandbox ?? defaultCreateSandbox
  const requestTag = input.requestId.replaceAll('-', '').slice(0, 16)
  let sandbox: VercelSandboxLike
  try {
    sandbox = await createSandbox({
      image: input.image,
      networkPolicy: 'deny-all',
      persistent: false,
      resources: { vcpus: 1 },
      timeout: EVALUATOR_LIMITS.wallTimeMs + 2_000,
      tags: { service: 'academy-evaluator', request: requestTag },
    })
  } catch {
    return runtimeError(input.testCase)
  }

  const controller = new AbortController()
  const capture: CapturedOutput = { stdout: [], stderr: [], outputBytes: 0, outputLimited: false }
  let exitCode: number | null = null
  let executionFailed = false
  try {
    const files: SandboxFile[] = [
      { path: `${WORK_ROOT}/${filenameFor(input.language)}`, content: input.code, mode: 0o444 },
      { path: `${WORK_ROOT}/input.txt`, content: input.testCase.stdin, mode: 0o444 },
    ]
    if (input.language === 'sql') {
      files.push({ path: `${WORK_ROOT}/sql_runner.py`, content: SQL_RUNNER, mode: 0o444 })
    }
    await sandbox.writeFiles(files)
    const result = await sandbox.runCommand({
      cmd: 'bash',
      args: ['-c', constrainedShell(input.language)],
      timeoutMs: EVALUATOR_LIMITS.wallTimeMs + 1_000,
      sudo: false,
      signal: controller.signal,
      stdout: boundedSink('stdout', capture, controller),
      stderr: boundedSink('stderr', capture, controller),
    })
    exitCode = result.exitCode
  } catch {
    executionFailed = true
  }

  try {
    await sandbox.delete()
  } catch {
    return runtimeError(input.testCase, capture)
  }

  let status: PrivateCaseResult['status']
  if (capture.outputLimited) status = 'output_limited'
  else if (exitCode === 124 || exitCode === 152) status = 'timed_out'
  else if (exitCode === 137) status = 'memory_limited'
  else if (executionFailed || exitCode !== 0) status = 'runtime_error'
  else status = 'passed'

  return {
    caseId: input.testCase.id,
    status,
    stdout: Buffer.concat(capture.stdout).toString('utf8'),
    expectedStdout: input.testCase.expectedStdout,
    outputBytes: capture.outputBytes,
  }
}
