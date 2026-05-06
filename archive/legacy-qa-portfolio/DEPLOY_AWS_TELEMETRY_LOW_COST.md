# Deploy AWS Telemetry (Low Cost) — Step-by-step

This guide keeps costs minimal while still giving you **real cloud/infra proof**.

## Cost expectations (very low)
If you keep **S3-only** (default `enable_dynamodb=false`) and a short retention:
- **S3 storage**: pennies/month for small JSON files
- **S3 requests**: pennies/month at portfolio scale
- **DynamoDB**: *disabled by default* (enable only if you need query/indexing)

## 0) Prereqs
- AWS account
- AWS CLI configured locally (`aws configure`) **or** use AWS SSO
- Terraform installed

## 1) Configure Terraform variables
In `infra/aws-quality-telemetry` create a `terraform.tfvars`:

```hcl
project_name       = "qa-portfolio"
environment        = "dev"
aws_region         = "us-east-1"

# Lowest cost path
enable_dynamodb    = false
s3_retention_days  = 30

# IMPORTANT: list every repo that will upload qa-metrics.json
github_repositories = [
  "JasonTeixeira/qa-portfolio",
  "JasonTeixeira/API-Test-Automation-Wireframe"
]
```

## 2) Deploy the infra
```bash
cd infra/aws-quality-telemetry
terraform init
terraform plan
terraform apply
```

Save the outputs:
- `s3_bucket_name`
- `github_writer_role_arn`

## 3) Configure ONE repo to upload metrics (start small)
In the repo you choose (ex: `API-Test-Automation-Wireframe`):

1. Add workflow similar to `.github/workflows/qa-metrics-aws-upload.yml`
2. Add repo secrets:
   - `AWS_QA_METRICS_ROLE_ARN` = output `github_writer_role_arn`
   - `AWS_QA_METRICS_BUCKET` = output `s3_bucket_name`

### Convention for Cloud mode (recommended)
Upload a `latest.json` too:
- `metrics/qa-portfolio/latest.json`

That’s what the portfolio reads in `mode=aws`.

## 4) Configure the portfolio to read from AWS
Set environment variables (Vercel or `.env.local`):

```bash
QUALITY_AWS_BUCKET=<your bucket>
QUALITY_AWS_PREFIX=metrics
```

Then visit:
- `/dashboard` → choose **Cloud**
- or call `/api/quality?mode=aws`

## Notes
- If AWS isn’t configured, Cloud mode automatically falls back to the snapshot.
- To stay cost-minimal, keep retention low (e.g., 30 days).
