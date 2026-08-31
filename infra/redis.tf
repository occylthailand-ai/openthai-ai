# ------------------------------------------------------------------
# Security Group — allow EKS nodes to reach Redis on port 6379
# ------------------------------------------------------------------
resource "aws_security_group" "redis" {
  name        = "openthaiai-redis-sg-${var.environment}"
  description = "Allow EKS worker nodes to reach ElastiCache Redis"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis from EKS cluster"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.eks_cluster_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ------------------------------------------------------------------
# Subnet Group — ElastiCache needs subnets in ≥ 2 AZs
# ------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "redis" {
  name       = "openthaiai-redis-subnet-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

# ------------------------------------------------------------------
# Parameter Group — Redis 7.x with sensible defaults
# ------------------------------------------------------------------
resource "aws_elasticache_parameter_group" "redis7" {
  name   = "openthaiai-redis7-${var.environment}"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "noeviction" # never silently drop queue items
  }
}

# ------------------------------------------------------------------
# ElastiCache Replication Group (primary + replica for HA)
# ------------------------------------------------------------------
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "openthaiai-redis-${var.environment}"
  description          = "Redis queue for OpenThaiAI arbitrage worker"

  engine               = "redis"
  engine_version       = var.redis_engine_version
  node_type            = var.redis_node_type
  num_cache_clusters   = 2 # primary + 1 replica
  port                 = 6379

  parameter_group_name       = aws_elasticache_parameter_group.redis7.name
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false # set true when workers use TLS

  maintenance_window       = "sun:02:00-sun:04:00"
  snapshot_window          = "00:00-02:00"
  snapshot_retention_limit = 7

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }
}

resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/openthaiai-redis-${var.environment}/slow-log"
  retention_in_days = 14
}
