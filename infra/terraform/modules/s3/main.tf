resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  # Exports: infrequent after 30 days, auto-delete after 180 (6 months)
  rule {
    id     = "exports-lifecycle"
    status = "Enabled"

    filter {
      prefix = "exports/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 180
    }
  }

  # Receipts: infrequent after 30 days
  rule {
    id     = "receipts-lifecycle"
    status = "Enabled"

    filter {
      prefix = "receipts/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }

  # PostgreSQL backups: safety net expiration after 5 days
  # Primary retention (keep last 3) is handled by backup script
  # This rule ensures nothing older than 5 days accumulates
  rule {
    id     = "postgres-backups-lifecycle"
    status = "Enabled"

    filter {
      prefix = "postgres/"
    }

    expiration {
      days = 5
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
