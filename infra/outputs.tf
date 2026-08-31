output "redis_primary_endpoint" {
  description = "Redis primary endpoint address (use in KEDA trigger + worker config)"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint for read-only operations"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

output "redis_connection_string" {
  description = "Redis connection string for worker environment variable"
  value       = "redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
  sensitive   = true
}

output "keda_namespace" {
  description = "Kubernetes namespace where KEDA operator is installed"
  value       = "keda"
}

output "grafana_url" {
  description = "Grafana LoadBalancer URL (may take a minute to provision)"
  value       = "http://$(kubectl get svc -n monitoring kube-prometheus-stack-grafana -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
}

output "prometheus_url" {
  description = "Prometheus internal service URL"
  value       = "http://kube-prometheus-stack-prometheus.monitoring.svc.cluster.local:9090"
}
