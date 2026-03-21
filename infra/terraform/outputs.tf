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

# ── AWS S3 ──

output "s3_data_bucket" {
  description = "S3 data bucket name."
  value       = module.s3_data.bucket_name
}

output "s3_data_bucket_domain" {
  description = "S3 data bucket regional domain for SDK access."
  value       = module.s3_data.bucket_regional_domain_name
}
