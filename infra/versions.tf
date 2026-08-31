terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12.0"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14.0"
    }
  }

  backend "s3" {
    bucket         = "openthaiai-terraform-state"
    key            = "openthaiai/infra/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "openthaiai-terraform-locks"
    encrypt        = true
  }
}
