#!/usr/bin/env bash
# หมวด 5 — BIOS/Firmware: SoftHSM2 Initialization Script
# สร้าง token + key pair สำหรับ XAdES signing และ Vault KEK
# ใช้งาน: ./init-hsm.sh [--reset]

set -euo pipefail

SLOT_LABEL="${HSM_TOKEN_LABEL:-openthai-etax}"
SO_PIN="${HSM_SO_PIN:-12345678}"
USER_PIN="${HSM_USER_PIN:-87654321}"
KEY_LABEL_SIGN="${HSM_KEY_SIGN:-xades-signing-key}"
KEY_LABEL_KEK="${HSM_KEY_KEK:-vault-kek}"
SOFTHSM2_CONF="${SOFTHSM2_CONF:-/etc/softhsm2.conf}"

log() { echo "[HSM] $*"; }

if [[ "${1:-}" == "--reset" ]]; then
  log "รีเซ็ต token ทั้งหมด..."
  softhsm2-util --delete-token --token "$SLOT_LABEL" 2>/dev/null || true
fi

# ตรวจว่า token มีอยู่แล้วหรือไม่
if softhsm2-util --show-slots 2>/dev/null | grep -q "$SLOT_LABEL"; then
  log "Token '$SLOT_LABEL' มีอยู่แล้ว — ข้ามการสร้าง"
else
  log "สร้าง token '$SLOT_LABEL'..."
  softhsm2-util --init-token --free \
    --label "$SLOT_LABEL" \
    --so-pin "$SO_PIN" \
    --pin "$USER_PIN"
  log "Token สร้างสำเร็จ"
fi

# หา slot id
SLOT_ID=$(softhsm2-util --show-slots 2>/dev/null | grep -B1 "Label: *$SLOT_LABEL" | grep "^Slot" | awk '{print $2}' | head -1)
log "Slot ID: $SLOT_ID"

# สร้าง RSA-2048 key pair สำหรับ XAdES signing
pkcs11-tool --module /usr/lib/softhsm/libsofthsm2.so \
  --slot-index 0 \
  --login --pin "$USER_PIN" \
  --keypairgen --key-type rsa:2048 \
  --label "$KEY_LABEL_SIGN" \
  --id 01 \
  2>/dev/null && log "สร้าง signing key สำเร็จ" || log "Signing key มีอยู่แล้ว"

# สร้าง AES-256 key สำหรับ Vault KEK (Key Encryption Key)
pkcs11-tool --module /usr/lib/softhsm/libsofthsm2.so \
  --slot-index 0 \
  --login --pin "$USER_PIN" \
  --keygen --key-type aes:32 \
  --label "$KEY_LABEL_KEK" \
  --id 02 \
  2>/dev/null && log "สร้าง KEK สำเร็จ" || log "KEK มีอยู่แล้ว"

log "=== HSM Initialization Complete ==="
log "Token Label : $SLOT_LABEL"
log "Signing Key : $KEY_LABEL_SIGN (RSA-2048, ID=01)"
log "Vault KEK   : $KEY_LABEL_KEK (AES-256, ID=02)"
log "User PIN    : (ดูจาก env HSM_USER_PIN)"
