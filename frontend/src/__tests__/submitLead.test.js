import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { submitLead, leadError } from '../pages/portals/submitLead';

// submitLead is the shared submit for every /portals/* consent funnel. It exists
// specifically so a rejected lead (missing consent 400 / rate-limit 429 / 500 /
// network) can NOT show the fake "we'll email you" success screen — fetch() does
// not throw on 4xx/5xx, so a naive `try/catch; setSent(true)` reported success on
// a lead the backend never saved. These tests pin that honest-feedback contract.
function mockFetch(impl) { global.fetch = vi.fn(impl); }
const jsonRes = (status, body) => ({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

beforeEach(() => {});
afterEach(() => { vi.restoreAllMocks(); });

describe('submitLead — honest success/failure reporting', () => {
  it('returns ok:true with the id only on a genuinely saved lead', async () => {
    mockFetch(() => Promise.resolve(jsonRes(200, { success: true, id: 'lead_1' })));
    expect(await submitLead({ email: 'a@b.com', consent: true })).toEqual({ ok: true, id: 'lead_1' });
  });

  it('treats a 400 (missing consent / invalid email) as failure, surfacing the backend message', async () => {
    mockFetch(() => Promise.resolve(jsonRes(400, { success: false, error: 'ต้องยินยอมก่อน' })));
    const r = await submitLead({ email: 'bad' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('ต้องยินยอมก่อน');
    expect(r.status).toBe(400);
  });

  it('treats a 429 rate-limit as failure', async () => {
    mockFetch(() => Promise.resolve(jsonRes(429, { success: false, error: 'ส่งบ่อยเกินไป' })));
    const r = await submitLead({ email: 'a@b.com' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(429);
  });

  it('treats a 200 with success:false as failure (not a fake success)', async () => {
    mockFetch(() => Promise.resolve(jsonRes(200, { success: false })));
    expect((await submitLead({ email: 'a@b.com' })).ok).toBe(false);
  });

  it('treats a 500 with an unparseable body as failure', async () => {
    mockFetch(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.reject(new Error('not json')) }));
    const r = await submitLead({ email: 'a@b.com' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(500);
  });

  it('flags a network failure (fetch throws) as ok:false network:true', async () => {
    mockFetch(() => Promise.reject(new Error('offline')));
    expect(await submitLead({ email: 'a@b.com' })).toEqual({ ok: false, error: null, network: true });
  });
});

describe('leadError — message selection', () => {
  it('prefers the backend message when present', () => {
    expect(leadError({ ok: false, error: 'อีเมลซ้ำ' }, 'th')).toBe('อีเมลซ้ำ');
  });
  it('falls back to a localized generic message by lang', () => {
    expect(leadError({ ok: false, error: null }, 'en')).toMatch(/Could not submit/);
    expect(leadError({ ok: false, error: null }, 'zh')).toMatch(/提交失败/);
    expect(leadError({ ok: false, error: null }, 'xx')).toMatch(/ส่งข้อมูลไม่สำเร็จ/); // unknown lang → th
  });
});
