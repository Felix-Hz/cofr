terraform {
  required_version = ">= 1.5.0"

  backend "s3" {
    bucket  = "cofr-terraform-state"
    key     = "cofr/landing.tfstate"
    region  = "ap-southeast-2"
    encrypt = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Credentials come from the environment: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY and CLOUDFLARE_API_TOKEN.
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "cofr"
      ManagedBy = "terraform"
    }
  }
}

# CloudFront only accepts ACM certificates issued in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "cofr"
      ManagedBy = "terraform"
    }
  }
}

provider "cloudflare" {}
