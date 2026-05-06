# Ops Readiness — Quality Dashboard (Interview-Grade)

This document is the “show your work” proof that the **Quality Dashboard** and its AWS telemetry backend are production-minded: tested, observable, secure-by-design, and verifiable.

## Architecture (Cloud mode)

**Goal:** show real cloud telemetry without storing AWS credentials in the public site runtime.

**Flow:**

1. `https://sageideas.dev/dashboard` loads and requests metrics
2. Next.js API route: `GET /api/quality?mode=aws`
3. The server uses `QUALITY_AWS_PROXY_URL` to call the AWS proxy API
4. AWS proxy API (`api.sageideas.dev`): **API Gateway → Lambda**
5. Lambda reads `s3://qa-portfolio-dev-qa-metrics/metrics/qa-portfolio/latest.json` and returns JSON

### Why this is “senior”
- ✅ No AWS creds in Vercel
- ✅ Least-privilege IAM (Lambda can only `s3:GetObject` for one key)
- ✅ CI writes metrics via GitHub Actions **OIDC** (no long-lived AWS keys)

## Security posture

### Proxy endpoint protection
`GET /metrics/latest` requires a shared token header:

Header:
```
x-metrics-token: <secret>
```

Why:
- Prevents casual scraping
- Demonstrates access control without building a full auth system

Secrets:
- Vercel: `QUALITY_AWS_PROXY_TOKEN`
- AWS Lambda env: `METRICS_SHARED_TOKEN`

## Monitoring / observability

### CloudWatch
- Dashboard: `qa-portfolio-prod-api`
- Metrics:
  - Lambda Errors
  - Lambda Duration p95
  - API Gateway access logs (Logs Insights query)

## Verification (release confidence)

### Local engineering checks
```bash
npm ci
npx tsc -p tsconfig.json --noEmit
npm run build
npx playwright test
```

### Production verification
Run the prod smoke verifier:
```bash
npm run verify:prod
```

This checks:
- `/dashboard` reachable
- `/api/quality?mode=snapshot` returns valid schema
- `/api/quality?mode=aws` returns valid schema + proves AWS proxy path

## Evidence artifacts
These are intentionally committed under `public/artifacts/evidence/`:
- S3 latest.json metadata
- DynamoDB table config (PAY_PER_REQUEST)
- GitHub OIDC role trust policy
- API Gateway routes including `/metrics/latest`

They are surfaced in the Evidence Library at `/artifacts`.

