output "droplet_id" {
  description = "DigitalOcean droplet ID."
  value       = digitalocean_droplet.cofr.id
}

output "droplet_name" {
  description = "Droplet name."
  value       = digitalocean_droplet.cofr.name
}

output "droplet_ipv4" {
  description = "Public IPv4 address."
  value       = digitalocean_droplet.cofr.ipv4_address
}

output "project_id" {
  description = "DigitalOcean project ID."
  value       = digitalocean_project.cofr.id
}

output "vpc_id" {
  description = "DigitalOcean VPC ID."
  value       = digitalocean_vpc.cofr.id
}

output "reserved_ip" {
  description = "Reserved IP assigned to the droplet."
  value       = var.reserved_ip != "" ? var.reserved_ip : null
}

# ── AWS SES Outputs ──

output "ses_verification_token" {
  description = "TXT record value for SES domain verification."
  value       = module.ses.verification_token
}

output "ses_dkim_tokens" {
  description = "DKIM CNAME tokens — create 3 CNAMEs in Cloudflare DNS."
  value       = module.ses.dkim_tokens
}

output "ses_iam_access_key_id" {
  description = "AWS access key ID for the SES sender."
  value       = module.iam.access_key_id
}

output "ses_iam_secret_access_key" {
  description = "AWS secret access key for the SES sender."
  value       = module.iam.secret_access_key
  sensitive   = true
}
