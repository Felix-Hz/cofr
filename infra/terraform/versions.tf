terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket  = "cofr-terraform-state"
    key     = "cofr/terraform.tfstate"
    region  = "ap-southeast-2"
    encrypt = true
  }

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.50"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

provider "aws" {
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
  region     = var.aws_region
}
