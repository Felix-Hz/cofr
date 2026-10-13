output "bucket_name" {
  description = "S3 bucket to sync the landing build into (GitHub variable LANDING_BUCKET)."
  value       = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  description = "CloudFront distribution ID to invalidate after deploys (GitHub variable LANDING_DISTRIBUTION_ID)."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain" {
  description = "CloudFront domain the DNS records point at."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "deploy_role_arn" {
  description = "IAM role GitHub Actions assumes to deploy (GitHub variable LANDING_DEPLOY_ROLE_ARN)."
  value       = aws_iam_role.deploy.arn
}
