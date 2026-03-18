variable "ses_identity" {
  description = "ARN of the SES domain identity for notification configuration."
  type        = string
}

variable "webhook_endpoint" {
  description = "HTTPS endpoint for SNS to deliver notifications."
  type        = string
  default     = "https://cofr.cash/api/webhooks/ses"
}
