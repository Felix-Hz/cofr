output "access_key_id" {
  description = "AWS access key ID for the SES sender IAM user."
  value       = aws_iam_access_key.ses_sender.id
}

output "secret_access_key" {
  description = "AWS secret access key for the SES sender IAM user."
  value       = aws_iam_access_key.ses_sender.secret
  sensitive   = true
}
