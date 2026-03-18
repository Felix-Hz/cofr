resource "aws_sns_topic" "bounces" {
  name = "cofr-ses-bounces"
}

resource "aws_sns_topic" "complaints" {
  name = "cofr-ses-complaints"
}

resource "aws_sns_topic_subscription" "bounces_https" {
  topic_arn = aws_sns_topic.bounces.arn
  protocol  = "https"
  endpoint  = var.webhook_endpoint
}

resource "aws_sns_topic_subscription" "complaints_https" {
  topic_arn = aws_sns_topic.complaints.arn
  protocol  = "https"
  endpoint  = var.webhook_endpoint
}

resource "aws_ses_identity_notification_topic" "bounces" {
  identity                 = var.ses_identity
  notification_type        = "Bounce"
  topic_arn                = aws_sns_topic.bounces.arn
  include_original_headers = true
}

resource "aws_ses_identity_notification_topic" "complaints" {
  identity                 = var.ses_identity
  notification_type        = "Complaint"
  topic_arn                = aws_sns_topic.complaints.arn
  include_original_headers = true
}
