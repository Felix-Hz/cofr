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
