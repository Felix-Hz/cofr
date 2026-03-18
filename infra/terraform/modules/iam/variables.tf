variable "ses_identity" {
  description = "ARN of the SES domain identity to restrict sending to."
  type        = string
}

variable "sns_topic_arns" {
  description = "ARNs of SNS topics the IAM user can subscribe to."
  type        = list(string)
}
