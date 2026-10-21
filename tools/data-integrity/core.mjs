import { createHash } from 'node:crypto'

function finding(code, severity, summary, details = {}) {
  return { code, severity, summary, details }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ')
}

function tableNames(sql, expression) {
  return [...stripSqlComments(sql).matchAll(expression)].map((match) => match[1].replaceAll('"', '').toLowerCase())
}

function normalizeStatement(statement) {
  return statement.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function buildMigrationChainHash(migrations) {
  const chain = [...migrations]
    .sort((left, right) => left.filename.localeCompare(right.filename))
    .map(({ filename, sql }) => `${filename}:${sha256(sql)}\n`)
    .join('')
  return `sha256:${sha256(chain)}`
}

function securityDefinerFindings(migrations) {
  const findings = []
  const chainSql = migrations.map(({ sql }) => stripSqlComments(sql)).join('\n')
  const alteredSearchPaths = new Set(
    [...chainSql.matchAll(/alter\s+function\s+([^\s(]+)\s*\([^;]*?\)\s+set\s+search_path\b/gi)]
      .map((match) => match[1].replaceAll('"', '').toLowerCase()),
  )

  for (const migration of migrations) {
    const sql = stripSqlComments(migration.sql)
    const starts = [...sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([^\s(]+)/gi)]
    for (let index = 0; index < starts.length; index += 1) {
      const match = starts[index]
      const end = starts[index + 1]?.index ?? sql.length
      const definition = sql.slice(match.index, end)
      if (!/security\s+definer/i.test(definition)) continue
      const functionName = match[1].replaceAll('"', '').toLowerCase()
      if (!/set\s+search_path\b/i.test(definition) && !alteredSearchPaths.has(functionName)) {
        findings.push(finding(
          'security_definer_without_search_path',
          'critical',
          `${migration.filename} defines ${functionName} without a pinned search_path.`,
          { filename: migration.filename, functionName },
        ))
      }
    }
  }
  return findings
}

export function auditMigrationChain({
  migrations,
  baselineMigrations = [],
  foundationMigrations = [],
  manifest,
}) {
  const findings = []
  const sorted = [...migrations].sort((left, right) => left.filename.localeCompare(right.filename))
  const parsed = sorted.map((migration) => ({
    ...migration,
    version: Number(/^([0-9]{4})_/.exec(migration.filename)?.[1] ?? Number.NaN),
  }))

  for (const migration of parsed.filter((item) => !Number.isInteger(item.version))) {
    findings.push(finding('invalid_migration_filename', 'high', `${migration.filename} has no four-digit version.`, { filename: migration.filename }))
  }

  const versions = new Map()
  for (const migration of parsed.filter((item) => Number.isInteger(item.version))) {
    const files = versions.get(migration.version) ?? []
    files.push(migration.filename)
    versions.set(migration.version, files)
  }
  for (const [version, files] of versions) {
    if (files.length > 1) {
      findings.push(finding('duplicate_migration_version', 'critical', `Migration version ${String(version).padStart(4, '0')} is duplicated.`, { files }))
    }
  }

  const start = Number(manifest.incrementalStart)
  const end = Number(manifest.incrementalEnd)
  const missing = []
  for (let version = start; version <= end; version += 1) {
    if (!versions.has(version)) missing.push(String(version).padStart(4, '0'))
  }
  if (missing.length > 0) {
    findings.push(finding('migration_sequence_gap', 'critical', 'The incremental migration sequence has gaps.', { missing }))
  }
  if (sorted.length !== manifest.migrationCount) {
    findings.push(finding('migration_count_mismatch', 'high', 'The migration count differs from the immutable manifest.', {
      expected: manifest.migrationCount,
      actual: sorted.length,
    }))
  }

  const actualChainHash = buildMigrationChainHash(sorted)
  if (manifest.chainHash !== actualChainHash) {
    findings.push(finding('migration_chain_hash_mismatch', 'critical', 'Migration history changed without an intentional manifest update.', {
      expected: manifest.chainHash ?? null,
      actual: actualChainHash,
    }))
  }

  const schemaMigrations = [
    ...foundationMigrations,
    ...baselineMigrations,
    ...sorted,
  ]
  const allSql = schemaMigrations.map(({ sql }) => sql).join('\n')
  const createdTables = new Set(tableNames(
    allSql,
    /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?/gi,
  ))
  const rlsTables = new Set(tableNames(
    allSql,
    /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][\w$]*)["']?\s+enable\s+row\s+level\s+security/gi,
  ))
  for (const table of [...createdTables].filter((name) => !rlsTables.has(name)).sort()) {
    findings.push(finding('created_table_without_rls', 'critical', `Created table ${table} never enables row-level security.`, { table }))
  }

  findings.push(...securityDefinerFindings(schemaMigrations))

  const allowedAnonGrants = [
    ...(manifest.baseline?.allowedAnonGrants ?? []),
    ...(manifest.allowedAnonGrants ?? []),
  ]
  for (const migration of schemaMigrations) {
    const sql = stripSqlComments(migration.sql)
    for (const match of sql.matchAll(/\bgrant\s+[\s\S]*?\s+to\s+[^;]+;/gi)) {
      const statement = normalizeStatement(match[0])
      if (!/\bto\s+[^;]*\b(?:anon|public)\b/.test(statement)) continue
      const allowed = allowedAnonGrants.some((entry) =>
        entry.file === migration.filename && statement.includes(entry.contains.toLowerCase()),
      )
      if (!allowed) {
        findings.push(finding('unapproved_anon_grant', 'critical', `${migration.filename} grants database access to an anonymous/public role.`, {
          filename: migration.filename,
          statement,
        }))
      }
    }
  }

  const destructiveAllowlist = new Set([
    ...(manifest.baseline?.destructiveMigrationAllowlist ?? []),
    ...(manifest.destructiveMigrationAllowlist ?? []),
  ].map((entry) => entry.file))
  for (const migration of schemaMigrations) {
    const sql = stripSqlComments(migration.sql)
    if (/\b(?:drop\s+(?:table|view|function)|alter\s+table\s+[^;]+\s+drop\s+column|truncate|delete\s+from)\b/i.test(sql)
      && !destructiveAllowlist.has(migration.filename)) {
      findings.push(finding('unapproved_destructive_migration', 'critical', `${migration.filename} contains a destructive statement without a reviewed manifest entry.`, {
        filename: migration.filename,
      }))
    }
  }

  return {
    ok: findings.length === 0,
    findings,
    summary: {
      migrationCount: sorted.length,
      baselineFileCount: baselineMigrations.length,
      foundationFileCount: foundationMigrations.length,
      schemaFileCount: schemaMigrations.length,
      incrementalStart: start,
      incrementalEnd: end,
      chainHash: actualChainHash,
      createdTables: createdTables.size,
      rlsEnabledTables: [...createdTables].filter((name) => rlsTables.has(name)).length,
      securityDefinerFunctions: schemaMigrations.reduce((count, item) => count + (stripSqlComments(item.sql).match(/security\s+definer/gi)?.length ?? 0), 0),
    },
  }
}
