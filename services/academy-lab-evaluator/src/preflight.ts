import { constants } from 'node:fs'
import { access, lstat, mkdir, realpath } from 'node:fs/promises'

import type { EvaluatorConfig } from './config'
import { runBoundedProcess } from './executor'

export async function evaluatorPreflight(config: EvaluatorConfig): Promise<void> {
  await access(config.privateSpecRoot, constants.R_OK)
  const specInfo = await lstat(config.privateSpecRoot)
  if (!specInfo.isDirectory() || specInfo.isSymbolicLink()) throw new Error('private spec root must be a real directory')
  await mkdir(config.jobRoot, { recursive: true, mode: 0o750 })
  const jobInfo = await lstat(config.jobRoot)
  if (!jobInfo.isDirectory() || jobInfo.isSymbolicLink()) throw new Error('job root must be a real directory')
  await access(config.jobRoot, constants.R_OK | constants.W_OK | constants.X_OK)
  if (await realpath(config.privateSpecRoot) === await realpath(config.jobRoot)) throw new Error('private and job roots resolve to the same directory')

  const daemon = await runBoundedProcess('docker', ['info', '--format', '{{json .SecurityOptions}}'], {
    stdin: '', wallTimeMs: 5_000, outputLimitBytes: 16_384,
  })
  if (daemon.status !== 'exited' || daemon.exitCode !== 0) throw new Error('Docker daemon is unavailable')
  if (!daemon.stdout.toLowerCase().includes('rootless')) throw new Error('academy evaluator requires rootless Docker')

  for (const image of new Set(Object.values(config.images))) {
    const inspect = await runBoundedProcess('docker', ['image', 'inspect', image], {
      stdin: '', wallTimeMs: 5_000, outputLimitBytes: 16_384,
    })
    if (inspect.status !== 'exited' || inspect.exitCode !== 0) throw new Error(`configured evaluator image is unavailable: ${image}`)
  }
}
