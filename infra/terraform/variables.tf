variable "domain" {
  description = "Apex domain the landing page is served on. www redirects to it."
  type        = string
  default     = "cofr.cash"
}

variable "aws_region" {
  description = "AWS region for the site bucket."
  type        = string
  default     = "ap-southeast-2"
}

variable "bucket_name" {
  description = "Name of the private S3 bucket holding the built landing page."
  type        = string
  default     = "cofr-landing"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain (DNS stays on Cloudflare)."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository (owner/name) allowed to deploy the landing page via OIDC."
  type        = string
  default     = "Felix-Hz/cofr"
}

variable "github_oidc_provider_arn" {
  description = "Existing GitHub Actions OIDC provider ARN. Leave empty to create one (only one may exist per AWS account)."
  type        = string
  default     = ""
}
