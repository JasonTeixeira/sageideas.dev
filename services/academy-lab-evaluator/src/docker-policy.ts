import path from 'node:path'

import { EVALUATOR_LIMITS, type LabLanguage } from '../../../lib/academy/lab-evaluator/contract'

const IMAGE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*@sha256:[a-f0-9]{64}$/
const CONTAINER_RE = /^academy-eval-[a-f0-9]{32}$/
const SAFE_PATH_RE = /^\/[a-zA-Z0-9._/-]+$/

export function validatePinnedImage(image: string): string {
  if (!IMAGE_RE.test(image)) {
    if (!image.includes('@sha256:')) throw new Error('runtime image must be digest-pinned')
    throw new Error('invalid image reference')
  }
  return image
}

function sourceContract(language: LabLanguage): { filename: string; command: string[] } {
  if (language === 'python') return { filename: 'submission.py', command: ['python3', '-I', '-B', '/workspace/submission.py'] }
  if (language === 'javascript') return { filename: 'submission.js', command: ['node', '--disable-proto=throw', '/workspace/submission.js'] }
  return { filename: 'submission.sql', command: ['python3', '-I', '-B', '/opt/academy-evaluator/run_sql.py', '/workspace/submission.sql'] }
}

export function buildDockerRunArgs(input: {
  containerName: string
  image: string
  language: LabLanguage
  sourcePath: string
}): string[] {
  if (!CONTAINER_RE.test(input.containerName)) throw new Error('invalid evaluator container name')
  const image = validatePinnedImage(input.image)
  if (!SAFE_PATH_RE.test(input.sourcePath) || input.sourcePath.split('/').includes('..')) throw new Error('invalid evaluator source path')
  const contract = sourceContract(input.language)
  if (path.basename(input.sourcePath) !== contract.filename) throw new Error('source filename does not match language')

  return [
    'run', '--rm', '--pull=never', `--name=${input.containerName}`,
    '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges=true',
    `--pids-limit=${EVALUATOR_LIMITS.pids}`, `--memory=${EVALUATOR_LIMITS.memoryMb}m`,
    `--memory-swap=${EVALUATOR_LIMITS.memoryMb}m`, `--cpus=${EVALUATOR_LIMITS.cpus}`,
    '--user=65532:65532', '--workdir=/workspace', '--ipc=none',
    `--ulimit=cpu=${EVALUATOR_LIMITS.cpuSeconds}:${EVALUATOR_LIMITS.cpuSeconds}`,
    '--ulimit=fsize=1048576:1048576', '--ulimit=nofile=64:64', '--stop-timeout=1',
    `--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=${EVALUATOR_LIMITS.writableTmpfsMb}m`,
    `--tmpfs=/workspace/tmp:rw,noexec,nosuid,nodev,size=${EVALUATOR_LIMITS.writableTmpfsMb}m`,
    '--log-driver=none',
    `--mount=type=bind,src=${input.sourcePath},dst=/workspace/${contract.filename},readonly`,
    image,
    ...contract.command,
  ]
}

export class BoundedOutput {
  private readonly chunks: Buffer[] = []
  private bytes = 0

  constructor(private readonly limitBytes = EVALUATOR_LIMITS.outputBytes) {
    if (!Number.isSafeInteger(limitBytes) || limitBytes < 1) throw new Error('invalid output limit')
  }

  append(chunk: Buffer): void {
    if (this.bytes + chunk.length > this.limitBytes) throw new Error('evaluator output limit exceeded')
    this.chunks.push(Buffer.from(chunk))
    this.bytes += chunk.length
  }

  byteLength(): number {
    return this.bytes
  }

  text(): string {
    return Buffer.concat(this.chunks, this.bytes).toString('utf8')
  }
}
