import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const SAGE_KERNEL_CONTENT_HARNESS_VERSION = 'sage-kernel-content-harness-v1';
export const DEFAULT_SAGE_KERNEL_ROOT = '/Users/Sage/code/external/sage-kernel';

export type SageKernelContentCategory =
  | 'root_doc'
  | 'docs'
  | 'adr'
  | 'agent_profile'
  | 'dashboard'
  | 'mcp_server'
  | 'worker'
  | 'catalog'
  | 'package_core'
  | 'package_evals'
  | 'package_proof'
  | 'package_operate'
  | 'package_orchestration'
  | 'package_security'
  | 'package_intelligence'
  | 'package_other'
  | 'test'
  | 'other';

export type SageKernelContentCandidate = {
  sourcePath: string;
  title: string;
  category: SageKernelContentCategory;
  proposedChannel: string;
  proposedContentType: 'daily_signal' | 'challenge' | 'resource_drop' | 'quiz' | 'lesson' | 'office_hours_prompt';
  score: number;
  humanAppealScore: number;
  institutionalScore: number;
  discordFitScore: number;
  reasons: string[];
  operatingProofEligible: false;
};

export type SageKernelApprovalDraft = {
  draftKey: string;
  sourcePath: string;
  sourceTitle: string;
  targetChannelBaseName: string;
  draftType: SageKernelContentCandidate['proposedContentType'];
  title: string;
  body: string;
  qualityScore: number;
  status: 'planned_for_admin_review';
  operatingContract: {
    sourceKind: 'sage_kernel_source_seed';
    adminAction: 'review_then_approve_or_reject';
    publishAllowedBeforeApproval: false;
    operatingProofEligible: false;
    requiredReviewChecks: string[];
    proofLaneTargets: Array<'approved_discord_knowledge' | 'rag_discord_sources' | 'public_proof_assets'>;
    collectionInstruction: string;
  };
};

export type SageKernelContentHarnessResult = {
  ok: boolean;
  version: typeof SAGE_KERNEL_CONTENT_HARNESS_VERSION;
  generatedAt: string;
  sourceRoot: string;
  mutationMode: 'read_only_external_repo_and_local_file_evidence_only';
  releaseMeaning: string;
  sourceCommit: string | null;
  inventory: {
    fileCount: number;
    markdownCount: number;
    jsonCount: number;
    moduleCount: number;
    testCount: number;
    packageCount: number;
    categories: Record<SageKernelContentCategory, number>;
  };
  readiness: {
    score: number;
    targetScoreRange: '95-99';
    status: 'ready_for_admin_seed_review' | 'needs_more_source_structure' | 'missing_corpus';
    gates: Array<{ key: string; passed: boolean; reason: string }>;
  };
  candidates: SageKernelContentCandidate[];
  approvalDrafts: SageKernelApprovalDraft[];
  channelPlan: Array<{ channel: string; candidateCount: number; draftCount: number; purpose: string }>;
  antiFakeRules: string[];
  nextActions: string[];
  failures: string[];
};

type SourceFile = {
  absolutePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  textSample: string;
};

const INCLUDED_EXTENSIONS = new Set(['.md', '.txt', '.json', '.mjs', '.js', '.ts', '.yaml', '.yml']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'coverage', '.turbo']);
const IGNORED_FILES = new Set(['package-lock.json']);

const CHANNEL_PURPOSES: Record<string, string> = {
  'daily-signal': 'Short operating-system lessons that turn Sage Kernel concepts into one builder action.',
  'build-lab': 'Hands-on implementation prompts from loops, workers, orchestration, and proof-gate modules.',
  resources: 'Reusable runbooks, policies, schemas, quality gates, proof checklists, and security boundaries.',
  questions: 'Diagnostic prompts that help members reason about agent operations, tool design, and failure modes.',
  'office-hours': 'Live-session prompts around blockers, architecture decisions, operating contracts, and reviews.',
  'content-queue': 'Source-backed ideas for future lessons, articles, recaps, and public proof assets.',
};

export async function buildSageKernelContentHarness(options: {
  sourceRoot?: string;
  sourceFiles?: readonly SourceFile[];
  sourceCommit?: string;
  maxFiles?: number;
  candidateLimit?: number;
  draftLimit?: number;
} = {}): Promise<SageKernelContentHarnessResult> {
  const sourceRoot = options.sourceRoot ?? process.env.SAGE_KERNEL_ROOT ?? DEFAULT_SAGE_KERNEL_ROOT;
  const maxFiles = options.maxFiles ?? 8000;
  const candidateLimit = options.candidateLimit ?? 60;
  const draftLimit = options.draftLimit ?? 18;
  const generatedAt = new Date().toISOString();
  const failures: string[] = [];

  let files: SourceFile[] = options.sourceFiles ? options.sourceFiles.map((file) => ({ ...file })) : [];
  if (!options.sourceFiles) {
    try {
      files = await collectSourceFiles(sourceRoot, { maxFiles });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  const inventory = buildInventory(files);
  const candidates = selectBalancedCandidates(
    files
      .map(scoreSourceFile)
      .filter((candidate) => candidate.score >= 60)
      .sort(compareCandidates),
    candidateLimit,
  );
  const approvalDrafts = buildApprovalDrafts(candidates, draftLimit);
  const gates = [
    gate('corpus_exists', files.length > 0, 'sage-kernel source root is readable.'),
    gate('large_enough_corpus', inventory.fileCount >= 100, 'At least 100 source files are available.'),
    gate('docs_present', inventory.categories.docs >= 10, 'Documentation sources are present.'),
    gate('package_modules_present', inventory.packageCount >= 20, 'Implementation package sources are present.'),
    gate('evals_and_proof_present', inventory.categories.package_evals >= 2 && inventory.categories.package_proof >= 3, 'Eval and proof system modules are present.'),
    gate('candidate_volume_ready', candidates.length >= Math.min(candidateLimit, 20), 'At least 20 high-signal candidates are available.'),
    gate('approval_drafts_ready', approvalDrafts.length >= Math.min(draftLimit, 8), 'Approval-gated draft packets are available.'),
    gate('channel_balance_ready', countPopulatedChannels(candidates) >= 5, 'Candidates cover at least five Discord operating channels.'),
  ];
  const readinessScore = Math.round((gates.filter((item) => item.passed).length / gates.length) * 100);
  const status = files.length === 0
    ? 'missing_corpus'
    : readinessScore >= 85
      ? 'ready_for_admin_seed_review'
      : 'needs_more_source_structure';

  return {
    ok: failures.length === 0 && readinessScore >= 85,
    version: SAGE_KERNEL_CONTENT_HARNESS_VERSION,
    generatedAt,
    sourceRoot,
    mutationMode: 'read_only_external_repo_and_local_file_evidence_only',
    releaseMeaning: 'This harness reads the local sage-kernel clone and writes local evidence/draft packets only. It does not write Supabase rows, approve Discord knowledge, post to Discord, sync RAG, deploy, push, or satisfy live operating proof.',
    sourceCommit: options.sourceCommit ?? await readGitHead(sourceRoot),
    inventory,
    readiness: {
      score: readinessScore,
      targetScoreRange: '95-99',
      status,
      gates,
    },
    candidates,
    approvalDrafts,
    channelPlan: Object.entries(CHANNEL_PURPOSES).map(([channel, purpose]) => ({
      channel,
      candidateCount: candidates.filter((candidate) => candidate.proposedChannel === channel).length,
      draftCount: approvalDrafts.filter((draft) => draft.targetChannelBaseName === channel).length,
      purpose,
    })),
    antiFakeRules: [
      'sage-kernel candidates are source seeds only; they do not count as approved Discord knowledge until an admin approves the specific item.',
      'Planned draft packets do not count as live Discord posts, gateway capture, member participation, public proof, or RAG sync.',
      'Every public post must remain approval-gated, source-linked, quality-scored, and privacy-safe before publishing.',
      'No source file is promoted into authoritative RAG until an admin marks the exact candidate as approved knowledge.',
    ],
    nextActions: [
      'Review the approvalDrafts array and choose the first seed set for the Sage Ideas Discord admin queue.',
      'Convert selected drafts into pending approval records only after explicit live Supabase approval.',
      'After publishing, collect member replies and approve real questions, answers, builds, and resources separately.',
      'Use these source-backed drafts to teach operating-system thinking without claiming they are real community proof.',
    ],
    failures,
  };
}

async function collectSourceFiles(sourceRoot: string, options: { maxFiles: number }): Promise<SourceFile[]> {
  const rootStat = await stat(sourceRoot);
  if (!rootStat.isDirectory()) throw new Error(`sage-kernel source root is not a directory: ${sourceRoot}`);

  const files: SourceFile[] = [];
  async function walk(currentPath: string) {
    if (files.length >= options.maxFiles) return;
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (files.length >= options.maxFiles) return;
      if (entry.name.startsWith('.') && entry.name !== '.github') continue;
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(path.join(currentPath, entry.name));
        continue;
      }
      if (!entry.isFile() || IGNORED_FILES.has(entry.name)) continue;
      const absolutePath = path.join(currentPath, entry.name);
      const extension = path.extname(entry.name).toLowerCase();
      if (!INCLUDED_EXTENSIONS.has(extension)) continue;
      const fileStat = await stat(absolutePath);
      const text = await readFile(absolutePath, 'utf8').catch(() => '');
      files.push({
        absolutePath,
        relativePath: path.relative(sourceRoot, absolutePath),
        extension,
        sizeBytes: fileStat.size,
        textSample: text.slice(0, 6000),
      });
    }
  }

  await walk(sourceRoot);
  return files;
}

function buildInventory(files: SourceFile[]): SageKernelContentHarnessResult['inventory'] {
  const categories = {
    root_doc: 0,
    docs: 0,
    adr: 0,
    agent_profile: 0,
    dashboard: 0,
    mcp_server: 0,
    worker: 0,
    catalog: 0,
    package_core: 0,
    package_evals: 0,
    package_proof: 0,
    package_operate: 0,
    package_orchestration: 0,
    package_security: 0,
    package_intelligence: 0,
    package_other: 0,
    test: 0,
    other: 0,
  } satisfies Record<SageKernelContentCategory, number>;

  for (const file of files) categories[classifySource(file.relativePath)] += 1;

  return {
    fileCount: files.length,
    markdownCount: files.filter((file) => file.extension === '.md' || file.extension === '.txt').length,
    jsonCount: files.filter((file) => file.extension === '.json').length,
    moduleCount: files.filter((file) => ['.mjs', '.js', '.ts'].includes(file.extension)).length,
    testCount: files.filter((file) => file.relativePath.startsWith('tests/') || /(^|\/)(test|spec)[\w.-]*/.test(path.basename(file.relativePath))).length,
    packageCount: files.filter((file) => file.relativePath.startsWith('packages/')).length,
    categories,
  };
}

function scoreSourceFile(file: SourceFile): SageKernelContentCandidate {
  const category = classifySource(file.relativePath);
  const title = extractTitle(file);
  const text = `${file.relativePath}\n${title}\n${file.textSample}`;
  const lower = text.toLowerCase();
  const reasons: string[] = [];
  const humanAppealScore = scoreKeywords(lower, [
    'getting started',
    'guide',
    'workflow',
    'dashboard',
    'command',
    'prompt',
    'template',
    'checklist',
    'example',
    'operator',
    'runbook',
    'visual',
  ], reasons, 'human');
  const institutionalScore = scoreKeywords(lower, [
    'proof',
    'policy',
    'schema',
    'test',
    'eval',
    'audit',
    'security',
    'contract',
    'durable',
    'approval',
    'boundary',
    'observability',
  ], reasons, 'institutional');
  const discordFitScore = scoreDiscordFit(file, lower, reasons);
  const categoryBonus = ['docs', 'adr', 'package_core', 'package_evals', 'package_proof', 'package_operate', 'package_orchestration', 'package_security', 'package_intelligence'].includes(category) ? 10 : 0;
  if (categoryBonus) reasons.push(`category_bonus:${category}`);
  const score = Math.min(100, humanAppealScore + institutionalScore + discordFitScore + categoryBonus);
  const { proposedChannel, proposedContentType } = proposeDiscordTarget(file.relativePath, lower);

  return {
    sourcePath: file.relativePath,
    title,
    category,
    proposedChannel,
    proposedContentType,
    score,
    humanAppealScore,
    institutionalScore,
    discordFitScore,
    reasons,
    operatingProofEligible: false,
  };
}

function buildApprovalDrafts(candidates: SageKernelContentCandidate[], draftLimit: number): SageKernelApprovalDraft[] {
  return selectBalancedCandidates(candidates, draftLimit).map((candidate, index) => {
    const draftKey = `sage-kernel:${candidate.sourcePath}`;
    const title = `${draftTitlePrefix(candidate.proposedContentType)} - ${candidate.title}`;
    const body = [
      `# ${title}`,
      `**Source:** sage-kernel/${candidate.sourcePath}`,
      `**Why it matters:** This turns a real operating-system artifact into one concrete builder action for Sage Ideas members.`,
      `**Action:** ${actionForCandidate(candidate)}`,
      `**Member deliverable:** Post the artifact, decision, blocker, or checklist item that proves you applied it.`,
      '',
      'How to participate:',
      '1. Read the source-backed prompt.',
      '2. Ship or explain one specific artifact.',
      '3. Include context, failure mode, and what needs review.',
      '',
      'Review note: this is a planned source seed. It must be reviewed by an admin before publishing and does not count as approved Discord knowledge or public proof until live evidence exists.',
    ].join('\n');
    return {
      draftKey,
      sourcePath: candidate.sourcePath,
      sourceTitle: candidate.title,
      targetChannelBaseName: candidate.proposedChannel,
      draftType: candidate.proposedContentType,
      title,
      body,
      qualityScore: qualityScoreForDraft(candidate, body),
      status: 'planned_for_admin_review',
      operatingContract: {
        sourceKind: 'sage_kernel_source_seed',
        adminAction: 'review_then_approve_or_reject',
        publishAllowedBeforeApproval: false,
        operatingProofEligible: false,
        requiredReviewChecks: [
          'source path is real and privacy-safe',
          'draft has one concrete member action',
          'draft does not claim live proof',
          'draft is appropriate for the target Discord channel',
          'factual claims stay grounded in the source artifact',
        ],
        proofLaneTargets: index % 3 === 0
          ? ['approved_discord_knowledge', 'rag_discord_sources', 'public_proof_assets']
          : ['approved_discord_knowledge', 'rag_discord_sources'],
        collectionInstruction: 'After admin approval and publishing, collect member replies with source path, published Discord message id, privacy status, admin reviewer, and whether the reply can become a RAG candidate.',
      },
    };
  });
}

function classifySource(relativePath: string): SageKernelContentCategory {
  if (!relativePath.includes('/')) return 'root_doc';
  if (relativePath.startsWith('docs/adr/')) return 'adr';
  if (relativePath.startsWith('docs/')) return 'docs';
  if (relativePath.startsWith('agents/profiles/')) return 'agent_profile';
  if (relativePath.startsWith('apps/dashboard/')) return 'dashboard';
  if (relativePath.startsWith('apps/mcp-server/')) return 'mcp_server';
  if (relativePath.startsWith('apps/worker/')) return 'worker';
  if (relativePath.startsWith('catalog/')) return 'catalog';
  if (relativePath.startsWith('tests/')) return 'test';
  if (relativePath.startsWith('packages/core/')) return 'package_core';
  if (relativePath.startsWith('packages/evals/')) return 'package_evals';
  if (relativePath.startsWith('packages/proof/')) return 'package_proof';
  if (relativePath.startsWith('packages/operate/')) return 'package_operate';
  if (relativePath.startsWith('packages/orchestration/')) return 'package_orchestration';
  if (relativePath.startsWith('packages/security/') || relativePath.startsWith('packages/risk/')) return 'package_security';
  if (relativePath.startsWith('packages/intelligence/')) return 'package_intelligence';
  if (relativePath.startsWith('packages/')) return 'package_other';
  return 'other';
}

function extractTitle(file: SourceFile): string {
  const heading = file.textSample.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 120);
  return path.basename(file.relativePath, path.extname(file.relativePath)).replace(/[_-]+/g, ' ').trim().slice(0, 120);
}

function proposeDiscordTarget(relativePath: string, lower: string): Pick<SageKernelContentCandidate, 'proposedChannel' | 'proposedContentType'> {
  if (/getting_started|using_sage_kernel|engineering_loop|quality_ratchet|runtime_engine|visual_guide|roadmap/i.test(relativePath)) {
    return { proposedChannel: 'daily-signal', proposedContentType: 'daily_signal' };
  }
  if (/security|policy|proof|schema|audit|eval|quality|adr|contract|boundary|mcp|resource|readme/i.test(relativePath)) {
    return { proposedChannel: 'resources', proposedContentType: 'resource_drop' };
  }
  if (/orchestration|worker|jobs|loops|operate|daemon|repair|runtime|harness|workflow/i.test(relativePath)) {
    return { proposedChannel: 'build-lab', proposedContentType: 'challenge' };
  }
  if (/dashboard|cockpit|companion|brain|intelligence|memory|knowledge|profile/i.test(relativePath)) {
    return { proposedChannel: 'content-queue', proposedContentType: 'lesson' };
  }
  if (/issue_template|pull_request|question|prompt|diagnose|review/i.test(relativePath) || /question|diagnostic|review prompt/.test(lower)) {
    return { proposedChannel: 'questions', proposedContentType: 'quiz' };
  }
  if (/release|runbook|incident|guard|blocker|approval/i.test(relativePath) || /office hours|blocker|decision needed/.test(lower)) {
    return { proposedChannel: 'office-hours', proposedContentType: 'office_hours_prompt' };
  }
  return { proposedChannel: 'content-queue', proposedContentType: 'lesson' };
}

function scoreKeywords(text: string, keywords: string[], reasons: string[], prefix: string): number {
  const hits = keywords.filter((keyword) => text.includes(keyword));
  if (hits.length) reasons.push(`${prefix}:${hits.slice(0, 5).join(',')}`);
  return Math.min(30, hits.length * 5);
}

function scoreDiscordFit(file: SourceFile, lower: string, reasons: string[]): number {
  let score = 0;
  if (file.extension === '.md' || file.extension === '.txt') {
    score += 10;
    reasons.push('discord_fit:readable_markdown');
  }
  if (/readme\.md$|getting_started|usage|install|architecture|engineering_loop|quality_ratchet/i.test(file.relativePath)) {
    score += 10;
    reasons.push('discord_fit:member_friendly_entrypoint');
  }
  if (/(checklist|template|runbook|prompt|workflow|question|quality gate|proof gate)/i.test(file.relativePath) || /(checklist|template|runbook|prompt|workflow|question|quality gate|proof gate)/i.test(lower)) {
    score += 15;
    reasons.push('discord_fit:promptable_asset');
  }
  return Math.min(30, score);
}

function selectBalancedCandidates(candidates: SageKernelContentCandidate[], limit: number): SageKernelContentCandidate[] {
  const preferredChannels = ['daily-signal', 'build-lab', 'resources', 'questions', 'office-hours', 'content-queue'];
  const minimumPerChannel = Math.max(1, Math.min(4, Math.floor(limit / preferredChannels.length)));
  const selected: SageKernelContentCandidate[] = [];
  const selectedPaths = new Set<string>();

  for (const channel of preferredChannels) {
    for (const candidate of candidates.filter((item) => item.proposedChannel === channel).slice(0, minimumPerChannel)) {
      if (selected.length >= limit) return selected.sort(compareCandidates);
      selected.push(candidate);
      selectedPaths.add(candidate.sourcePath);
    }
  }

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    if (selectedPaths.has(candidate.sourcePath)) continue;
    selected.push(candidate);
    selectedPaths.add(candidate.sourcePath);
  }

  return selected.sort(compareCandidates);
}

function countPopulatedChannels(candidates: SageKernelContentCandidate[]): number {
  return new Set(candidates.map((candidate) => candidate.proposedChannel)).size;
}

function compareCandidates(left: SageKernelContentCandidate, right: SageKernelContentCandidate): number {
  return right.score - left.score || left.sourcePath.localeCompare(right.sourcePath);
}

function draftTitlePrefix(type: SageKernelContentCandidate['proposedContentType']): string {
  if (type === 'daily_signal') return 'Daily Signal';
  if (type === 'challenge') return 'Build Lab';
  if (type === 'resource_drop') return 'Resource Drop';
  if (type === 'quiz') return 'Question';
  if (type === 'office_hours_prompt') return 'Office Hours';
  return 'Content Seed';
}

function actionForCandidate(candidate: SageKernelContentCandidate): string {
  if (candidate.proposedContentType === 'challenge') return 'Turn this operating-system pattern into a small artifact: a config, checklist, runbook, test, or dashboard card.';
  if (candidate.proposedContentType === 'resource_drop') return 'Extract one reusable rule, checklist, or review standard and apply it to your current build.';
  if (candidate.proposedContentType === 'quiz') return 'Answer the diagnostic question, then name the evidence that would prove the answer.';
  if (candidate.proposedContentType === 'office_hours_prompt') return 'Bring one blocker or decision that this source artifact helps resolve.';
  if (candidate.proposedContentType === 'daily_signal') return 'Apply one source-backed operating principle to today’s build and post the concrete result.';
  return 'Convert the source idea into a useful lesson, prompt, or member discussion starter.';
}

function qualityScoreForDraft(candidate: SageKernelContentCandidate, body: string): number {
  let score = 70;
  if (candidate.score >= 80) score += 10;
  if (body.includes('**Source:**')) score += 5;
  if (body.includes('**Action:**')) score += 5;
  if (body.includes('**Member deliverable:**')) score += 5;
  if (body.includes('does not count as approved Discord knowledge')) score += 5;
  return Math.min(100, score);
}

async function readGitHead(sourceRoot: string): Promise<string | null> {
  const headPath = path.join(sourceRoot, '.git', 'HEAD');
  const head = await readFile(headPath, 'utf8').catch(() => null);
  if (!head) return null;
  const trimmed = head.trim();
  if (!trimmed.startsWith('ref: ')) return trimmed;
  const refPath = path.join(sourceRoot, '.git', trimmed.slice(5));
  return (await readFile(refPath, 'utf8').catch(() => null))?.trim() ?? null;
}

function gate(key: string, passed: boolean, reason: string) {
  return { key, passed, reason };
}
