# Terraform: landing page

cofr is self-host only. The only thing we run is the static landing page at `cofr.cash`:

- private S3 bucket (`cofr-landing`), all public access blocked, TLS-only bucket policy
- CloudFront in front of it, reading the bucket through Origin Access Control
- ACM certificate (us-east-1) for `cofr.cash` and `www.cofr.cash`
- CloudFront Function: `www` → apex 301, `/terms` → `/terms/index.html`
- security headers (HSTS, nosniff, `X-Frame-Options: DENY`, referrer and permissions policies)
- DNS stays on Cloudflare: DNS-only CNAMEs to CloudFront plus the ACM validation records
- an IAM role GitHub Actions assumes over OIDC to deploy (no long-lived deploy keys)

Cost is close to zero for a landing page: S3 storage is a few MB, CloudFront's free tier covers 1 TB and
10M requests a month, `PriceClass_100` keeps edge pricing at the cheapest tier, and one `/*`
invalidation per deploy stays inside the 1,000 free paths. No Route 53, WAF, or access logging.

## Setup

GitHub secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (Terraform only),
`CLOUDFLARE_API_TOKEN` (Zone → DNS → Edit on `cofr.cash`). See [Credentials and rotation](#credentials-and-rotation).

GitHub variables: `CLOUDFLARE_ZONE_ID`, and `GITHUB_OIDC_PROVIDER_ARN` if the AWS account already
has a GitHub Actions OIDC provider (only one is allowed per account).

Before the first apply, delete the existing `cofr.cash` and `www.cofr.cash` records in Cloudflare
(they point at the old tunnel), or Terraform cannot create its own. Leave every other record alone:
the MX, SPF, DMARC and DKIM records carry the domain's email.

Apply via the `Infrastructure` workflow, or locally:

```bash
cd infra/terraform
export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... CLOUDFLARE_API_TOKEN=...
terraform init
terraform apply -var cloudflare_zone_id=<zone id>
```

Then copy the outputs into GitHub variables so the `Deploy Landing` workflow can publish:

| Output            | GitHub variable           |
| ----------------- | ------------------------- |
| `bucket_name`     | `LANDING_BUCKET`          |
| `distribution_id` | `LANDING_DISTRIBUTION_ID` |
| `deploy_role_arn` | `LANDING_DEPLOY_ROLE_ARN` |

## Credentials and rotation

No secret values live in this repo. This table records what each credential is and when it expires.

| GitHub secret / variable | What it is | Scope | Expires |
| --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` (secret) | Cloudflare account-owned token `cofr-github-terraform-dns` (id `3314ea8a27e6d3cc1ca75aa00a6c22f6`) | DNS Write on zone `cofr.cash` only | **2027-10-13** |
| `CLOUDFLARE_ZONE_ID` (variable) | `cofr.cash` zone ID | n/a | never |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (secrets) | Access key for IAM user `felix-admin`, account `474418737672` | Terraform plan/apply only | no expiry; rotate yearly |
| `LANDING_DEPLOY_ROLE_ARN` (variable) | IAM role assumed over GitHub OIDC by `Deploy Landing` | S3 sync + CloudFront invalidation, `main` only | no long-lived key |

Rotating the Cloudflare token, before it expires:

1. Cloudflare dashboard → Manage Account → Account API Tokens → `cofr-github-terraform-dns` → Roll
   (or create a new token with the same single permission and zone, valid for one year).
2. Paste the new value with `gh secret set CLOUDFLARE_API_TOKEN` (prompts, so it never lands in shell history).
3. Re-run the `Infrastructure` workflow; `infra-plan` should report no changes.
4. Update the expiry date in the table above.

Rotating the AWS key: create a second access key for the IAM user, update both GitHub secrets,
re-run `Infrastructure`, then deactivate and delete the old key.

## Deploys

`Deploy Landing` runs on every push to `main` that touches `apps/client`. It builds the client with
`VITE_LANDING=1`, which prerenders `/`, `/terms` and `/privacy` to static HTML and drops the PWA,
syncs the result to S3, and invalidates CloudFront.

It also publishes `apps/client/landing/sw.js`, a self-destructing service worker that clears the
hosted app's old worker and caches from browsers that installed it.
