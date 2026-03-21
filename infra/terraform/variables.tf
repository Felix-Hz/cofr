variable "do_token" {
  description = "DigitalOcean API token."
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "DigitalOcean project name."
  type        = string
  default     = "cofr"
}

variable "project_description" {
  description = "DigitalOcean project description."
  type        = string
  default     = "Infrastructure for the Cofr application"
}

variable "environment" {
  description = "Environment label for the project and droplet."
  type        = string
  default     = "production"
}

variable "region" {
  description = "DigitalOcean region slug."
  type        = string
  default     = "syd1"
}

variable "vpc_name" {
  description = "DigitalOcean VPC name."
  type        = string
  default     = "cofr-prod-vpc"
}

variable "droplet_size" {
  description = "DigitalOcean droplet size slug."
  type        = string
  default     = "s-1vcpu-2gb"
}

variable "image" {
  description = "Droplet base image slug."
  type        = string
  default     = "ubuntu-24-04-x64"
}

variable "droplet_name" {
  description = "Droplet name."
  type        = string
  default     = "cofr-prod"
}

variable "ssh_key_fingerprints" {
  description = "Fingerprints of SSH keys already uploaded to DigitalOcean."
  type        = list(string)
  default     = []
}

variable "ssh_public_keys" {
  description = "SSH public keys for Terraform to register with DigitalOcean and authorize on the droplet."
  type        = map(string)
  default     = {}
}

variable "admin_user" {
  description = "Primary non-root deploy user created by cloud-init."
  type        = string
  default     = "cofr"
}

variable "admin_cidrs" {
  description = "CIDR blocks allowed to SSH to the droplet."
  type        = list(string)

  validation {
    condition     = length(var.admin_cidrs) > 0
    error_message = "Set admin_cidrs to at least one trusted CIDR. Do not leave SSH unrestricted."
  }
}

variable "enable_backups" {
  description = "Enable DigitalOcean droplet backups."
  type        = bool
  default     = true
}

variable "enable_monitoring" {
  description = "Enable DigitalOcean monitoring agent."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra DigitalOcean tags."
  type        = list(string)
  default     = []
}

variable "reserved_ip" {
  description = "Existing DigitalOcean Reserved IP to assign to the droplet."
  type        = string
  default     = ""
}

# ── AWS (S3 state backend) ──

variable "aws_access_key" {
  description = "AWS access key for Terraform state backend (S3)."
  type        = string
  sensitive   = true
}

variable "aws_secret_key" {
  description = "AWS secret key for Terraform state backend (S3)."
  type        = string
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region for S3 state backend."
  type        = string
  default     = "ap-southeast-2"
}
