# DNS Configuration Guide — openthai-ai.com
# DevOps/SRE Guild · ภารกิจ 1 · ด่วนทันที

## สถาปัตยกรรม DNS ที่ต้องการ

```
openthai-ai.com        → Vercel (Frontend + Landing)
www.openthai-ai.com    → Vercel (CNAME)
staging.openthai-ai.com → Vercel Preview / Railway
api.openthai-ai.com    → Railway (Backend FastAPI)
```

## ขั้นตอนตั้งค่า DNS (Cloudflare — แนะนำ)

### A Records
| Type | Name | Value | TTL | Proxy |
|------|------|-------|-----|-------|
| A | @ | 76.76.21.21 | Auto | ✅ Proxied |
| A | @ | 76.76.21.22 | Auto | ✅ Proxied |

### CNAME Records
| Type | Name | Value | TTL | Proxy |
|------|------|-------|-----|-------|
| CNAME | www | cname.vercel-dns.com | Auto | ✅ Proxied |
| CNAME | staging | cname.vercel-dns.com | Auto | ✅ Proxied |
| CNAME | api | openthai-backend.railway.app | Auto | ❌ DNS Only |

### ตรวจสอบ
```bash
dig openthai-ai.com
dig www.openthai-ai.com
dig api.openthai-ai.com
curl -I https://openthai-ai.com
curl -I https://api.openthai-ai.com/health
```

## Definition of Done
- [ ] openthai-ai.com → 200 OK (HTTPS)
- [ ] www.openthai-ai.com → redirect หรือ 200 OK
- [ ] staging.openthai-ai.com → 200 OK
- [ ] api.openthai-ai.com/health → {"status": "ok"}
- [ ] SSL Certificate ออก auto จาก Cloudflare/Vercel
