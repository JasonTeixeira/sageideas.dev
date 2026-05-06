# QA Metrics Schema (qa-metrics.json)

This portfolio uses a lightweight, repo-agnostic artifact format so the **Quality Dashboard** can ingest real, evidence-backed numbers.

## Artifact name
Upload an artifact called:

**`qa-metrics`**

containing a single file:

**`qa-metrics.json`**

## JSON shape
```json
{
  "generatedAt": "2026-01-07T00:00:00.000Z",
  "repo": "JasonTeixeira/qa-portfolio",
  "branch": "main",
  "commit": "abc123...",
  "runId": 123456789,
  "tests": {
    "total": 120,
    "pass": 118,
    "fail": 2,
    "passRate": 0.9833,
    "flakeRate": 0.01
  },
  "coverage": {
    "lines": 0.72
  },
  "lighthouse": {
    "performance": 0.96,
    "accessibility": 0.98,
    "bestPractices": 0.96,
    "seo": 0.97
  },
  "security": {
    "critical": 0,
    "high": 0,
    "medium": 1,
    "low": 4
  },
  "artifacts": {
    "playwrightReport": "playwright-report",
    "lighthouseReport": "lighthouse-report"
  }
}
```

### Notes
- All numeric scores are **0..1** (same as Lighthouse/LHCI output).
- Any section can be omitted if a repo doesn’t support it yet.
- `artifacts.*` are optional friendly names for other uploaded artifacts.

## Minimum recommended signals
For each repo, aim to produce:
- `tests.total` + `tests.passRate`
- `generatedAt`, `repo`, `branch`, `commit`, `runId`

## Why this schema exists
Hiring managers trust dashboards when they can trace:
**UI → metric → workflow run → artifact evidence**.
