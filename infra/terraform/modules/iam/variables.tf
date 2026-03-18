variable "ses_identity" {
  description = "ARN of the SES domain identity to restrict sending to."
  type        = string
}

variable "sns_topic_arns" {
  description = "ARNs of SNS topics the IAM user can subscribe to."
  type        = list(string)
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 data bucket the app can access."
  type        = string
  default     = ""
}
