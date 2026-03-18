output "bounce_topic_arn" {
  description = "ARN of the SES bounce SNS topic."
  value       = aws_sns_topic.bounces.arn
}

output "complaint_topic_arn" {
  description = "ARN of the SES complaint SNS topic."
  value       = aws_sns_topic.complaints.arn
}
