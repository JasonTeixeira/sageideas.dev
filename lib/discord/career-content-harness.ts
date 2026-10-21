import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const CAREER_CONTENT_HARNESS_VERSION = 'career-content-harness-v1';
export const DEFAULT_CAREER_OS_ROOT = '/Users/Sage/AI_CAREER_OPERATING_SYSTEM';

export type CareerContentCategory =
  | 'course'
  | 'practice'
  | 'learning_engine'
  | 'operating_system'
  | 'course_factory'
  | 'curriculum_architecture'
  | 'agent_template'
  | 'root_doc'
  | 'other';

export type CareerContentCandidate = {
  sourcePath: string;
  title: string;
  category: CareerContentCategory;
  proposedChannel: string;
  proposedContentType: 'daily_signal' | 'challenge' | 'resource_drop' | 'quiz' | 'lesson' | 'office_hours_prompt';
  score: number;
  humanAppealScore: number;
  institutionalScore: number;
  discordFitScore: number;
  reasons: string[];
  operatingProofEligible: false;
};

export type CareerContentHarnessResult = {
  ok: boolean;
  version: typeof CAREER_CONTENT_HARNESS_VERSION;
  generatedAt: string;
  mutationMode: 'read_only_external_corpus_and_local_file_evidence_only';
  releaseMeaning: string;
  sourceRoot: string;
  inventory: {
    fileCount: number;
    markdownCount: number;
    jsonCount: number;
    pythonCount: number;
    courseManifestCount: number;
    practiceDrillCount: number;
    testDrillCount: number;
    categories: Record<CareerContentCategory, number>;
  };
  readiness: {
    score: number;
    targetScoreRange: '95-99';
    status: 'ready_for_admin_seed_review' | 'needs_more_source_structure' | 'missing_corpus';
    gates: Array<{ key: string; passed: boolean; reason: string }>;
  };
  candidates: CareerContentCandidate[];
  channelPlan: Array<{
    channel: string;
    candidateCount: number;
    purpose: string;
  }>;
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

const INCLUDED_EXTENSIONS = new Set(['.md', '.txt', '.json', '.py', '.yaml', '.yml']);
const IGNORED_DIRS = new Set([
  '.git',
  '__pycache__',
  'node_modules',
  '.next',
  '_archive',
  'archive',
  'application_archive',
  'ebook_pipeline',
  'data',
]);

const CHANNEL_PURPOSES: Record<string, string> = {
  'daily-signal': 'Short daily build prompts from high-signal source material.',
  'build-lab': 'Hands-on challenges, labs, projects, and capstone prompts.',
  resources: 'Reusable rubrics, templates, checklists, validators, and reference material.',
  questions: 'Discussion prompts and diagnostic questions that can become durable knowledge.',
  'office-hours': 'Live-session prompts built around blockers, artifacts, and decision points.',
  'content-queue': 'Source-backed ideas for future articles, lessons, public proof, and recaps.',
  'project-submissions': 'Artifact-driven submission prompts and portfolio proof tasks.',
};

export async function buildCareerContentHarness(options: {
  sourceRoot?: string;
  sourceFiles?: readonly SourceFile[];
  maxFiles?: number;
  candidateLimit?: number;
} = {}): Promise<CareerContentHarnessResult> {
  const sourceRoot = options.sourceRoot ?? process.env.SAGE_CAREER_OS_ROOT ?? DEFAULT_CAREER_OS_ROOT;
  const generatedAt = new Date().toISOString();
  const failures: string[] = [];
  const maxFiles = options.maxFiles ?? 12000;
  const candidateLimit = options.candidateLimit ?? 50;

  let files: SourceFile[] = options.sourceFiles ? options.sourceFiles.map((file) => ({ ...file })) : [];
  if (!options.sourceFiles) {
    try {
      files = await collectSourceFiles(sourceRoot, { maxFiles });
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }

  const scoredCandidates = files
    .map(scoreSourceFile)
    .filter((candidate) => candidate.score >= 60)
    .sort(compareCandidates);
  const candidates = selectBalancedCandidates(scoredCandidates, candidateLimit);

  const inventory = buildInventory(files);
  const gates = [
    gate('corpus_exists', files.length > 0, 'Career OS corpus root is readable.'),
    gate('large_enough_corpus', inventory.fileCount >= 100, 'At least 100 source files are available for seed generation.'),
    gate('course_manifests_present', inventory.courseManifestCount >= 15, 'At least 15 course manifests are present.'),
    gate('practice_drills_present', inventory.practiceDrillCount >= 40, 'At least 40 practice drill files are present.'),
    gate('candidate_volume_ready', candidates.length >= Math.min(candidateLimit, 20), 'At least 20 high-signal Discord seed candidates are available.'),
    gate('institutional_sources_present', inventory.categories.learning_engine >= 10 && inventory.categories.curriculum_architecture >= 10, 'Learning-engine and curriculum architecture sources are present.'),
    gate('human_appeal_sources_present', candidates.some((candidate) => candidate.humanAppealScore >= 30), 'At least one candidate has strong human appeal.'),
  ];
  const passed = gates.filter((item) => item.passed).length;
  const readinessScore = Math.round((passed / gates.length) * 100);
  const status = files.length === 0
    ? 'missing_corpus'
    : readinessScore >= 85
      ? 'ready_for_admin_seed_review'
      : 'needs_more_source_structure';

  const channelCounts = new Map<string, number>();
  for (const candidate of candidates) {
    channelCounts.set(candidate.proposedChannel, (channelCounts.get(candidate.proposedChannel) ?? 0) + 1);
  }

  return {
    ok: failures.length === 0 && readinessScore >= 85,
    version: CAREER_CONTENT_HARNESS_VERSION,
    generatedAt,
    mutationMode: 'read_only_external_corpus_and_local_file_evidence_only',
    releaseMeaning: 'This harness reads the AI Career Operating System corpus and writes local evidence only. It does not write Supabase rows, approve Discord knowledge, post to Discord, sync RAG, or satisfy live operating proof.',
    sourceRoot,
    inventory,
    readiness: {
      score: readinessScore,
      targetScoreRange: '95-99',
      status,
      gates,
    },
    candidates,
    channelPlan: Object.entries(CHANNEL_PURPOSES).map(([channel, purpose]) => ({
      channel,
      candidateCount: channelCounts.get(channel) ?? 0,
      purpose,
    })),
    antiFakeRules: [
      'Career OS source candidates are seed material only; they do not count as approved Discord knowledge until an admin approves the specific item.',
      'Seed candidates do not count as live gateway capture, member participation, public proof, or premium workflow proof.',
      'Generated Discord posts must remain approval-gated and quality-scored before publishing.',
      'Only privacy-safe, reviewed, source-linked outputs can be promoted into authoritative RAG.',
    ],
    nextActions: [
      'Review top candidates and select the first weekly content seed set.',
      'Turn selected seed candidates into approval-gated Discord drafts, not live posts.',
      'After member replies arrive, approve real member questions/answers separately before syncing them into authoritative RAG.',
      'Use this corpus as educational fuel while keeping operating-proof lanes tied to real Discord activity.',
    ],
    failures,
  };
}

async function collectSourceFiles(sourceRoot: string, options: { maxFiles: number }): Promise<SourceFile[]> {
  const rootStat = await stat(sourceRoot);
  if (!rootStat.isDirectory()) throw new Error(`Career OS source root is not a directory: ${sourceRoot}`);

  const files: SourceFile[] = [];
  async function walk(currentPath: string) {
    if (files.length >= options.maxFiles) return;
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (files.length >= options.maxFiles) return;
      if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(path.join(currentPath, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
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

function buildInventory(files: SourceFile[]): CareerContentHarnessResult['inventory'] {
  const categories = {
    course: 0,
    practice: 0,
    learning_engine: 0,
    operating_system: 0,
    course_factory: 0,
    curriculum_architecture: 0,
    agent_template: 0,
    root_doc: 0,
    other: 0,
  } satisfies Record<CareerContentCategory, number>;

  for (const file of files) categories[classifySource(file.relativePath)] += 1;

  return {
    fileCount: files.length,
    markdownCount: files.filter((file) => file.extension === '.md' || file.extension === '.txt').length,
    jsonCount: files.filter((file) => file.extension === '.json').length,
    pythonCount: files.filter((file) => file.extension === '.py').length,
    courseManifestCount: files.filter((file) => /(^|\/)course_manifest\.json$/.test(file.relativePath)).length,
    practiceDrillCount: files.filter((file) => /(^|\/)day_\d+_/.test(file.relativePath) && !/test_day_/.test(file.relativePath)).length,
    testDrillCount: files.filter((file) => /(^|\/)test_day_\d+_/.test(file.relativePath)).length,
    categories,
  };
}

function scoreSourceFile(file: SourceFile): CareerContentCandidate {
  const category = classifySource(file.relativePath);
  const title = extractTitle(file);
  const text = `${file.relativePath}\n${title}\n${file.textSample}`;
  const lower = text.toLowerCase();
  const reasons: string[] = [];

  const humanAppealScore = scoreKeywords(lower, [
    'project',
    'lab',
    'challenge',
    'interview',
    'portfolio',
    'capstone',
    'diagnostic',
    'weekly',
    'blocker',
    'practice',
  ], reasons, 'human');
  const institutionalScore = scoreKeywords(lower, [
    'manifest',
    'rubric',
    'validator',
    'test',
    'audit',
    'scorecard',
    'contract',
    'runbook',
    'schema',
    'evidence',
  ], reasons, 'institutional');
  const discordFitScore = scoreDiscordFit(file, lower, reasons);
  const categoryBonus = ['course', 'practice', 'learning_engine', 'curriculum_architecture'].includes(category) ? 10 : 0;
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

function classifySource(relativePath: string): CareerContentCategory {
  if (relativePath.startsWith('courses/')) return 'course';
  if (relativePath.startsWith('practice/')) return 'practice';
  if (relativePath.startsWith('learning_engine/')) return 'learning_engine';
  if (relativePath.startsWith('operating_systems/')) return 'operating_system';
  if (relativePath.startsWith('course_factory/')) return 'course_factory';
  if (relativePath.startsWith('curriculum_architecture/')) return 'curriculum_architecture';
  if (relativePath.startsWith('agents_md_templates/')) return 'agent_template';
  if (!relativePath.includes('/')) return 'root_doc';
  return 'other';
}

function extractTitle(file: SourceFile): string {
  const heading = file.textSample.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 120);
  return path.basename(file.relativePath, path.extname(file.relativePath)).replace(/[_-]+/g, ' ').trim().slice(0, 120);
}

function scoreKeywords(text: string, keywords: string[], reasons: string[], prefix: string): number {
  const hits = keywords.filter((keyword) => text.includes(keyword));
  if (hits.length) reasons.push(`${prefix}:${hits.slice(0, 5).join(',')}`);
  return Math.min(30, hits.length * 6);
}

function scoreDiscordFit(file: SourceFile, lower: string, reasons: string[]): number {
  let score = 0;
  if (file.extension === '.md' || file.extension === '.txt') {
    score += 10;
    reasons.push('discord_fit:readable_markdown');
  }
  if (/readme\.md$|00_course_map\.md$|01_learning_path\.md$|02_diagnostic\.md$/.test(file.relativePath)) {
    score += 10;
    reasons.push('discord_fit:member_friendly_entrypoint');
  }
  if (/day_\d+_/.test(file.relativePath)) {
    score += 15;
    reasons.push('discord_fit:daily_drill');
  }
  if (/(template|checklist|rubric|worksheet|prompt|question)/i.test(file.relativePath) || /(template|checklist|rubric|worksheet|prompt|question)/i.test(lower)) {
    score += 15;
    reasons.push('discord_fit:promptable_asset');
  }
  return Math.min(30, score);
}

function proposeDiscordTarget(relativePath: string, lower: string): Pick<CareerContentCandidate, 'proposedChannel' | 'proposedContentType'> {
  if (/course_manifest|course_map|learning_path|readme/i.test(relativePath)) {
    return { proposedChannel: 'daily-signal', proposedContentType: 'daily_signal' };
  }
  if (/content|brand|marketing|social/i.test(relativePath)) {
    return { proposedChannel: 'content-queue', proposedContentType: 'lesson' };
  }
  if (/rubric|template|runbook|checklist|reference|schema|validator|scorecard/i.test(relativePath)) {
    return { proposedChannel: 'resources', proposedContentType: 'resource_drop' };
  }
  if (/office|live|blocker|session/i.test(relativePath) || /office|live|blocker|session/.test(lower)) {
    return { proposedChannel: 'office-hours', proposedContentType: 'office_hours_prompt' };
  }
  if (/day_\d+_py_|day_\d+_sql_|challenge|lab|capstone|project/i.test(relativePath)) {
    return { proposedChannel: 'build-lab', proposedContentType: 'challenge' };
  }
  if (/diagnostic|question|interview|worksheet/i.test(relativePath) || /diagnostic|question|interview|worksheet/.test(lower)) {
    return { proposedChannel: 'questions', proposedContentType: 'quiz' };
  }
  return { proposedChannel: 'content-queue', proposedContentType: 'lesson' };
}

function selectBalancedCandidates(candidates: CareerContentCandidate[], limit: number): CareerContentCandidate[] {
  const preferredChannels = ['daily-signal', 'build-lab', 'resources', 'questions', 'office-hours', 'content-queue', 'project-submissions'];
  const minimumPerChannel = Math.max(1, Math.min(5, Math.floor(limit / preferredChannels.length)));
  const selected: CareerContentCandidate[] = [];
  const selectedPaths = new Set<string>();

  for (const channel of preferredChannels) {
    const channelCandidates = candidates.filter((candidate) => candidate.proposedChannel === channel).slice(0, minimumPerChannel);
    for (const candidate of channelCandidates) {
      if (selected.length >= limit) return selected;
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

function compareCandidates(left: CareerContentCandidate, right: CareerContentCandidate): number {
  return right.score - left.score || left.sourcePath.localeCompare(right.sourcePath);
}

function gate(key: string, passed: boolean, reason: string) {
  return { key, passed, reason };
}
