# คู่มือติดตั้ง On-Premise — OpenThai.ai

**เอกสาร:** `docs/onprem-deployment.md`
**งาน Backlog:** 2.6 คลื่นงานที่ 2
**ผู้จัดทำ:** `devops-sre` (กิลด์ DevOps/SRE)
**วันที่:** 6 สิงหาคม 2569
**เสิร์ฟกลุ่ม:** กลุ่มที่ 5 (ชุมชน/นักพัฒนา/รัฐ) + กลุ่มที่ 6 (วิชาชีพ ที่ต้องการ Air-Gapped)
**อ้างอิง:** `CLAUDE.md` หลักการข้อ 2 (Sovereign by Default), `docs/module-professional.md` ข้อ 1.4

---

## เหตุใดต้อง On-Premise

CLAUDE.md กำหนดชัด: "ข้อมูลอ่อนไหวต้องประมวลผลในประเทศ รองรับ On-Premise เสมอ"

กลุ่มที่ต้องการ On-Premise บังคับ:
- โรงพยาบาล / คลินิก (ข้อมูลสุขภาพ PDPA มาตรา 26)
- สำนักงานกฎหมาย (ความลับลูกความ)
- หน่วยงานราชการและกองทัพ (Air-Gapped)
- สถาบันการเงิน (ข้อมูลทางการเงิน)
- โรงงานที่มีสูตรลับ (Trade Secret)

---

## ตัวเลือกการติดตั้ง 3 แบบ

| แบบ | เหมาะกับ | ฮาร์ดแวร์ขั้นต่ำ | เครือข่าย |
|---|---|---|---|
| **A — Minimal** | ทดสอบ / พัฒนา / ทีมเล็ก (1–5 คน) | RTX 4090 / 24 GB VRAM | LAN ธรรมดา |
| **B — Standard** | SME / สำนักงาน (5–50 คน) | 2× A100 40 GB / 128 GB RAM | LAN + Firewall |
| **C — Enterprise** | โรงพยาบาล / รัฐ / ≥50 คน | 4× H100 / 512 GB RAM | Air-Gapped / VLAN |

---

## ข้อกำหนดระบบ (ประมาณการ — ยังไม่ได้ทดสอบกับฮาร์ดแวร์จริงทุกรุ่น)

### แบบ A — Minimal

```
OS:     Ubuntu 22.04 LTS หรือ Windows Server 2022
GPU:    NVIDIA RTX 4090 (24 GB VRAM) — 1 ใบ
CPU:    16 cores / 32 threads ขึ้นไป
RAM:    64 GB DDR5
Storage:  2 TB NVMe SSD (โมเดล ~30 GB + ข้อมูล + logs)
Network:  1 Gbps LAN
```

### แบบ B — Standard

```
OS:     Ubuntu 22.04 LTS
GPU:    NVIDIA A100 40 GB — 2 ใบ (Tensor Parallel)
CPU:    32 cores / 64 threads
RAM:    256 GB ECC
Storage:  10 TB NVMe RAID-1
Network:  10 Gbps LAN + Hardware Firewall
```

### แบบ C — Enterprise / Air-Gapped

```
OS:     Ubuntu 22.04 LTS (ไม่เชื่อมอินเทอร์เน็ต)
GPU:    NVIDIA H100 80 GB — 4–8 ใบ
CPU:    64+ cores (Dual Socket)
RAM:    512+ GB ECC
Storage:  50 TB NVMe RAID-6 + Tape Backup
Network:  Air-Gapped LAN, ไม่มีอินเทอร์เน็ต
```

---

## ขั้นตอนติดตั้ง — แบบ A (Minimal)

### 1. เตรียม GPU Driver และ CUDA

```bash
# ตรวจ GPU
nvidia-smi

# ติดตั้ง CUDA Toolkit 12.x (ถ้ายังไม่มี)
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
sudo apt install -y cuda-toolkit-12-3

# ตรวจสอบ
nvcc --version
```

### 2. ติดตั้ง Docker และ NVIDIA Container Toolkit

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# NVIDIA Container Toolkit
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt update && sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### 3. ดาวน์โหลดโมเดล (ทำบนเครื่องที่มีอินเทอร์เน็ตก่อน แล้วย้ายไป Air-Gapped)

```bash
pip install huggingface_hub

python3 - <<'EOF'
from huggingface_hub import snapshot_download
snapshot_download(
    repo_id="openthai-ai/openthai-1.0",   # อัปเดต repo จริงเมื่อได้ยืนยัน
    local_dir="/data/models/openthai-1.0",
    ignore_patterns=["*.pt", "*.bin"]     # ดึงเฉพาะ safetensors
)
print("ดาวน์โหลดเสร็จ")
EOF

# ⚠️ ชื่อโมเดลบน HuggingFace ยังไม่ได้รับการยืนยัน (ดู TEAM-BACKLOG.md หนี้เทคนิค)
# ต้องตรวจสอบกับ ai-ml-engineer ก่อนใช้จริง
```

### 4. รันด้วย Docker Compose

บันทึกไฟล์ `docker-compose.yml`:

```yaml
version: '3.8'

services:
  openthai-engine:
    image: vllm/vllm-openai:v0.4.3
    container_name: openthai_engine
    runtime: nvidia
    environment:
      - CUDA_VISIBLE_DEVICES=0
    ports:
      - "8000:8000"          # API endpoint (ใช้ภายใน LAN เท่านั้น)
    volumes:
      - /data/models:/models
    command: >
      --model /models/openthai-1.0
      --tensor-parallel-size 1
      --max-model-len 8192
      --gpu-memory-utilization 0.90
      --port 8000
      --host 0.0.0.0
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: openthai_proxy
    ports:
      - "443:443"            # HTTPS ภายใน LAN
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - openthai-engine
    restart: unless-stopped
```

```bash
# รัน
docker compose up -d

# ตรวจสอบ
docker compose logs -f openthai-engine
```

### 5. ทดสอบ API

```bash
# ทดสอบ endpoint พื้นฐาน
curl -s http://localhost:8000/health

# ทดสอบการตอบ
curl -s http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openthai-1.0",
    "messages": [{"role": "user", "content": "สวัสดีครับ คุณคือใคร"}],
    "max_tokens": 200
  }' | python3 -m json.tool
```

---

## การกำหนดค่าความปลอดภัย (บังคับทุกแบบ)

### บล็อก telemetry ออกนอกเครือข่าย

```bash
# เพิ่มใน /etc/hosts เพื่อบล็อก HuggingFace telemetry
echo "0.0.0.0 huggingface.co" | sudo tee -a /etc/hosts
echo "0.0.0.0 cdn-lfs.huggingface.co" | sudo tee -a /etc/hosts

# ตั้ง ENV ปิด telemetry
export HF_HUB_DISABLE_TELEMETRY=1
export DO_NOT_TRACK=1
```

### Firewall ขั้นต่ำ (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.0.0/24 to any port 8000  # เฉพาะ LAN
sudo ufw allow ssh
sudo ufw enable
```

### Nginx Config (HTTPS ภายใน LAN)

```nginx
server {
    listen 443 ssl;
    server_name openthai.local;

    ssl_certificate     /etc/nginx/certs/openthai.crt;
    ssl_certificate_key /etc/nginx/certs/openthai.key;

    location /v1/ {
        proxy_pass http://openthai-engine:8000/v1/;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 120s;
        # ห้ามส่ง Origin header ออกนอก
        proxy_set_header Origin "";
    }

    # ห้ามเข้าจากนอก LAN
    allow 192.168.0.0/24;
    deny all;
}
```

---

## การอัปเดตโมเดล (Air-Gapped)

```bash
# 1. ดาวน์โหลดโมเดลใหม่บนเครื่องที่มีอินเทอร์เน็ต
# 2. บีบอัด
tar -czf openthai-new-version.tar.gz /data/models/openthai-new-version/

# 3. ย้ายผ่าน USB ที่สแกนไวรัสแล้ว หรือ SFTP ผ่าน LAN ที่ควบคุม
rsync -avz --progress openthai-new-version.tar.gz admin@192.168.x.x:/data/models/

# 4. แตกไฟล์และสลับโมเดล
tar -xzf openthai-new-version.tar.gz -C /data/models/

# 5. อัปเดต docker-compose.yml ชี้ไปที่โมเดลใหม่ แล้ว restart
docker compose down && docker compose up -d
```

---

## ตรวจสอบสุขภาพระบบ (Monitoring)

```bash
# GPU utilization
watch -n 5 nvidia-smi

# Disk usage
df -h /data

# API response time
time curl -s http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"openthai-1.0","messages":[{"role":"user","content":"ping"}],"max_tokens":5}'

# Container logs
docker compose logs --tail=100 openthai-engine
```

---

## สิ่งที่ยังไม่ได้ทำ

| ประเด็น | หมายเหตุ |
|---|---|
| ชื่อโมเดลบน HuggingFace | ยังไม่ได้รับการยืนยัน — ต้องรอ ai-ml-engineer |
| คู่มือแบบ C (Enterprise Air-Gapped) | ต้องออกแบบ network topology แยกต่างหาก |
| Script อัตโนมัติ (Ansible/Terraform) | ยังไม่มี — ตอนนี้ทำมือ |
| การทดสอบจริงกับฮาร์ดแวร์ไทย | ยังไม่ได้ทดสอบ — ตัวเลขเป็นประมาณการ |
| คู่มือภาษาไทยสำหรับ IT ขององค์กรที่ไม่ใช่นักพัฒนา | ต้องทำแยกต่างหาก |
