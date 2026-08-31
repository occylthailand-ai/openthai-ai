# ------------------------------------------------------------------
# kube-prometheus-stack — Prometheus + Alertmanager + Grafana
# ------------------------------------------------------------------
resource "helm_release" "prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = var.prometheus_chart_version
  namespace        = "monitoring"
  create_namespace = true
  atomic           = true
  timeout          = 600

  values = [
    yamlencode({
      grafana = {
        enabled       = true
        adminPassword = var.grafana_admin_password
        persistence = {
          enabled      = true
          size         = "10Gi"
          storageClass = "gp3"
        }
        sidecar = {
          dashboards = { enabled = true, label = "grafana_dashboard" }
        }
      }

      alertmanager = {
        enabled = true
        config = {
          global = {
            slack_api_url = var.slack_webhook_url
          }
          route = {
            group_by        = ["alertname", "severity"]
            group_wait      = "10s"
            group_interval  = "5m"
            repeat_interval = "4h"
            receiver        = "slack-openthaiai"
          }
          receivers = [{
            name = "slack-openthaiai"
            slack_configs = [{
              channel       = var.slack_alert_channel
              send_resolved = true
              title         = "{{ .GroupLabels.alertname }} [{{ .Status | toUpper }}]"
              text          = "{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}"
              color         = "{{ if eq .Status \"firing\" }}danger{{ else }}good{{ end }}"
            }]
          }]
        }
      }

      prometheus = {
        prometheusSpec = {
          retention          = "15d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "gp3"
                resources = {
                  requests = { storage = "50Gi" }
                }
              }
            }
          }
          additionalScrapeConfigs = [{
            job_name        = "openthaiai-workers"
            scrape_interval = "15s"
            kubernetes_sd_configs = [{
              role = "pod"
              namespaces = { names = [var.worker_namespace] }
            }]
            relabel_configs = [{
              source_labels = ["__meta_kubernetes_pod_annotation_prometheus_io_scrape"]
              action        = "keep"
              regex         = "true"
            }]
          }]
        }
      }
    })
  ]
}

# ------------------------------------------------------------------
# Prometheus alerting rules for OpenThaiAI pipeline
# ------------------------------------------------------------------
resource "kubectl_manifest" "pipeline_alert_rules" {
  depends_on = [helm_release.prometheus_stack]

  yaml_body = yamlencode({
    apiVersion = "monitoring.coreos.com/v1"
    kind       = "PrometheusRule"
    metadata = {
      name      = "openthaiai-pipeline-alerts"
      namespace = "monitoring"
      labels    = { release = "kube-prometheus-stack" }
    }
    spec = {
      groups = [{
        name = "openthaiai.pipeline"
        rules = [
          {
            alert = "QueueDepthHigh"
            expr  = "openthaiai_queue_depth > 100"
            for   = "5m"
            labels    = { severity = "warning" }
            annotations = {
              summary     = "Queue backlog {{ $value }} items — workers may be lagging"
              description = "openthaiai_queue_depth has exceeded 100 for 5 minutes"
            }
          },
          {
            alert = "QueueDepthCritical"
            expr  = "openthaiai_queue_depth > 500"
            for   = "2m"
            labels    = { severity = "critical" }
            annotations = {
              summary = "CRITICAL: Queue depth {{ $value }} — possible worker outage"
            }
          },
          {
            alert = "HighErrorRate"
            expr  = "rate(openthaiai_failed_tasks_total[5m]) > 0.1"
            for   = "2m"
            labels    = { severity = "critical" }
            annotations = {
              summary = "Error rate {{ $value | humanize }}/s — check DLQ and worker logs"
            }
          },
          {
            alert = "PipelineLatencyHigh"
            expr  = "histogram_quantile(0.95, rate(openthaiai_pipeline_duration_seconds_bucket[10m])) > 30"
            for   = "5m"
            labels    = { severity = "warning" }
            annotations = {
              summary = "P95 latency {{ $value | humanizeDuration }} — AI API may be slow"
            }
          },
          {
            alert = "NoWorkersAvailable"
            expr  = "kube_deployment_status_replicas_ready{deployment=\"${var.worker_deployment_name}\"} == 0"
            for   = "1m"
            labels    = { severity = "critical" }
            annotations = {
              summary = "No arbitrage-worker pods are ready — pipeline is down"
            }
          }
        ]
      }]
    }
  })
}

# ------------------------------------------------------------------
# Grafana dashboard ConfigMap (loaded by sidecar automatically)
# ------------------------------------------------------------------
resource "kubernetes_config_map" "grafana_pipeline_dashboard" {
  depends_on = [helm_release.prometheus_stack]

  metadata {
    name      = "openthaiai-pipeline-dashboard"
    namespace = "monitoring"
    labels    = { grafana_dashboard = "1" }
  }

  data = {
    "openthaiai-pipeline.json" = file("${path.module}/grafana-dashboard.json")
  }
}
