import { NextResponse } from 'next/server';
import type { HealthStatus, QualityHistory, QualityMetricsSnapshot, QualityProjectMetric } from '@/lib/qualityMetrics';
import { mergeQaMetricsIntoProject, tryFetchQaMetrics } from '@/lib/githubArtifacts';

export const dynamic = 'force-dynamic';

// Live GitHub-backed endpoint.
// - Uses server-side token if present.
// - Caches in memory for a short time to avoid rate limiting.
// - Falls back to the static snapshot if GitHub fails.

const OWNER = process.env.QUALITY_GITHUB_OWNER || 'JasonTeixeira';
const REPOS = (process.env.QUALITY_GITHUB_REPOS || [
  'qa-portfolio',
  'E2E-Framework',
  'API-Test-Automation-Wireframe',
  'CI-CD-Pipeline',
  'Performance-Testing-Framework',
  'Mobile-Testing-Framework',
  'BDD-Cucumber-Framework',
  'visual-regression-testing-suite',
  'Security-Testing-Suite',
].join(','))
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const TOKEN =
  process.env.GITHUB_TOKEN ||
  process.env.GH_TOKEN ||
  process.env.QUALITY_GITHUB_TOKEN;

// Prefer the dedicated dashboard token if present.
const WRITE_TOKEN = process.env.QUALITY_GITHUB_TOKEN;

const CACHE_TTL_MS = 60_000; // 1 minute
let liveCache: { ts: number; data: QualityMetricsSnapshot } | null = null;
let historyCache: { ts: number; data: QualityHistory } | null = null;

async function ghFetch(url: string) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      'X-GitHub-Api-Version': '2022-11-28',
    },
    // Keep server-side caching explicit.
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

function ensureDefaults(metric: QualityProjectMetric): QualityProjectMetric {
  return {
    ...metric,
    tests: metric.tests ?? {},
    performance: {
      ...(metric.performance ?? {}),
      lighthouse: {
        ...(metric.performance?.lighthouse ?? {}),
      },
    },
    security: metric.security ?? {},
  };
}

async function getRepoMetric(repo: string): Promise<QualityProjectMetric> {
  const runs = await ghFetch(
    `https://api.github.com/repos/${OWNER}/${repo}/actions/runs?per_page=1`
  );
  const latest = runs?.workflow_runs?.[0];

  const status: HealthStatus =
    latest?.conclusion === 'success'
      ? 'healthy'
      : latest?.conclusion
        ? 'degraded'
        : 'down';

  const type: QualityProjectMetric['type'] = repo === 'qa-portfolio' ? 'portfolio' : 'project';

  const baseMetric: QualityProjectMetric = ensureDefaults({
    name: repo,
    repo: `${OWNER}/${repo}`,
    type,
    status,
    lastRun: latest?.updated_at || latest?.created_at,
    ci: {
      runsUrl: `https://github.com/${OWNER}/${repo}/actions`,
    },
  });

  try {
    const qa = await tryFetchQaMetrics({ owner: OWNER, repo, token: WRITE_TOKEN || TOKEN });
    if ('metrics' in qa && qa.metrics) {
      return {
        ...mergeQaMetricsIntoProject(baseMetric, qa.metrics),
        ci: {
          ...(baseMetric.ci ?? {}),
          runsUrl: qa.ctx.runsUrl,
          // Prefer the run that actually matched the artifact (if we had to scan back).
          reportUrl: qa.ctx.matchedRunUrl || qa.ctx.runUrl,
        },
        debug: {
          source: 'live',
          scannedRuns: qa.ctx.scannedRuns,
          latestRunId: qa.ctx.runId,
          latestRunUrl: qa.ctx.runUrl,
          matchedRunId: qa.ctx.matchedRunId,
          matchedRunUrl: qa.ctx.matchedRunUrl,
          matchedArtifactName: qa.ctx.matchedArtifactName,
        },
      };
    }

    return {
      ...baseMetric,
      ci: {
        ...(baseMetric.ci ?? {}),
        runsUrl: qa.ctx.runsUrl,
        reportUrl: qa.ctx.matchedRunUrl || qa.ctx.runUrl,
      },
      notes: 'notes' in qa ? qa.notes : undefined,
      debug: {
        source: 'live',
        scannedRuns: qa.ctx.scannedRuns,
        latestRunId: qa.ctx.runId,
        latestRunUrl: qa.ctx.runUrl,
        matchedRunId: qa.ctx.matchedRunId,
        matchedRunUrl: qa.ctx.matchedRunUrl,
        matchedArtifactName: qa.ctx.matchedArtifactName,
      },
    };
  } catch {
    return baseMetric;
  }
}


async function isTokenValid() {
  if (!TOKEN) return false;
  try {
    await ghFetch('https://api.github.com/user');
    return true;
  } catch {
    return false;
  }
}

async function getStaticSnapshot(): Promise<QualityMetricsSnapshot> {
  // Load from disk so it works in dev/prod without relying on another HTTP hop.
  // Note: in serverless, reading from the deployed bundle works for public assets.
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');

  try {
    const filePath = join(process.cwd(), 'public', 'quality', 'metrics.json');
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        overallStatus: 'degraded',
        notes: 'Live metrics failed and snapshot fallback was unavailable.',
      },
      projects: [],
    };
  }
}

async function getStaticHistory(): Promise<QualityHistory> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');

  try {
    const filePath = join(process.cwd(), 'public', 'quality', 'history.json');
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'latest';

  if (mode === 'history') {
    const now = Date.now();
    if (historyCache && now - historyCache.ts < CACHE_TTL_MS) {
      return NextResponse.json(historyCache.data, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    // For now we serve history from the committed file.
    // Later we can swap this to an on-demand GitHub query or a DB.
    const history = await getStaticHistory();
    historyCache = { ts: now, data: history };
    return NextResponse.json(history, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  if (mode === 'snapshot') {
    const snapshot = await getStaticSnapshot();
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const now = Date.now();
  if (liveCache && now - liveCache.ts < CACHE_TTL_MS) {
    return NextResponse.json(liveCache.data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    // In local dev, users often add tokens to .env.local after starting the server.
    // If the token isn't actually loaded into this running process, fall back quickly.
    if (TOKEN && !(await isTokenValid())) {
      throw new Error('GitHub token invalid or not loaded into process');
    }

    const generatedAt = new Date().toISOString();
    const projects = await Promise.all(REPOS.map((r) => getRepoMetric(r)));

    const overallStatus: HealthStatus = projects.some((p) => p.status === 'down')
      ? 'down'
      : projects.some((p) => p.status === 'degraded')
          ? 'degraded'
          : 'healthy';

    const data: QualityMetricsSnapshot = {
      generatedAt,
      summary: {
        overallStatus,
        notes: TOKEN
          ? 'Live metrics from GitHub Actions (server-side).'
          : 'Live metrics from GitHub Actions (unauthenticated; rate limits may apply).',
      },
      projects,
    };

    liveCache = { ts: now, data };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    const fallback = await getStaticSnapshot();
    const data: QualityMetricsSnapshot = {
      ...fallback,
      summary: {
        ...(fallback.summary || {}),
        overallStatus: 'degraded',
        notes:
          'Live GitHub metrics failed; showing the last known snapshot instead.',
      },
    };
    liveCache = { ts: now, data };
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
