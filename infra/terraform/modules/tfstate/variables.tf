variable "bucket_name" {
  description = "S3 bucket name for Terraform state."
  type        = string
  default     = "cofr-terraform-state"
}

variable "lock_table_name" {
  description = "DynamoDB table name for state locking."
  type        = string
  default     = "cofr-terraform-lock"
}
