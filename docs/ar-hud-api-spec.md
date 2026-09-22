# AR / Smart Glasses HUD API Specification — Wave 11
> เสิร์ฟ: ทุกกลุ่มผู้ใช้ผ่าน edge worker บน Vuzix / RealWear / smart glasses
> ผู้เขียน: AI assistant | วันที่: 2026-09-14 | สถานะ: Draft

## Overview

Glasses ต้องการ payload ที่กะทัดรัด (<2 KB) เพราะ:
- bandwidth จำกัด (Bluetooth / LTE tethered)
- processor ใส่กรอบแว่นมีแรมน้อย
- หน้าจอ HUD มีพื้นที่จำกัด (~400×150 px หรือเทียบเท่า)

---

## 1. Endpoint

```
GET /api/hud/{portal_id}?lang={th|zh|en}&uid={user_id}
```

| Parameter | Required | Values |
|-----------|----------|--------|
| `portal_id` | ✅ | `producer`, `intermediary`, `consumer`, `professional`, `platform`, `ecosystem` |
| `lang` | ✅ | `th` (default), `zh`, `en` |
| `uid` | optional | UUID ของผู้ใช้ (ถ้ามี session) |

---

## 2. Response Schema (JSON)

```json
{
  "v": 1,
  "ts": "2026-09-14T10:30:00+07:00",
  "uid": "anon",
  "portal": "producer",
  "hud": {
    "title": "ผู้ผลิต",
    "subtitle": "สวัสดี! มี 2 รายการรอดำเนินการ",
    "badge": "🌾",
    "alert": null
  },
  "cards": [
    {
      "id": "welfare-check",
      "icon": "🌾",
      "label": "ตรวจสอบมาตรฐาน GAP",
      "value": "ผ่าน 3/5",
      "action": "/producer#gap",
      "priority": 1
    },
    {
      "id": "price-alert",
      "icon": "📈",
      "label": "ราคาข้าวหอมมะลิ",
      "value": "฿18,500/ตัน ↑2.3%",
      "action": "/producer#price",
      "priority": 2
    }
  ],
  "alerts": [],
  "actions": [
    { "id": "create-content", "label": "สร้างคอนเทนต์", "url": "/ai-generator", "icon": "⚡" },
    { "id": "check-welfare",  "label": "ตรวจสิทธิ์",    "url": "/consumer",      "icon": "🛒" }
  ],
  "meta": {
    "ttl": 30,
    "next_poll": 30
  }
}
```

---

## 3. Field Definitions

### Root
| Field | Type | Max | Description |
|-------|------|-----|-------------|
| `v` | int | — | Schema version (ปัจจุบัน: 1) |
| `ts` | ISO8601 | — | Timestamp ของ response |
| `uid` | string | 36 | User ID หรือ `"anon"` |
| `portal` | string | 20 | Portal ID |

### `hud` object
| Field | Type | Max len | Description |
|-------|------|---------|-------------|
| `title` | string | 20 | ชื่อ portal (แสดงบน HUD title bar) |
| `subtitle` | string | 50 | ข้อความต้อนรับ/สรุปสั้น |
| `badge` | string | 2 | Emoji สัญลักษณ์ portal |
| `alert` | string\|null | 80 | Alert ด่วน (null ถ้าไม่มี) |

### `cards[]` array (max 4 cards)
| Field | Type | Max len | Description |
|-------|------|---------|-------------|
| `id` | string | 30 | Unique card ID |
| `icon` | string | 2 | Emoji ประจำ card |
| `label` | string | 25 | ชื่อ metric/action |
| `value` | string | 30 | ค่าที่แสดงบน HUD |
| `action` | string | 100 | URL ที่เปิดเมื่อกด |
| `priority` | int | — | 1 = แสดงก่อน |

### `alerts[]` array (max 3 alerts)
| Field | Type | Max len | Description |
|-------|------|---------|-------------|
| `id` | string | 30 | Alert ID |
| `level` | string | — | `"info"`, `"warn"`, `"critical"` |
| `msg` | string | 60 | ข้อความ alert |
| `action` | string\|null | 100 | URL ถ้าต้องการ action |

### `actions[]` array (max 3 quick actions)
| Field | Type | Max len | Description |
|-------|------|---------|-------------|
| `id` | string | 30 | Action ID |
| `label` | string | 15 | ชื่อ action (สั้น) |
| `url` | string | 100 | Deep link URL |
| `icon` | string | 2 | Emoji |

### `meta` object
| Field | Type | Description |
|-------|------|-------------|
| `ttl` | int (seconds) | อายุ cache ของ response |
| `next_poll` | int (seconds) | แนะนำให้ poll ครั้งต่อไปเมื่อไหร่ |

---

## 4. ข้อกำหนดขนาด Payload

| Constraint | Limit |
|------------|-------|
| Response body | ≤ 2,048 bytes (UTF-8) |
| cards | ≤ 4 รายการ |
| alerts | ≤ 3 รายการ |
| actions | ≤ 3 รายการ |
| String values | ตามตาราง Field Definitions |

---

## 5. Compression

เปิดใช้ gzip/Brotli บน server เสมอ — ลด payload จาก ~1,500B เป็น ~400B

---

## 6. Portal-Specific Card Templates

### producer
```json
{
  "cards": [
    { "id": "standards", "icon": "📋", "label": "มาตรฐาน GAP/อย.", "value": "ผ่าน {n}/{total}", "priority": 1 },
    { "id": "price",     "icon": "📈", "label": "ราคาตลาดวันนี้",  "value": "฿{price}/ตัน",     "priority": 2 },
    { "id": "content",   "icon": "🎬", "label": "คอนเทนต์ pending",  "value": "{n} รายการ",       "priority": 3 }
  ]
}
```

### intermediary
```json
{
  "cards": [
    { "id": "deals",     "icon": "🤝", "label": "Deal pipeline",  "value": "{n} deals",       "priority": 1 },
    { "id": "hs-alert",  "icon": "🌏", "label": "HS Code alert",  "value": "{n} รายการ",      "priority": 2 },
    { "id": "shipment",  "icon": "🚚", "label": "Shipment ETA",   "value": "{eta}",           "priority": 3 }
  ]
}
```

### consumer
```json
{
  "cards": [
    { "id": "welfare",   "icon": "🛡️", "label": "สิทธิ์รัฐที่มี",    "value": "{n} สิทธิ์",    "priority": 1 },
    { "id": "complaint", "icon": "⚠️",  "label": "เรื่องร้องเรียน",  "value": "{status}",     "priority": 2 }
  ]
}
```

### professional
```json
{
  "cards": [
    { "id": "tools",     "icon": "🔧", "label": "เครื่องมือ AI",  "value": "{n} เครื่องมือ", "priority": 1 },
    { "id": "disclaimer","icon": "⚠️", "label": "ต้องตรวจสอบ",   "value": "โดยผู้เชี่ยวชาญ","priority": 2 }
  ]
}
```

---

## 7. Error Response

```json
{
  "v": 1,
  "error": "portal_not_found",
  "msg": "Portal ที่ร้องขอไม่มีอยู่",
  "hud": {
    "title": "Error",
    "subtitle": "ไม่พบข้อมูล",
    "badge": "❌",
    "alert": "Portal ที่ร้องขอไม่มีอยู่"
  },
  "cards": [],
  "alerts": [],
  "actions": []
}
```

---

## 8. Device Compatibility

| Device | Screen | API Notes |
|--------|--------|-----------|
| Vuzix Blade | 480×270 | จำกัด 2 cards visible |
| RealWear HMT-1 | Voice-driven | `action` URLs ต้องเป็น deep links |
| Generic smart glasses | Varies | Use `cards[0..1]` only for safety |
| Mobile (fallback) | 320px+ | แสดง full UI ปกติ |

---

## 9. Implementation Notes (Wave 11)

**Backend:**
```javascript
// backend/routes/hud.js (to be created)
router.get('/api/hud/:portalId', async (req, res) => {
  const { portalId } = req.params;
  const { lang = 'th', uid = 'anon' } = req.query;
  
  const payload = await buildHudPayload(portalId, lang, uid);
  
  res.set('Cache-Control', `public, max-age=${payload.meta.ttl}`);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.json(payload);
});
```

**Glasses Edge Worker (pseudocode):**
```python
# runs on device, polls every meta.next_poll seconds
import requests, json

def poll_hud(portal_id: str, user_id: str) -> dict:
    r = requests.get(
        f"https://api.openthai.ai/api/hud/{portal_id}",
        params={"lang": "th", "uid": user_id},
        timeout=5
    )
    return r.json()

def render_to_hud(payload: dict) -> None:
    hud = payload["hud"]
    cards = payload["cards"][:2]  # show top 2 on small screen
    # render to display...
```

---

## 10. Security

- API เปิดใช้แบบ public สำหรับ `anon` — ข้อมูลเป็น aggregated ไม่มี PII
- ถ้า `uid` ระบุ: ต้องมี JWT bearer token ใน `Authorization` header
- Rate limit: 60 requests/minute per IP
- CORS: เปิดสำหรับ `https://*.openthai.ai` เท่านั้น

---

*ขั้นตอนถัดไป (Wave 11)*: สร้าง `backend/routes/hud.js` + unit tests + ทดสอบบน emulator
