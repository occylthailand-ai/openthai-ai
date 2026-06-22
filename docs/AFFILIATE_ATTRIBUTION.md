# 🎯 Affiliate Attribution — ลูกค้าคนแรกจาก affiliate (พิสูจน์ได้)

> Directive: **AFFILIATE-001** (Mythos → Poseidon + Demeter)
> ปิดจุดตัน: เชื่อม "affiliate → การขายจริง → ลูกค้าจริง" เพื่อต่อยอดเป็น PR ที่มีพลัง
> ปรับปรุง: 2026-06-09

---

## สายข้อมูล (end-to-end)

```
ลิงก์ affiliate ?ref=CODE  →  localStorage.otai_ref  →  POST /api/shop/checkout {ref}
                                                              │
                                                จ่ายสำเร็จ (finalizePaid)
                                                              ▼
                                          recordConversion(ref, order)
                                          • หา affiliate จาก ref_code
                                          • commission = ยอด × 20%
                                          • บันทึก conversion (ไฟล์ + Supabase KV)
                                          • อัปเดต total_sales / total_revenue / total_earned
                                          • webhook: affiliate.conversion (first_ever?)
```

**สำคัญ:** attribute เมื่อ **"จ่ายเงินสำเร็จ"** เท่านั้น (ไม่ใช่ตอนวางออเดอร์) = ลูกค้าที่สำเร็จจริง

---

## ข้อมูลที่ได้ต่อ 1 conversion
```json
{ "ref_code":"PRAE001", "affiliate_name":"แม่ค้าเอ",
  "order_id":"ord_...", "product_name":"น้ำพริกเผา",
  "customer_name":"ลูกค้าจริง", "customer_contact_masked":"08***78",
  "amount":240, "commission":48, "first_ever":true, "at":"2026-..." }
```
- `customer_contact_masked` — เบอร์/อีเมลถูก mask (เป็นมิตรกับ PDPA)
- `first_ever: true` — 🎯 **"ลูกค้าคนแรกจาก affiliate"** สำหรับทำ PR case study

---

## API
| Endpoint | สิทธิ์ | ได้อะไร |
|---|---|---|
| `GET /api/affiliate/conversions?key=ADMIN_KEY` | admin | รายการ + `total_revenue`, `total_commission`, **`first_conversion`** |
| `GET /api/affiliate/stats/:ref_code` | public | ยอดสะสมของ affiliate (total_sales/earned) |

---

## ต่อยอดเป็น PR ที่มีพลัง (playbook)
1. ได้ `first_conversion` จริง → ขอ consent (ระบบมี PDPA) ทำ testimonial
2. เขียน case study: "แม่ค้า X ปิดออเดอร์แรกใน Y วัน ได้ค่าคอม ฿Z ด้วย Openthai.ai"
3. เพิ่มเป็น press release → Press Room + ป้อน **PR Autopilot** → โซเชียลวันเว้นวัน
4. ใช้เป็นแม่เหล็กชวน affiliate คนถัดไป → flywheel

---

## ตำแหน่งในกองทัพ Mythos
**Poseidon** (payment/checkout) จับการจ่ายสำเร็จ · **Demeter** (data) เก็บ conversion ถาวร · **Hermes** เปลี่ยนเป็น PR

## เทส
`backend/test/affiliate.integration.test.js` — ขายผ่าน ref → conversion + first_ever + ค่าคอม 20% + mask + ไม่มี ref ไม่ attribute + ref มั่วไม่ crash

## หมายเหตุ
- รองรับเต็มในเส้นทางจ่ายทันที (card/mock). PromptPay ที่ยืนยันภายหลังผ่าน webhook เป็นงานต่อยอด (เก็บ `ref` บนออเดอร์ไว้แล้ว)
- ตั้ง `OPENTHAI_DATA_DIR` เพื่อชี้ที่เก็บข้อมูล (ใช้ในเทส/persistent volume)
