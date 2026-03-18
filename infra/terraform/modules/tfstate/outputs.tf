output "bucket_name" {
  description = "S3 bucket name for Terraform state."
  value       = aws_s3_bucket.state.bucket
}

output "bucket_arn" {
  description = "S3 bucket ARN."
  value       = aws_s3_bucket.state.arn
}

output "lock_table_name" {
  description = "DynamoDB lock table name."
  value       = aws_dynamodb_table.lock.name
}
