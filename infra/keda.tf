# ------------------------------------------------------------------
# KEDA Operator — installed via Helm
# ------------------------------------------------------------------
resource "helm_release" "keda" {
  name             = "keda"
  repository       = "https://kedacore.github.io/charts"
  chart            = "keda"
  version          = var.keda_chart_version
  namespace        = "keda"
  create_namespace = true
  atomic           = true
  timeout          = 300

  set {
    name  = "prometheus.metricServer.enabled"
    value = "true"
  }
  set {
    name  = "prometheus.operator.enabled"
    value = "true"
  }
}

# ------------------------------------------------------------------
# Worker Namespace (if not already present)
# ------------------------------------------------------------------
resource "kubernetes_namespace" "openthaiai" {
  metadata {
    name = var.worker_namespace
    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }
}

# ------------------------------------------------------------------
# KEDA ScaledObject — scales arbitrage-worker on Redis queue depth
# ------------------------------------------------------------------
resource "kubectl_manifest" "scaled_object" {
  depends_on = [helm_release.keda, kubernetes_namespace.openthaiai]

  yaml_body = yamlencode({
    apiVersion = "keda.sh/v1alpha1"
    kind       = "ScaledObject"
    metadata = {
      name      = "arbitrage-worker-scaler"
      namespace = var.worker_namespace
    }
    spec = {
      scaleTargetRef = {
        apiVersion = "apps/v1"
        kind       = "Deployment"
        name       = var.worker_deployment_name
      }
      pollingInterval  = 10
      cooldownPeriod   = 300
      minReplicaCount  = 2
      maxReplicaCount  = 12

      advanced = {
        restoreToOriginalReplicaCount = false
        horizontalPodAutoscalerConfig = {
          behavior = {
            scaleDown = {
              stabilizationWindowSeconds = 300
              policies = [{
                type          = "Pods"
                value         = 1
                periodSeconds = 60
              }]
            }
            scaleUp = {
              stabilizationWindowSeconds = 0
              policies = [{
                type          = "Pods"
                value         = 4
                periodSeconds = 60
              }]
            }
          }
        }
      }

      triggers = [{
        type = "redis"
        metadata = {
          address    = "${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379"
          listName   = "openthaiai:arbitrage:queue"
          listLength = "10"
        }
      }]
    }
  })
}

# ------------------------------------------------------------------
# PodDisruptionBudget — ensure ≥1 worker always available
# ------------------------------------------------------------------
resource "kubectl_manifest" "worker_pdb" {
  depends_on = [kubernetes_namespace.openthaiai]

  yaml_body = yamlencode({
    apiVersion = "policy/v1"
    kind       = "PodDisruptionBudget"
    metadata = {
      name      = "arbitrage-worker-pdb"
      namespace = var.worker_namespace
    }
    spec = {
      minAvailable = 1
      selector = {
        matchLabels = { app = var.worker_deployment_name }
      }
    }
  })
}
