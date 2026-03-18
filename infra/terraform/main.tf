locals {
  base_tags = [
    "cofr",
    var.environment,
  ]

  droplet_ssh_keys = concat(
    var.ssh_key_fingerprints,
    [for k in digitalocean_ssh_key.managed : k.id]
  )

  cloud_init = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_user = var.admin_user
  })
}

resource "digitalocean_ssh_key" "managed" {
  for_each = var.ssh_public_keys

  name       = "${var.droplet_name}-${each.key}"
  public_key = each.value
}

resource "digitalocean_project" "cofr" {
  name        = var.project_name
  description = var.project_description
  purpose     = "Web Application"
  environment = title(var.environment)
}

resource "digitalocean_vpc" "cofr" {
  name     = var.vpc_name
  region   = var.region
  ip_range = "10.60.0.0/24"
}

resource "digitalocean_droplet" "cofr" {
  name       = var.droplet_name
  region     = var.region
  size       = var.droplet_size
  image      = var.image
  ssh_keys   = local.droplet_ssh_keys
  backups    = var.enable_backups
  monitoring = var.enable_monitoring
  tags       = distinct(concat(local.base_tags, var.tags))
  user_data  = local.cloud_init
  vpc_uuid   = digitalocean_vpc.cofr.id
}

resource "digitalocean_reserved_ip_assignment" "cofr" {
  count = var.reserved_ip != "" ? 1 : 0

  ip_address = var.reserved_ip
  droplet_id = digitalocean_droplet.cofr.id
}

resource "digitalocean_project_resources" "cofr" {
  project   = digitalocean_project.cofr.id
  resources = [digitalocean_droplet.cofr.urn]
}

# ── AWS SES Email Infrastructure ──

module "ses" {
  source     = "./modules/ses"
  domain     = var.ses_domain
  aws_region = var.aws_region
}

module "sns" {
  source       = "./modules/sns"
  ses_identity = module.ses.domain_identity_arn
}

module "iam" {
  source         = "./modules/iam"
  ses_identity   = module.ses.domain_identity_arn
  sns_topic_arns = [module.sns.bounce_topic_arn, module.sns.complaint_topic_arn]
  s3_bucket_arn  = module.s3_data.bucket_arn
}

# ── AWS S3 Application Data ──

module "s3_data" {
  source      = "./modules/s3"
  bucket_name = "cofr-data"
}

# ── Terraform Remote State ──

module "tfstate" {
  source = "./modules/tfstate"
}

resource "digitalocean_firewall" "cofr" {
  name = "${var.droplet_name}-firewall"

  droplet_ids = [digitalocean_droplet.cofr.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.admin_cidrs
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
