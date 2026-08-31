variable "aws_region" {
  type        = string
  description = "AWS region to deploy resources"
  default     = "ap-southeast-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (production / staging)"
  default     = "production"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where EKS and ElastiCache reside"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs (at least 2 AZs) for ElastiCache"
}

variable "eks_cluster_cidr" {
  type        = string
  description = "CIDR block of the EKS node group (allowed to reach Redis on port 6379)"
  default     = "10.0.0.0/16"
}

variable "eks_cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
  default     = "openthaiai-cluster"
}

variable "redis_node_type" {
  type        = string
  description = "ElastiCache node instance type"
  default     = "cache.t4g.small"
}

variable "redis_engine_version" {
  type        = string
  description = "Redis engine version"
  default     = "7.1"
}

variable "worker_namespace" {
  type        = string
  description = "Kubernetes namespace where arbitrage-worker is deployed"
  default     = "openthaiai"
}

variable "worker_deployment_name" {
  type        = string
  description = "Name of the Kubernetes Deployment to scale"
  default     = "arbitrage-worker"
}

variable "keda_chart_version" {
  type        = string
  description = "KEDA Helm chart version"
  default     = "2.14.0"
}

variable "prometheus_chart_version" {
  type        = string
  description = "kube-prometheus-stack Helm chart version"
  default     = "58.1.3"
}

variable "grafana_admin_password" {
  type        = string
  description = "Grafana admin password (set via TF_VAR_grafana_admin_password env var)"
  sensitive   = true
}

variable "slack_webhook_url" {
  type        = string
  description = "Slack Incoming Webhook URL for Alertmanager (set via TF_VAR_slack_webhook_url)"
  sensitive   = true
}

variable "slack_alert_channel" {
  type        = string
  description = "Slack channel for pipeline alerts"
  default     = "#openthaiai-alerts"
}
