FROM python:3.11-slim

WORKDIR /app

# Install only NER service dependencies (lighter than full backend)
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn[standard]==0.27.0 \
    pydantic==2.5.3 \
    transformers==4.40.2 \
    torch==2.3.1 \
    sentencepiece==0.2.0 \
    prometheus-client==0.20.0

COPY ner_service.py .

# Optional: mount a fine-tuned model at /app/openthaiai-ner-wangchanberta
# via Kubernetes volume or S3 init container.
# Without it, the service runs in mock (regex) mode automatically.
ENV NER_MODEL_PATH=/app/openthaiai-ner-wangchanberta

EXPOSE 8080

CMD ["uvicorn", "ner_service:app", "--host", "0.0.0.0", "--port", "8080"]
