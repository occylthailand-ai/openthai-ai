# OpenThaiAI Observability Platform - OpenTelemetry Setup Guide

**Version:** 1.0.0  
**Standard:** OpenTelemetry (OTEL) v1.0  
**Last Updated:** 2026-07-28

---

## 📋 Overview

OpenThaiAI uses **OpenTelemetry** for unified observability across all services with:

✅ **Distributed Tracing** - End-to-end request flows with W3C trace context  
✅ **Metrics Collection** - Performance, latency, throughput (Prometheus-compatible)  
✅ **Structured Logging** - JSON logs with trace correlation  
✅ **PII Redaction** - Automatic sensitive data masking  
✅ **Multi-backend Support** - Jaeger, Datadog, AWS X-Ray, Cloud Trace  
✅ **PDPA Compliance** - No personal data in telemetry by default  

---

## 🎯 Quick Start Configuration

### Minimal Configuration (Development)

```json
{
  "telemetry": {
    "service_name": "ai-script-generator",
    "exporter": "otlp-grpc",
    "endpoint": "otel-collector.openthai.internal:4317",
    "environment": "development",
    "tracing": {
      "sampling_rate": 1.0
    },
    "metrics": {
      "interval_ms": 10000
    }
  }
}
```

### Production Configuration

```json
{
  "telemetry": {
    "service_name": "ai-script-generator",
    "service_version": "v2026.3.0",
    "exporter": "otlp-grpc",
    "endpoint": "otel-collector.openthai.internal:4317",
    "environment": "production",
    "timeout_seconds": 10,
    "batch_size": 1024,
    "max_queue_size": 5000,
    "tracing": {
      "sampling_rate": 0.1,
      "sampling_strategy": "parent_based",
      "propagator": "tracecontext"
    },
    "metrics": {
      "interval_ms": 30000,
      "collect_runtime_metrics": true
    },
    "logging": {
      "level": "INFO",
      "format": "json",
      "include_trace_context": true
    },
    "resource_attributes": {
      "service_namespace": "openthai-ai",
      "deployment_environment": "production",
      "cluster_name": "us-east-1"
    },
    "privacy": {
      "redact_pii": true
    }
  }
}
```

---

## 🏗️ Architecture

### OpenTelemetry Stack

```
┌──────────────────────────────────────────────────────────────┐
│ APPLICATION SERVICES                                         │
│                                                              │
│ ┌─ ai-script-generator ────┐                                │
│ │ • gRPC server            │                                │
│ │ • FastAPI endpoints      │                                │
│ └──────┬──────────────────┘                                │
│        │ Instruments:                                       │
│        ├─ HTTP requests                                     │
│        ├─ gRPC calls                                        │
│        ├─ Database queries                                  │
│        └─ Cache operations                                  │
│                                                              │
│ ┌─ quarantine-validator ───┐                                │
│ │ • Event listeners        │                                │
│ │ • Validation logic       │                                │
│ └──────┬──────────────────┘                                │
│        │ Spans:                                             │
│        ├─ validation_started                                │
│        ├─ pii_check_completed                               │
│        └─ validation_result                                 │
│                                                              │
└───────┬────────────────────────────────────────────────────┘
        │ All telemetry (traces, metrics, logs)
        │ With trace correlation IDs
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│ OTEL COLLECTOR                                               │
│ (otel-collector:4317 OTLP/gRPC)                             │
│                                                              │
│ Receivers:                                                   │
│  • OTLP gRPC (port 4317)                                    │
│  • OTLP HTTP (port 4318)                                    │
│  • Prometheus (port 8888)                                   │
│                                                              │
│ Processors:                                                  │
│  • Batch processor (aggregate spans)                        │
│  • Memory limiter (prevent OOM)                             │
│  • Sampler (filter traces)                                  │
│  • Attributes processor (add/modify attrs)                  │
│                                                              │
│ Exporters:                                                   │
│  • Jaeger (port 14250)                                      │
│  • Prometheus (port 8889)                                   │
│  • OTLP HTTP (to backends)                                  │
└───────┬────────────────────────────────────────────────────┘
        │
        ├─────────────────┬──────────────┬──────────────┐
        │                 │              │              │
        ▼                 ▼              ▼              ▼
    Jaeger            Prometheus      Loki         Datadog
    (Traces)          (Metrics)      (Logs)        (All)
        │                 │              │              │
        └─────────────────┴──────────────┴──────────────┘
                          │
                          ▼
                    ┌──────────────┐
                    │ Grafana      │
                    │ Dashboards   │
                    │ Alerting     │
                    └──────────────┘
```

---

## 📊 Key Metrics

### Request/Response Metrics

```yaml
http_requests_total:
  type: Counter
  description: Total HTTP requests
  labels:
    - method
    - route
    - status
  example: "POST /v1/content/generate-script 200"

http_request_duration_seconds:
  type: Histogram
  description: HTTP request latency
  labels:
    - method
    - route
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1.0]

grpc_requests_total:
  type: Counter
  description: Total gRPC calls
  labels:
    - service
    - method
    - status
```

### Business Metrics

```yaml
quarantine_tasks_total:
  type: Counter
  description: Total tasks quarantined
  labels:
    - result  # approved, rejected, regenerated
    - severity

validation_duration_seconds:
  type: Histogram
  description: Validator review time
  labels:
    - validator_id
    - result

content_generated_total:
  type: Counter
  description: Content generated
  labels:
    - model_version
    - language
    - compliance_status

pii_violations_total:
  type: Counter
  description: PII violations detected
  labels:
    - pii_type  # national_id, phone, email, etc.
    - severity
```

### System Metrics

```yaml
process_cpu_seconds_total:
  description: CPU time used

process_resident_memory_bytes:
  description: Memory usage

otel_spans_received:
  description: Spans received by collector

otel_trace_pipeline_dropped_spans:
  description: Spans dropped due to limits
```

---

## 🔍 Distributed Tracing

### Trace Hierarchy

```
trace_id: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

├─ span_id: 0000000000000001 (Root)
│  name: POST /v1/content/generate-script
│  duration: 3.245s
│  status: OK
│  attributes:
│    http.method: POST
│    http.url: /v1/content/generate-script
│    http.status_code: 200
│    task_id: task_987654321
│
│  ├─ span_id: 0000000000000002
│  │  name: generate_content
│  │  duration: 2.150s
│  │  parent_id: 0000000000000001
│  │
│  │  ├─ span_id: 0000000000000003
│  │  │  name: db.query
│  │  │  duration: 0.045s
│  │  │  attributes:
│  │  │    db.system: postgresql
│  │  │    db.statement: SELECT * FROM prompts WHERE...
│  │  │
│  │  ├─ span_id: 0000000000000004
│  │  │  name: ai.model.inference
│  │  │  duration: 2.050s
│  │  │  attributes:
│  │  │    ai.model_id: gpt-4-32k-2026-07
│  │  │    ai.tokens_input: 156
│  │  │    ai.tokens_output: 512
│  │  │
│  │  └─ span_id: 0000000000000005
│  │     name: compliance.check
│  │     duration: 0.055s
│  │     attributes:
│  │       compliance.pdpa_verified: true
│  │       compliance.pii_score: 0.08
│  │
│  ├─ span_id: 0000000000000006
│  │  name: cache.set
│  │  duration: 0.012s
│  │  parent_id: 0000000000000001
│  │
│  └─ span_id: 0000000000000007
│     name: emit_event
│     duration: 0.038s
│     parent_id: 0000000000000001
│     attributes:
│       event.type: openthai.content.generated
│       event.id: evt_123456789
│
└─ Events logged:
   ├─ content_generation_started (t=0.000s)
   ├─ model_inference_completed (t=2.150s)
   ├─ compliance_check_passed (t=2.205s)
   └─ response_sent (t=3.245s)
```

### Example: End-to-End Request Trace

```
Request Flow with Trace IDs:

┌─────────────────────────────────────────────────────────────┐
│ Client                                                      │
│ Generates: trace_id = random UUID                          │
└────────────────┬────────────────────────────────────────────┘
                 │ trace_id: a1b2c3d4...
                 │ span_id: 0000000000000001
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ API Gateway                                                │
│ • Extracts trace context from request headers             │
│ • Creates span for gateway processing                     │
│ • Forwards trace context downstream                       │
│                                                            │
│ Span: api_gateway_process (parent)                        │
│  ├─ span_id: 0000000000000002                            │
│  └─ attributes:                                           │
│      - method: POST                                       │
│      - path: /v1/content/generate-script                 │
└────────────────┬───────────────────────────────────────────┘
                 │ Propagates trace context
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ Script Generator Service                                  │
│ • Receives trace context                                  │
│ • Creates span for generation                             │
│                                                            │
│ Span: script_generation (child of api_gateway)           │
│  ├─ span_id: 0000000000000003                            │
│  └─ Emits events with same trace_id                      │
└────────────────┬───────────────────────────────────────────┘
                 │
                 ├─ Calls AI Model (spans 4-5)
                 ├─ Calls Database (span 6)
                 ├─ Checks Compliance (span 7)
                 └─ Emits CloudEvent (span 8)
                 │   (event includes trace_id)
                 │
                 ▼
┌────────────────────────────────────────────────────────────┐
│ Event Bus (Kafka)                                         │
│ Event: openthai.content.generated                         │
│ Includes: trace_id, span_id (for correlation)            │
│                                                            │
│ Span: event_publish (child of script_generation)         │
└────────────────┬───────────────────────────────────────────┘
                 │ Same trace_id continues
                 │
                 ├─► Quarantine Service (span 9)
                 ├─► Cache Service (span 10)
                 └─► Analytics Service (span 11)
                 │
                 ▼
        All services connected by
          same trace_id across
            event boundaries
```

---

## 💻 Implementation Examples

### Python - FastAPI with OpenTelemetry

```python
import asyncio
from typing import Optional
from fastapi import FastAPI, Request
from opentelemetry import trace, metrics, logs
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.log_exporter import OTLPLogExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.logs import LoggerProvider
from opentelemetry.sdk.logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.propagators.jaeger import JaegerPropagator
from opentelemetry.api.baggage.propagation import W3CBaggagePropagator
from opentelemetry.propagators.composite import CompositePropagator
import json
import logging

class OpenTelemetrySetup:
    """OpenTelemetry initialization for FastAPI"""
    
    def __init__(self, config_path: str):
        self.config = self._load_config(config_path)
        self.tracer = None
        self.meter = None
        self.logger = None
    
    def _load_config(self, path: str) -> dict:
        """Load telemetry configuration"""
        with open(path) as f:
            config = json.load(f)
        return config["telemetry"]
    
    def initialize(self) -> None:
        """Initialize OpenTelemetry SDK"""
        
        # Create resource
        resource = Resource.create({
            "service.name": self.config["service_name"],
            "service.version": self.config.get("service_version", "unknown"),
            "deployment.environment": self.config.get("environment", "development"),
            **self.config.get("resource_attributes", {})
        })
        
        # Initialize Tracing
        self._init_tracing(resource)
        
        # Initialize Metrics
        self._init_metrics(resource)
        
        # Initialize Logging
        self._init_logging(resource)
        
        print(f"✅ OpenTelemetry initialized for {self.config['service_name']}")
    
    def _init_tracing(self, resource: Resource) -> None:
        """Setup distributed tracing"""
        
        trace_config = self.config.get("tracing", {})
        
        # Create exporter
        exporter = OTLPSpanExporter(
            endpoint=self.config["endpoint"],
            headers=self.config.get("headers", {}),
            timeout=self.config.get("timeout_seconds", 10),
        )
        
        # Create tracer provider
        tracer_provider = TracerProvider(resource=resource)
        tracer_provider.add_span_processor(
            BatchSpanProcessor(
                exporter,
                max_queue_size=self.config.get("max_queue_size", 2048),
                max_export_batch_size=self.config.get("batch_size", 512),
            )
        )
        
        # Set trace context propagator
        propagator = trace_config.get("propagator", "tracecontext")
        if propagator == "jaeger":
            tracer_provider.sampler = JaegerPropagator()
        
        trace.set_tracer_provider(tracer_provider)
        self.tracer = trace.get_tracer(__name__)
        
        print(f"✅ Tracing configured: {self.config['exporter']} "
              f"(sampling={trace_config.get('sampling_rate', 1.0)})")
    
    def _init_metrics(self, resource: Resource) -> None:
        """Setup metrics collection"""
        
        metrics_config = self.config.get("metrics", {})
        
        # Create exporter
        exporter = OTLPMetricExporter(
            endpoint=self.config["endpoint"],
            headers=self.config.get("headers", {}),
        )
        
        # Create metric reader
        reader = PeriodicExportingMetricReader(
            exporter,
            interval_millis=metrics_config.get("interval_ms", 10000),
        )
        
        # Create meter provider
        meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
        metrics.set_meter_provider(meter_provider)
        
        self.meter = metrics.get_meter(__name__)
        
        # Create metrics
        self._create_metrics()
        
        print(f"✅ Metrics configured (interval={metrics_config.get('interval_ms')}ms)")
    
    def _create_metrics(self) -> None:
        """Create business metrics"""
        
        # Request metrics
        self.meter.create_counter(
            name="http_requests_total",
            description="Total HTTP requests",
            unit="1"
        )
        
        self.meter.create_histogram(
            name="http_request_duration_seconds",
            description="HTTP request latency",
            unit="s"
        )
        
        # Business metrics
        self.meter.create_counter(
            name="quarantine_tasks_total",
            description="Total tasks processed",
            unit="1"
        )
        
        self.meter.create_histogram(
            name="validation_duration_seconds",
            description="Validator review time",
            unit="s"
        )
        
        self.meter.create_counter(
            name="pii_violations_total",
            description="PII violations detected",
            unit="1"
        )
    
    def _init_logging(self, resource: Resource) -> None:
        """Setup structured logging with trace correlation"""
        
        logging_config = self.config.get("logging", {})
        
        if not logging_config.get("enabled", True):
            return
        
        # Create exporter
        exporter = OTLPLogExporter(
            endpoint=self.config["endpoint"],
            headers=self.config.get("headers", {}),
        )
        
        # Create logger provider
        logger_provider = LoggerProvider(resource=resource)
        logger_provider.add_log_record_processor(
            BatchLogRecordProcessor(exporter)
        )
        logs.set_logger_provider(logger_provider)
        
        # Configure Python logging
        log_level = logging_config.get("level", "INFO")
        log_format = logging_config.get("format", "json")
        
        handler = logging.StreamHandler()
        if log_format == "json":
            formatter = self._create_json_formatter(logging_config)
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        handler.setFormatter(formatter)
        
        logging.basicConfig(
            level=getattr(logging, log_level),
            handlers=[handler]
        )
        
        print(f"✅ Logging configured (level={log_level}, format={log_format})")
    
    def _create_json_formatter(self, logging_config):
        """Create JSON formatter for structured logs"""
        
        class JSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    "timestamp": self.formatTime(record, self.datefmt),
                    "level": record.levelname,
                    "message": record.getMessage(),
                    "logger": record.name,
                    "module": record.module,
                }
                
                # Include trace context if enabled
                if logging_config.get("include_trace_context", True):
                    span = trace.get_current_span()
                    if span and span.is_recording():
                        log_entry["trace_id"] = trace.get_current_span().get_span_context().trace_id
                        log_entry["span_id"] = trace.get_current_span().get_span_context().span_id
                
                # Include exception if present
                if record.exc_info:
                    log_entry["exception"] = self.formatException(record.exc_info)
                
                return json.dumps(log_entry)
        
        return JSONFormatter()

def setup_fastapi_instrumentation() -> None:
    """Instrument FastAPI application"""
    FastAPIInstrumentor.instrument()
    SQLAlchemyInstrumentor.instrument()
    RedisInstrumentor.instrument()

# Usage
app = FastAPI()
otel_setup = OpenTelemetrySetup("telemetry/telemetry.schema.json")
otel_setup.initialize()
setup_fastapi_instrumentation()

@app.post("/v1/content/generate-script")
async def generate_script(request: Request, prompt: str):
    """Generate script with tracing"""
    
    tracer = trace.get_tracer(__name__)
    
    with tracer.start_as_current_span("generate_script") as span:
        span.set_attribute("request.prompt", prompt[:100])  # First 100 chars only
        span.set_attribute("compliance.pdpa_check", True)
        
        # Business logic
        content = f"Generated script for: {prompt}"
        
        span.set_attribute("response.length", len(content))
        span.add_event("script_generation_completed")
        
        return {"content": content, "status": "success"}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    from opentelemetry.exporter.prometheus import PrometheusMetricReader
    
    reader = PrometheusMetricReader()
    return reader.get_metrics_data()
```

### Python - gRPC Server with OpenTelemetry

```python
from opentelemetry.instrumentation.grpc import GrpcInstrumentor
from opentelemetry import trace
import grpc

def setup_grpc_instrumentation():
    """Instrument gRPC server"""
    GrpcInstrumentor().instrument()

# Server setup
server = grpc.aio.server()
setup_grpc_instrumentation()

class ScriptGeneratorServicer:
    def __init__(self):
        self.tracer = trace.get_tracer(__name__)
    
    async def GenerateScript(self, request, context):
        """Generate script with tracing"""
        
        with self.tracer.start_as_current_span("GenerateScript") as span:
            # Set span attributes
            span.set_attribute("task_id", request.task_id)
            span.set_attribute("prompt_length", len(request.prompt))
            span.set_attribute("language", request.language)
            
            try:
                # Business logic
                content = f"Generated: {request.prompt[:50]}..."
                
                span.set_attribute("status", "success")
                span.set_attribute("response.length", len(content))
                
                return GenerateScriptResponse(
                    task_id=request.task_id,
                    generated_content=content,
                    confidence_score=0.92
                )
            
            except Exception as e:
                span.set_attribute("error", True)
                span.record_exception(e)
                raise
    
    async def StreamScript(self, request, context):
        """Stream script generation with tracing"""
        
        with self.tracer.start_as_current_span("StreamScript") as span:
            span.set_attribute("task_id", request.task_id)
            
            chunk_index = 0
            for chunk_text in ["Generated ", "script ", "content..."]:
                with self.tracer.start_as_current_span(
                    f"stream_chunk_{chunk_index}"
                ) as chunk_span:
                    chunk_span.set_attribute("chunk_index", chunk_index)
                    chunk_span.set_attribute("chunk_length", len(chunk_text))
                    
                    yield ScriptChunk(
                        task_id=request.task_id,
                        chunk_index=chunk_index,
                        chunk_text=chunk_text,
                        is_final=(chunk_index == 2)
                    )
                    
                    chunk_index += 1
```

### JavaScript/Node.js with OpenTelemetry

```javascript
const {
  BasicTracerProvider,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
  BatchSpanProcessor,
} = require('@opentelemetry/sdk-trace-base');
const {
  MeterProvider,
  PeriodicExactMemoryMetricReader,
} = require('@opentelemetry/sdk-metrics');
const {
  OTLPTraceExporter,
  OTLPMetricExporter,
} = require('@opentelemetry/exporter-trace-otlp-grpc');
const {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} = require('@opentelemetry/core');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');

class OpenTelemetrySetup {
  constructor(config) {
    this.config = config.telemetry;
  }

  initialize() {
    // Setup trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${this.config.endpoint}/v1/traces`,
      headers: this.config.headers || {},
      timeout: (this.config.timeout_seconds || 10) * 1000,
    });

    // Setup tracer provider
    const tracerProvider = new BasicTracerProvider();
    
    if (this.config.environment === 'development') {
      tracerProvider.addSpanProcessor(
        new SimpleSpanProcessor(new ConsoleSpanExporter())
      );
    }
    
    tracerProvider.addSpanProcessor(
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: this.config.max_queue_size || 2048,
        maxExportBatchSize: this.config.batch_size || 512,
      })
    );

    // Setup metrics exporter
    const metricsExporter = new OTLPMetricExporter({
      url: `${this.config.endpoint}/v1/metrics`,
      headers: this.config.headers || {},
    });

    const meterProvider = new MeterProvider({
      exporter: metricsExporter,
      intervalMillis: this.config.metrics?.interval_ms || 10000,
    });

    // Setup propagator
    const propagator = new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
      ],
    });

    // Register instrumentations
    registerInstrumentations({
      tracerProvider: tracerProvider,
      meterProvider: meterProvider,
      propagators: [propagator],
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new PgInstrumentation(),
      ],
    });

    console.log(
      `✅ OpenTelemetry initialized for ${this.config.service_name}`
    );
  }
}

// Usage with Express
const express = require('express');
const config = require('./telemetry/telemetry.schema.json');

const otelSetup = new OpenTelemetrySetup(config);
otelSetup.initialize();

const app = express();

app.post('/v1/content/generate-script', (req, res) => {
  const { tracer } = require('@opentelemetry/api');
  const span = tracer.getActiveSpanContext();

  const traceId = span?.traceId;

  // Business logic
  const content = `Generated script: ${req.body.prompt}`;

  res.json({
    content,
    trace_id: traceId,
    status: 'success'
  });
});

app.listen(8000, () => {
  console.log('Server listening on port 8000');
});
```

---

## 🔐 Privacy & PII Redaction

### Automatic PII Redaction

```python
class PIIRedactor:
    """Redact PII from telemetry"""
    
    REDACTION_PATTERNS = {
        "national_id": {
            "pattern": r"\b[1-9][0-9]{12}\b",
            "replacement": "[ID_REDACTED]"
        },
        "phone": {
            "pattern": r"\b0[0-9]{8,9}\b",
            "replacement": "[PHONE_REDACTED]"
        },
        "email": {
            "pattern": r"[\w\.-]+@[\w\.-]+\.\w+",
            "replacement": "[EMAIL_REDACTED]"
        },
        "credit_card": {
            "pattern": r"\b[0-9]{13,19}\b",
            "replacement": "[CC_REDACTED]"
        },
    }
    
    @classmethod
    def redact_text(cls, text: str) -> str:
        """Redact all PII from text"""
        for pii_type, config in cls.REDACTION_PATTERNS.items():
            text = re.sub(
                config["pattern"],
                config["replacement"],
                text
            )
        return text
    
    @classmethod
    def redact_span_attributes(cls, attributes: dict) -> dict:
        """Redact span attributes"""
        redacted = {}
        for key, value in attributes.items():
            if isinstance(value, str):
                redacted[key] = cls.redact_text(value)
            else:
                redacted[key] = value
        return redacted
```

---

## 📈 Sampling Strategies

### Sampling Rules for Production

```json
{
  "sampling_rules": [
    {
      "match": {
        "service_name": "ai-script-generator",
        "span_name": "generate_script"
      },
      "sampling_percentage": 100
    },
    {
      "match": {
        "span_name": "db.query"
      },
      "sampling_percentage": 10
    },
    {
      "match": {
        "span_name": "GET /health"
      },
      "sampling_percentage": 1
    }
  ]
}
```

**Strategy:** Always sample business-critical operations, low-sample health checks.

---

## 🚨 Alerting Rules

### Example Alert Rules

```yaml
groups:
  - name: openthai-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: SlowRequests
        expr: histogram_quantile(0.99, http_request_duration_seconds) > 1.0
        for: 10m
        annotations:
          summary: "P99 latency exceeds 1s"
      
      - alert: HighPIIViolations
        expr: rate(pii_violations_total[5m]) > 0
        for: 1m
        annotations:
          summary: "PII violations detected"
      
      - alert: HighQuarantineRate
        expr: |
          rate(quarantine_tasks_total{result="quarantined"}[5m]) / 
          rate(quarantine_tasks_total[5m]) > 0.2
        for: 15m
        annotations:
          summary: "Quarantine rate >20%"
```

---

## 🐳 Docker Compose - Complete Stack

```yaml
version: '3.8'

services:
  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.88.0
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
      - "8888:8888"  # Prometheus metrics
      - "8889:8889"  # Prometheus exporter
    volumes:
      - ./telemetry/otel-collector-config.yaml:/etc/otel/config.yaml
    command: ["--config=/etc/otel/config.yaml"]
    environment:
      - GOGC=80

  # Jaeger for trace visualization
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "14250:14250"  # gRPC receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./telemetry/prometheus.yaml:/etc/prometheus/prometheus.yml
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"

  # Grafana for dashboards
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_storage:/var/lib/grafana
      - ./telemetry/grafana-dashboards:/etc/grafana/provisioning/dashboards

  # Application with OpenTelemetry
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=otel-collector:4317
      - OTEL_SERVICE_NAME=ai-script-generator
      - OTEL_TRACES_EXPORTER=otlp
      - OTEL_METRICS_EXPORTER=otlp
    depends_on:
      - otel-collector

volumes:
  grafana_storage:
```

---

## ✅ Production Checklist

- [ ] OpenTelemetry SDK initialized for all services
- [ ] OTLP exporter configured with correct endpoint
- [ ] Trace sampling rate appropriate for environment (dev: 1.0, prod: 0.1)
- [ ] PII redaction enabled in telemetry config
- [ ] Resource attributes configured (service name, version, environment)
- [ ] Metrics collection enabled with 30s interval
- [ ] Structured logging with JSON format
- [ ] Trace context propagation (W3C tracecontext)
- [ ] Jaeger/Prometheus/Grafana deployed
- [ ] Alert rules configured and tested
- [ ] Dashboards created for business metrics
- [ ] Log retention policy set (90 days)
- [ ] Performance baseline established
- [ ] On-call runbooks created for alerts

---

**Version:** 1.0.0  
**Last Updated:** 2026-07-28
