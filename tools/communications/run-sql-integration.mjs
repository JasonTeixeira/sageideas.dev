import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const container = `sageideas-communications-sql-${process.pid}-${randomUUID().slice(0, 8)}`
const password = randomUUID()

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.input ? ['pipe', 'pipe', 'pipe'] : 'pipe',
    input: options.input,
    timeout: options.timeout ?? 60_000,
  })
  if (result.error || result.status !== 0) {
    const detail = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n')
    throw new Error(`${command} ${args.join(' ')} failed\n${detail}`)
  }
  return result.stdout.trim()
}

try {
  run('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 15_000 })
  run('docker', [
    'run', '--rm', '--detach', '--name', container,
    '--env', `POSTGRES_PASSWORD=${password}`,
    '--env', 'POSTGRES_DB=communications_test',
    'postgres:17-alpine',
  ], { timeout: 120_000 })

  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8', timeout: 5_000 })
    const initialized = `${logs.stdout ?? ''}\n${logs.stderr ?? ''}`
      .includes('PostgreSQL init process complete; ready for start up.')
    const result = spawnSync('docker', [
      'exec', container, 'pg_isready', '-U', 'postgres', '-d', 'communications_test',
    ], { encoding: 'utf8', timeout: 5_000 })
    if (initialized && result.status === 0) {
      ready = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error('isolated PostgreSQL container did not become ready')

  const sql = await Promise.all([
    'tests/communications/sql/prelude.sql',
    'supabase/migrations/0122_email_delivery_integrity.sql',
    'tests/communications/sql/assertions.sql',
  ].map((file) => readFile(path.join(root, file), 'utf8')))
  const output = run('docker', [
    'exec', '--interactive', container,
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'communications_test',
  ], { input: sql.join('\n\n'), timeout: 60_000 })
  if (!output.includes('communications_sql_integration_green')) {
    throw new Error(`SQL proof sentinel missing\n${output}`)
  }
  console.log('Communications SQL integration: GREEN')
} finally {
  spawnSync('docker', ['rm', '--force', container], { cwd: root, encoding: 'utf8', timeout: 15_000 })
}
