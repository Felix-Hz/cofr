resource "aws_iam_user" "ses_sender" {
  name = "cofr-ses-sender"
}

resource "aws_iam_user_policy" "ses_send" {
  name = "cofr-ses-send"
  user = aws_iam_user.ses_sender.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowSESSend"
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = var.ses_identity
      },
      {
        Sid      = "AllowSNSSubscribe"
        Effect   = "Allow"
        Action   = ["sns:Subscribe", "sns:ConfirmSubscription"]
        Resource = var.sns_topic_arns
      },
    ]
  })
}

resource "aws_iam_user_policy" "s3_data" {
  count = var.s3_bucket_arn != "" ? 1 : 0
  name  = "cofr-s3-data"
  user  = aws_iam_user.ses_sender.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3DataAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_access_key" "ses_sender" {
  user = aws_iam_user.ses_sender.name
}
