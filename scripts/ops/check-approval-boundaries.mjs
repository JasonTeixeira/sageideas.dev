import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputPath = path.join(root, 'docs', 'evidence', 'engineering-loop', 'approval-boundary-check-latest.json');

const localReleaseRoots = ['verify:local', 'discord:release-local'];

const requiresExplicitApproval = new Set([
  'db:push',
  'seed:test-data',
  'test:cleanup',
  'test:e2e',
  'test:e2e:local',
  'test:e2e:local:acquisition',
  'discord:register',
  'discord:provision',
  'discord:archive-old',
  'discord:approval-gate',
  'discord:approval-enforce',
  'discord:role-sync:enforce',
  'discord:onboarding-nudge:send',
  'discord:categorize',
  'discord:harden',
  'discord:pin-posts',
  'discord:operating-cycle',
  'discord:operating-cycle:strict',
  'discord:operating-cycle:full',
  'discord:content-factory',
  'discord:content-factory:week',
  'rag:sync-sources',
  'rag:chunk',
  'rag:embed',
  'rag:evaluate',
  'rag:evaluate:missing',
  'rag:evaluate:approved-missing',
  'rag:evaluate:smoke',
]);

const dangerousShellPatterns = [
  /\bgit\s+push\b/,
  /\bvercel\s+(?:deploy|--prod|prod)\b/,
  /\brailway\s+up\b/,
  /\bstripe\s+/,
  /\bsupabase\s+db\s+push\b/,
  /\bdb\s+push\b/,
];

const safePlanningEvalScripts = new Set([
  'rag:evaluate:seed-dry-run',
  'rag:evaluate:coverage-readiness',
  'rag:evaluate:missing-plan',
  'rag:evaluate:execution-packet',
  'rag:evaluate:missing-preflight',
  'rag:evaluate:recovery-plan',
]);

function extractNpmRunReferences(command) {
  const refs = [];
  const regex = /\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g;
  let match;
  while ((match = regex.exec(command)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

function expandScriptGraph(scripts, roots) {
  const visited = new Set();
  const edges = [];
  const missing = [];

  function visit(scriptName, parent = null) {
    if (parent) {
      edges.push({ from: parent, to: scriptName });
    }
    if (visited.has(scriptName)) {
      return;
    }
    visited.add(scriptName);

    const command = scripts[scriptName];
    if (!command) {
      missing.push(scriptName);
      return;
    }

    for (const child of extractNpmRunReferences(command)) {
      visit(child, scriptName);
    }
  }

  for (const rootScript of roots) {
    visit(rootScript);
  }

  return { visited, edges, missing };
}

function commandHasDangerousShellPattern(command) {
  return dangerousShellPatterns
    .filter((pattern) => pattern.test(command))
    .map((pattern) => pattern.source);
}

function ragEvalReferenceIsGuarded(scriptName, command, referencedScript) {
  if (safePlanningEvalScripts.has(referencedScript)) {
    return true;
  }

  if (referencedScript === 'rag:evaluate' || referencedScript === 'rag:evaluate:missing' || referencedScript === 'rag:evaluate:approved-missing') {
    if (requiresExplicitApproval.has(scriptName) && !command.includes('SAGE_ALLOW_NON_DRY_RAG_EVAL=approved')) {
      return true;
    }
    return command.includes('SAGE_ALLOW_NON_DRY_RAG_EVAL=approved');
  }

  if (scriptName === referencedScript) {
    return true;
  }

  return true;
}

async function main() {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const scripts = packageJson.scripts ?? {};
  const graph = expandScriptGraph(scripts, localReleaseRoots);
  const localReleaseScriptNames = [...graph.visited].sort();

  const failures = [];

  for (const missing of graph.missing) {
    failures.push(`local_release_references_missing_script:${missing}`);
  }

  for (const scriptName of localReleaseScriptNames) {
    if (requiresExplicitApproval.has(scriptName)) {
      failures.push(`local_release_references_explicit_approval_script:${scriptName}`);
    }

    const command = scripts[scriptName] ?? '';
    for (const dangerousPattern of commandHasDangerousShellPattern(command)) {
      failures.push(`local_release_contains_dangerous_shell_pattern:${scriptName}:${dangerousPattern}`);
    }

    for (const referencedScript of extractNpmRunReferences(command)) {
      if (!ragEvalReferenceIsGuarded(scriptName, command, referencedScript)) {
        failures.push(`unguarded_non_dry_rag_eval_reference:${scriptName}->${referencedScript}`);
      }
    }
  }

  for (const [scriptName, command] of Object.entries(scripts)) {
    for (const referencedScript of extractNpmRunReferences(command)) {
      if (!ragEvalReferenceIsGuarded(scriptName, command, referencedScript)) {
        failures.push(`unguarded_non_dry_rag_eval_reference:${scriptName}->${referencedScript}`);
      }
    }
  }

  const fullCycleCommand = scripts['discord:operating-cycle:full'] ?? '';
  if (!fullCycleCommand.includes('npm run rag:evaluate')) {
    failures.push('discord_operating_cycle_full_must_run_rag_eval_gate');
  }
  if (fullCycleCommand.includes('SAGE_ALLOW_NON_DRY_RAG_EVAL=approved')) {
    failures.push('discord_operating_cycle_full_must_not_inline_eval_approval');
  }
  if (fullCycleCommand.includes('SAGE_ALLOW_DISCORD_OPERATING_CYCLE=approved')) {
    failures.push('discord_operating_cycle_full_must_not_inline_operating_cycle_approval');
  }

  const riskyScripts = Object.keys(scripts)
    .filter((scriptName) => requiresExplicitApproval.has(scriptName))
    .sort()
    .map((scriptName) => ({
      script: scriptName,
      command: scripts[scriptName],
      approvalBoundary: 'requires_explicit_user_approval_before_running',
      includedInLocalRelease: localReleaseScriptNames.includes(scriptName),
    }));

  const evidence = {
    ok: failures.length === 0,
    version: 'approval-boundary-check-v1',
    timestamp: new Date().toISOString(),
    mutationMode: 'local_file_evidence_only',
    command: 'npm run ops:approval-boundaries',
    localReleaseRoots,
    localReleaseScriptNames,
    localReleaseEdges: graph.edges,
    riskyScripts,
    guardedEvalScripts: {
      safePlanningEvalScripts: [...safePlanningEvalScripts].sort(),
      fullCycleCommand,
      fullCycleApprovalBoundary: 'discord:operating-cycle:full intentionally does not inline SAGE_ALLOW_DISCORD_OPERATING_CYCLE=approved or SAGE_ALLOW_NON_DRY_RAG_EVAL=approved; both non-dry commands must receive explicit approval through the operator environment before they can run.',
    },
    failures,
    releaseMeaning: 'This check only inspects package scripts and writes local evidence. It does not push, deploy, post to Discord, mutate Supabase, change Stripe, or run RAG evaluation.',
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);

  if (!evidence.ok) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exit(1);
  }

  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
