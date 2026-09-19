#!/usr/bin/env bash
# หมวด 12 — Network: Certificate Generation Script
# สร้าง internal CA + certificates สำหรับ mTLS service-to-service
# ใช้งาน: ./scripts/gen-certs.sh [output_dir]

set -euo pipefail

OUT="${1:-./certs}"
CA_DAYS=3650
CERT_DAYS=365
COUNTRY="TH"
ORG="OpenThai AI"

mkdir -p "$OUT"/{ca,server,internal,services}
log() { echo "[CERTS] $*"; }

# ===== 1. Internal CA =====
log "สร้าง Internal CA..."
openssl genrsa -out "$OUT/ca/ca.key" 4096
openssl req -new -x509 -days $CA_DAYS \
  -key "$OUT/ca/ca.key" \
  -out "$OUT/ca/ca.crt" \
  -subj "/C=$COUNTRY/O=$ORG/CN=OpenThai Internal CA"

# ===== 2. Public API Server Certificate =====
log "สร้าง API Server certificate..."
openssl genrsa -out "$OUT/server/server.key" 2048
openssl req -new \
  -key "$OUT/server/server.key" \
  -out "$OUT/server/server.csr" \
  -subj "/C=$COUNTRY/O=$ORG/CN=api.openthai.ai"

cat > "$OUT/server/san.ext" <<EOF
[v3_req]
subjectAltName = DNS:api.openthai.ai, DNS:*.openthai.ai, IP:127.0.0.1
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
EOF

openssl x509 -req -days $CERT_DAYS \
  -in "$OUT/server/server.csr" \
  -CA "$OUT/ca/ca.crt" -CAkey "$OUT/ca/ca.key" -CAcreateserial \
  -out "$OUT/server/server.crt" \
  -extensions v3_req -extfile "$OUT/server/san.ext"

# ===== 3. Internal mTLS Server Certificate =====
log "สร้าง Internal mTLS server certificate..."
openssl genrsa -out "$OUT/internal/internal-server.key" 2048
openssl req -new \
  -key "$OUT/internal/internal-server.key" \
  -out "$OUT/internal/internal-server.csr" \
  -subj "/C=$COUNTRY/O=$ORG/CN=internal.openthai.ai"
openssl x509 -req -days $CERT_DAYS \
  -in "$OUT/internal/internal-server.csr" \
  -CA "$OUT/ca/ca.crt" -CAkey "$OUT/ca/ca.key" -CAcreateserial \
  -out "$OUT/internal/internal-server.crt"

cp "$OUT/ca/ca.crt" "$OUT/internal/internal-ca.crt"

# ===== 4. Service Client Certificates (mTLS) =====
for SERVICE in xades-engine peppol-gateway rd-gateway platform-api; do
  log "สร้าง client certificate สำหรับ $SERVICE..."
  openssl genrsa -out "$OUT/services/$SERVICE.key" 2048
  openssl req -new \
    -key "$OUT/services/$SERVICE.key" \
    -out "$OUT/services/$SERVICE.csr" \
    -subj "/C=$COUNTRY/O=$ORG/CN=$SERVICE"
  openssl x509 -req -days $CERT_DAYS \
    -in "$OUT/services/$SERVICE.csr" \
    -CA "$OUT/ca/ca.crt" -CAkey "$OUT/ca/ca.key" -CAcreateserial \
    -out "$OUT/services/$SERVICE.crt"
done

log "=== Certificate Generation Complete ==="
log "Output directory: $OUT"
log ""
log "สรุปไฟล์:"
log "  CA             : $OUT/ca/ca.crt"
log "  API Server     : $OUT/server/server.crt + server.key"
log "  Internal mTLS  : $OUT/internal/internal-server.crt + internal-ca.crt"
log "  Service Certs  : $OUT/services/{service}.crt + {service}.key"
log ""
log "⚠️  เก็บ *.key ไว้ใน Vault — ห้าม commit ลง Git"
