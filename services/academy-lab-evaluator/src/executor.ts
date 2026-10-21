import { spawn } from 'node:child_process'
import { chmod, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  EVALUATOR_LIMITS,
  type LabLanguage,
  type PrivateCaseResult,
  type PrivateLabCase,
} from '../../../lib/academy/lab-evaluator/contract'
import { buildDockerRunArgs } from './docker-policy'

export type ProcessResult = {
  status: 'exited' | 'timed_out' | 'output_limited' | 'spawn_error'
  exitCode: number | null
  stdout: string
  stderr: string
  outputBytes: number
}

export type RunDocker = (
  args: string[],
  options: { stdin: string; wallTimeMs: number; outputLimitBytes: number },
) => Promise<ProcessResult>

export async function runBoundedProcess(
  command: string,
  args: readonly string[],
  options: { stdin: string; wallTimeMs: number; outputLimitBytes: number },
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const childEnv: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV ?? 'production' }
    for (const key of ['PATH', 'DOCKER_HOST', 'DOCKER_TLS_VERIFY', 'DOCKER_CERT_PATH'] as const) {
      if (process.env[key]) childEnv[key] = process.env[key]
    }
    const child = spawn(command, [...args], {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: childEnv,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let outputBytes = 0
    let terminalStatus: ProcessResult['status'] | null = null
    let settled = false

    const stop = (status: ProcessResult['status']) => {
      if (terminalStatus) return
      terminalStatus = status
      child.kill('SIGKILL')
    }
    const collect = (target: Buffer[], chunk: Buffer) => {
      if (terminalStatus) return
      outputBytes += chunk.length
      if (outputBytes > options.outputLimitBytes) {
        stop('output_limited')
        return
      }
      target.push(Buffer.from(chunk))
    }
    child.stdout.on('data', (chunk: Buffer) => collect(stdout, chunk))
    child.stderr.on('data', (chunk: Buffer) => collect(stderr, chunk))
    const timer = setTimeout(() => stop('timed_out'), options.wallTimeMs)
    timer.unref()
    child.once('error', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ status: 'spawn_error', exitCode: null, stdout: '', stderr: '', outputBytes })
    })
    child.once('close', (exitCode: number | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        status: terminalStatus ?? 'exited',
        exitCode,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
        outputBytes,
      })
    })
    child.stdin.on('error', () => undefined)
    child.stdin.end(options.stdin)
  })
}

export const runDockerCli: RunDocker = (args, options) => runBoundedProcess('docker', args, options)

async function prepareSourceDefault(input: { jobRoot: string; filename: string; code: string }): Promise<string> {
  await mkdir(input.jobRoot, { recursive: true, mode: 0o750 })
  const jobDir = await mkdtemp(path.join(input.jobRoot, 'job-'))
  await chmod(jobDir, 0o755)
  const sourcePath = path.join(jobDir, input.filename)
  await writeFile(sourcePath, input.code, { encoding: 'utf8', mode: 0o444, flag: 'wx' })
  return sourcePath
}

async function cleanupSourceDefault(sourcePath: string): Promise<void> {
  await rm(path.dirname(sourcePath), { recursive: true, force: true })
}

async function forceRemoveDefault(containerName: string): Promise<void> {
  await runBoundedProcess('docker', ['rm', '--force', containerName], {
    stdin: '', wallTimeMs: 2_000, outputLimitBytes: 4_096,
  }).catch(() => undefined)
}

function filenameFor(language: LabLanguage): string {
  if (language === 'python') return 'submission.py'
  if (language === 'javascript') return 'submission.js'
  return 'submission.sql'
}

export async function executePrivateCase(input: {
  language: LabLanguage
  code: string
  testCase: PrivateLabCase
  image: string
  jobRoot: string
  requestId: string
}, deps: {
  prepareSource?: (input: { jobRoot: string; filename: string; code: string }) => Promise<string>
  cleanupSource?: (sourcePath: string) => Promise<void>
  runDocker?: RunDocker
  forceRemove?: (containerName: string) => Promise<void>
} = {}): Promise<PrivateCaseResult> {
  const prepareSource = deps.prepareSource ?? prepareSourceDefault
  const cleanupSource = deps.cleanupSource ?? cleanupSourceDefault
  const runDocker = deps.runDocker ?? runDockerCli
  const forceRemove = deps.forceRemove ?? forceRemoveDefault
  const sourcePath = await prepareSource({ jobRoot: input.jobRoot, filename: filenameFor(input.language), code: input.code })
  const id = input.requestId.replaceAll('-', '')
  const caseHash = Buffer.from(input.testCase.id).toString('hex').slice(0, 8).padEnd(8, '0')
  const containerName = `academy-eval-${(id.slice(0, 24) + caseHash).slice(0, 32)}`
  let processResult: ProcessResult
  try {
    const args = buildDockerRunArgs({
      containerName,
      image: input.image,
      language: input.language,
      sourcePath,
    })
    processResult = await runDocker(args, {
      stdin: input.testCase.stdin,
      wallTimeMs: EVALUATOR_LIMITS.wallTimeMs,
      outputLimitBytes: EVALUATOR_LIMITS.outputBytes,
    })
    if (processResult.status !== 'exited') await forceRemove(containerName)
  } finally {
    await cleanupSource(sourcePath)
  }

  let status: PrivateCaseResult['status']
  if (processResult.status === 'timed_out') status = 'timed_out'
  else if (processResult.status === 'output_limited') status = 'output_limited'
  else if (processResult.exitCode === 137) status = 'memory_limited'
  else if (processResult.status !== 'exited' || processResult.exitCode !== 0) status = 'runtime_error'
  else status = 'passed'
  return {
    caseId: input.testCase.id,
    status,
    stdout: processResult.stdout,
    expectedStdout: input.testCase.expectedStdout,
    outputBytes: processResult.outputBytes,
  }
}
