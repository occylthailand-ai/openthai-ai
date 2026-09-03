import { describe, expect, it } from 'vitest';
import {
  amountToThaiText,
  appendConsentLedgerEntry,
  buildPromptPayPayload,
  computeIncomeModel,
  crc16Ccitt,
  getIncomeAlerts,
  rankLifePlatforms,
  tamperConsentLedger,
  verifyConsentChain,
} from '../pages/StrategyCenterPage';

describe('thai life helpers', () => {
  it('builds a PromptPay payload with CRC16-CCITT', () => {
    const result = buildPromptPayPayload({ phone: '0812345678', amount: 1000, merchantName: 'OpenThai AI', city: 'Bangkok' });
    expect(result.ok).toBe(true);
    expect(result.payload.endsWith(result.crc)).toBe(true);
    expect(crc16Ccitt(result.payload.slice(0, -4))).toBe(result.crc);
    expect(result.maskedPhone).toBe('081-***-678');
  });

  it('rejects 13-digit identifiers for PromptPay', () => {
    const result = buildPromptPayPayload({ phone: '1234567890123', amount: 500 });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('13 หลัก');
  });

  it('formats Thai baht text', () => {
    expect(amountToThaiText(1000)).toBe('หนึ่งพันบาทถ้วน');
  });

  it('emits threshold and loss alerts for income model', () => {
    const model = computeIncomeModel({
      grossRevenue: 10000,
      cogs: 5000,
      ads: 2000,
      shipping: 500,
      packaging: 300,
      misc: 1500,
    }, {
      commissionRate: 0.1,
      paymentRate: 0.02,
      logisticsRate: 0.05,
    });
    const alerts = getIncomeAlerts(model);
    expect(alerts.some((item) => item.text.includes('Commission ≥10%'))).toBe(true);
    expect(alerts.some((item) => item.text.includes('ค่าโฆษณา ≥15%'))).toBe(true);
    expect(alerts.some((item) => item.text.includes('ไม่แนะนำเพิ่มงบโฆษณา'))).toBe(true);
  });

  it('verifies consent HMAC chain and freezes after tamper', async () => {
    const secret = '11'.repeat(16);
    const first = await appendConsentLedgerEntry([], secret, { platform: 'LINE OA', action: 'granted', purpose: 'CRM' });
    const second = await appendConsentLedgerEntry(first.entries, secret, { platform: 'LINE OA', action: 'withdraw_19', purpose: 'CRM' });
    expect((await verifyConsentChain(second.entries, secret)).ok).toBe(true);
    const tampered = tamperConsentLedger(second.entries);
    expect((await verifyConsentChain(tampered, secret)).ok).toBe(false);
    const blocked = await appendConsentLedgerEntry(tampered, secret, { platform: 'LINE OA', action: 'erase_33', purpose: 'CRM' });
    expect(blocked.frozen).toBe(true);
  });

  it('ranks life platforms by selected axis', () => {
    const ranked = rankLifePlatforms('incomeLeft');
    expect(ranked[0].name).toBe('OpenThaiAi');
    expect(ranked).toHaveLength(14);
  });
});
