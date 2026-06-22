# 🎁 Invite Program — โปรแกรมเชิญชวนลูกค้าสำเร็จรูป อัตโนมัติ

> Directive: **INVITE-001** (Mythos → Hermes + Athena + Poseidon)
> ลูกค้าชวนลูกค้า → เพื่อนซื้อสำเร็จ → ผู้ชวนได้เครดิตอัตโนมัติ · โค้ด: `backend/invite.js`
> ปรับปรุง: 2026-06-09

---

## วงจรอัตโนมัติ

```
ลูกค้า  ──POST /api/invite/create──▶  โค้ด + ลิงก์ ?invite=CODE
  │                                          │ แชร์ให้เพื่อน
  │                                          ▼
  │                          เพื่อนเปิดลิงก์ → otai_invite (localStorage)
  │                                          ▼
  │                          เพื่อนซื้อ /api/shop/checkout {invite}
  │                                          ▼ จ่ายสำเร็จ (finalizePaid)
  └──────  +10 เครดิต อัตโนมัติ ◀── invite.reward() → credits.grant()
```

- **สำเร็จรูป**: ลูกค้าได้ลิงก์พร้อมแชร์ทันที ไม่ต้องตั้งค่าอะไร
- **อัตโนมัติ**: รางวัลเข้าเมื่อ "จ่ายเงินสำเร็จ" เท่านั้น — ไม่มีงานมือ
- รางวัลปรับได้: `INVITE_REWARD_CREDITS` (default 10 เครดิต/คนที่ชวนสำเร็จ)

---

## ต่างจาก Affiliate อย่างไร
| | Affiliate | **Invite (ลูกค้าชวนลูกค้า)** |
|---|---|---|
| ใคร | พาร์ตเนอร์/KOL ที่สมัคร | ลูกค้าทั่วไปทุกคน |
| รางวัล | คอมมิชชั่น 20% (เงิน) | เครดิตในระบบ (เช่น 10/คน) |
| พารามิเตอร์ | `?ref=` | `?invite=` |
| โค้ด | `backend/server.js` (conversions) | `backend/invite.js` |

> ทั้งคู่ attribute ตอน "จ่ายสำเร็จ" เส้นเดียวกัน (finalizePaid) — ใช้ร่วมกันได้ในออเดอร์เดียว

---

## API
| Endpoint | ได้อะไร |
|---|---|
| `POST /api/invite/create {email}` | โค้ด + ลิงก์เชิญ (idempotent ต่ออีเมล) |
| `GET /api/invite/status/:code` | ชวนสำเร็จกี่คน · ได้กี่เครดิต · ผู้ชวน (masked) |
| `GET /api/invite/leaderboard` | อันดับผู้ชวนเก่งสุด |
| `GET /api/invite/summary` | รวมโค้ด/conversion/เครดิต + `first_referral` |

ตัวอย่าง status:
```json
{ "code":"422JTE", "owner_masked":"s***@test.com",
  "invited_converted":1, "credits_earned":10,
  "recent":[{ "order_id":"ord_...", "reward":10, "first_ever":true }] }
```

---

## guardrails
- กันให้รางวัลซ้ำต่อ 1 ออเดอร์ (`source = invite:<order_id>`)
- โค้ดไม่รู้จัก → ไม่ crash, ไม่ให้รางวัล
- อีเมลผู้ชวนถูก mask (PDPA)
- รางวัลเป็น "เครดิต" (consume ได้ในระบบ) — ไม่ใช่เงินสด ลดความเสี่ยงการโกง

## เทส
`backend/test/invite.test.js` — โค้ด idempotent, ให้เครดิตจริง+first_ever, กันซ้ำ, โค้ดมั่วไม่ crash, status/leaderboard/summary

## ตำแหน่งในกองทัพ Mythos
**Poseidon** จับการจ่ายสำเร็จ → **Athena/credits** ให้รางวัล → **Hermes** เปลี่ยนผู้ชวนที่สำเร็จเป็นเรื่องราว PR
