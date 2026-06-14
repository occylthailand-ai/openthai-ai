# OTAI Token — Tokenomics Draft v0.1
# Blockchain/Web3 Guild · ต้องผ่าน Legal Review ก่อน Deploy

## Token Overview
| Property | Value |
|----------|-------|
| Name | OpenThai AI Token |
| Symbol | OTAI |
| Network | Ethereum / BNB Chain (TBD — pending Legal) |
| Standard | ERC-20 / BEP-20 |
| Total Supply | 1,000,000,000 OTAI |
| Decimals | 18 |

## การกระจาย Token (Distribution)

| Allocation | % | จำนวน OTAI | Vesting |
|-----------|---|-----------|---------|
| Community & Ecosystem | 40% | 400,000,000 | Linear 4 ปี |
| Team & Founders | 20% | 200,000,000 | Cliff 1 ปี + Linear 3 ปี |
| Investors | 15% | 150,000,000 | Cliff 6 เดือน + Linear 2 ปี |
| Affiliate Rewards | 15% | 150,000,000 | จ่ายตาม performance |
| Reserve / Treasury | 10% | 100,000,000 | Multisig — 3/5 signatures |

## Use Cases
1. **Platform Fee Discount** — ชำระ fee ด้วย OTAI ลด 20%
2. **Affiliate Reward** — จ่าย commission ส่วนหนึ่งเป็น OTAI
3. **Governance** — Vote on platform decisions (1 OTAI = 1 vote)
4. **Staking** — Lock OTAI เพื่อรับ APY จาก platform revenue
5. **Access** — Premium features ต้อง hold OTAI ขั้นต่ำ

## Smart Contract Requirements
- [ ] ERC-20 standard implementation
- [ ] Vesting contract สำหรับ Team/Investor
- [ ] Multisig wallet (Gnosis Safe) สำหรับ Treasury
- [ ] Timelock 48 ชม. สำหรับ critical functions
- [ ] Audit โดย CertiK หรือ Hacken ก่อน mainnet

## ⚠️ Legal Requirements (ต้องทำก่อน)
- SEC Thailand consultation
- Whitepaper ที่ถูกต้องตาม regulatory
- KYC/AML สำหรับ Token buyers
- Non-MLM check สำหรับ Affiliate reward structure

*Draft เท่านั้น — ห้าม deploy จนกว่า Chief Legal จะ approve*
