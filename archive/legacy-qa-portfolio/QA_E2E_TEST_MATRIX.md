\# QA Portfolio — E2E Test Matrix

This doc is the **source of truth** for what we verify end-to-end in this portfolio.

## Goals
- Ensure **every route renders** and critical content is present.
- Ensure **dynamic routes** (projects/blog) resolve for every configured slug/id.
- Ensure **downloads** (recruiter pack, artifacts, resume) return 200 and correct content type.
- Ensure key **backend contracts** (`/api/quality`) return expected shapes.
- Ensure **no dead content**: every referenced artifact file exists.

## Routes inventory

### Static pages
- `/`
- `/about`
- `/platform`
- `/platform/quality-telemetry`
- `/dashboard`
- `/projects`
- `/artifacts`
- `/blog`
- `/contact`
- `/resume` (redirects to `/resume.pdf`)

### Dynamic pages
- `/projects/[slug]` (all slugs in `lib/projectsData.ts`)
- `/blog/[id]` (all ids in `lib/blogData.ts`)

## Test coverage map

| Area | What we assert | Where it lives |
|---|---|---|
| Smoke navigation | Top nav routes return 200 and render expected headings | `tests/ui/smoke.spec.ts` + `tests/ui/routes.spec.ts` |
| Dynamic content | All project slugs + blog IDs render and have title content | `tests/ui/routes.spec.ts` |
| Downloads | Recruiter pack + artifacts + evidence images return 200 | `tests/ui/smoke.spec.ts` + `tests/ui/routes.spec.ts` |
| API contract | `/api/quality` shape + caching + history mode | `tests/ui/api-quality.spec.ts` |
| Accessibility | Axe checks on key pages | `tests/ui/a11y.spec.ts` |
| Link integrity | Crawl internal links + verify artifact files | `scripts/check-links.mjs` (`npm run test:links`) |
| Performance budgets | Lighthouse CI thresholds | `lighthouserc.json` (`npm run test:lh`) |
| Content validation (no dead refs) | Every artifact downloadPath exists, every project proof path exists | `scripts/validate-content.mjs` (`npm run validate`) |

## Notes
- We prefer stable selectors (`data-testid`) where needed.
- We keep assertions **high signal**: check that pages contain their primary headings and at least one unique element.
