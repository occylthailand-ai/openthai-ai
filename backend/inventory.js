// ── Inventory — คลังสินค้า first-party ครบทุกมิติ (สินค้า + บัญชีเคลื่อนไหวสต๊อก) ──
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
import express from 'express';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const clip = (s, n = 300) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');
const num = (v, d = null) => (v === '' || v == null ? d : (Number.isFinite(Number(v)) ? Number(v) : d));

export function createInventory(dataDir, opts = {}) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const PFILE = join(dataDir, 'products.json');
  const MFILE = join(dataDir, 'stock_movements.json');
  let products = {}; let moves = [];
  try { if (existsSync(PFILE)) products = JSON.parse(readFileSync(PFILE, 'utf8')); } catch { products = {}; }
  try { if (existsSync(MFILE)) moves = JSON.parse(readFileSync(MFILE, 'utf8')); } catch { moves = []; }
  const saveP = () => { try { writeFileSync(PFILE, JSON.stringify(products, null, 2)); } catch { /* ignore */ } };
  const saveM = () => { try { writeFileSync(MFILE, JSON.stringify(moves.slice(-5000), null, 2)); } catch { /* ignore */ } };

  async function sbReq(method, path, { body, params, prefer } = {}) {
    const url = new URL(`${SB_URL}/rest/v1${path}`);
    Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
    const headers = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };
    if (prefer) headers.Prefer = prefer;
    const res = await fetch(url.toString(), { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.message || data.hint)) || `Supabase HTTP ${res.status}`);
    return data;
  }

  // ── products ────────────────────────────────────────────────────────────────
  async function list() {
    if (useSB) { try { const r = await sbReq('GET', '/products', { params: { select: '*', order: 'updated_at.desc', limit: '1000' } }); return r || []; } catch (e) { console.warn('[inventory] SB read:', e.message); } }
    return Object.values(products).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  }
  async function get(id) {
    if (useSB) { try { const r = await sbReq('GET', '/products', { params: { id: `eq.${id}`, select: '*', limit: '1' } }); return (r && r[0]) || null; } catch (e) { console.warn('[inventory] SB get:', e.message); } }
    return products[id] || null;
  }
  async function persist(p) {
    if (useSB) { try { await sbReq('POST', '/products', { body: [p], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' }); return; } catch (e) { console.warn('[inventory] SB write:', e.message); } }
    products[p.id] = p; saveP();
  }

  async function upsert(input) {
    const now = new Date().toISOString();
    const existing = input.id ? await get(input.id) : null;
    const p = {
      id: existing?.id || `prd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sku: clip(input.sku, 40) || existing?.sku || `SKU-${Date.now().toString().slice(-6)}`,
      name: clip(input.name, 120),
      category: clip(input.category, 40) || 'ทั่วไป',
      price: num(input.price, existing?.price ?? 0) || 0,
      cost: num(input.cost, existing?.cost ?? 0) || 0,
      stock: num(input.stock, existing?.stock ?? 0) || 0,
      low_stock: num(input.low_stock, existing?.low_stock ?? 5) || 0,
      status: ['active', 'inactive'].includes(input.status) ? input.status : (existing?.status || 'active'),
      image_url: clip(input.image_url, 300),
      description: clip(input.description, 500),
      created_at: existing?.created_at || now,
      updated_at: now,
    };
    if (!p.name) return { ok: false, error: 'ต้องการชื่อสินค้า' };
    const stockChanged = existing && existing.stock !== p.stock;
    await persist(p);
    if (!existing) await record(p.id, p.stock, 'restock', 'สร้างสินค้าใหม่');
    else if (stockChanged) await record(p.id, p.stock - existing.stock, 'adjust', 'แก้ไขสต๊อกตอนแก้สินค้า');
    return { ok: true, product: p };
  }

  async function remove(id) {
    if (useSB) { try { await sbReq('DELETE', '/products', { params: { id: `eq.${id}` } }); return { ok: true }; } catch (e) { console.warn('[inventory] SB del:', e.message); } }
    if (products[id]) { delete products[id]; saveP(); }
    return { ok: true };
  }

  // ── stock movements ───────────────────────────────────────────────────────────
  async function record(product_id, delta, type, reason, ref, platform) {
    const m = { id: `mv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, product_id, delta: Number(delta) || 0, type, reason: clip(reason, 120), ref: clip(ref, 80), platform: clip(platform, 40) || 'direct', at: new Date().toISOString() };
    if (useSB) { try { await sbReq('POST', '/stock_movements', { body: [m], prefer: 'return=minimal' }); return; } catch (e) { console.warn('[inventory] SB move:', e.message); } }
    moves.push(m); saveM();
  }
  async function movements(productId) {
    if (useSB) { try { const params = { select: '*', order: 'at.desc', limit: '500' }; if (productId) params.product_id = `eq.${productId}`; const r = await sbReq('GET', '/stock_movements', { params }); return r || []; } catch (e) { console.warn('[inventory] SB moves:', e.message); } }
    const list2 = productId ? moves.filter((m) => m.product_id === productId) : moves;
    return [...list2].sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 500);
  }

  // ปรับสต๊อก (เติม/ตัด/ปรับ) + อัปเดตยอด — type: restock|sale|adjust
  async function adjust(id, delta, type = 'adjust', reason = '', ref = '', platform = 'direct') {
    const p = await get(id);
    if (!p) return { ok: false, error: 'ไม่พบสินค้า' };
    const d = Math.trunc(Number(delta) || 0);
    if (!d) return { ok: false, error: 'จำนวนต้องไม่เป็นศูนย์' };
    const before = p.stock || 0;
    if (type === 'sale' && before + d < 0) return { ok: false, error: 'สต๊อกไม่พอ', stock: before };
    p.stock = Math.max(0, before + d);
    p.updated_at = new Date().toISOString();
    const lowNow = p.stock <= (p.low_stock ?? 0);
    // แจ้งเตือนเติมสต๊อกเมื่อลดลงต่ำกว่าจุดเตือน (ครั้งเดียว/รอบ — กันสแปม)
    const crossed = d < 0 && lowNow && !p.low_alerted;
    p.low_alerted = lowNow ? true : false; // reset เมื่อเติมกลับเหนือจุดเตือน
    await persist(p);
    await record(id, d, type, reason, ref, platform);
    if (crossed) { try { await opts.onLowStock?.(p); } catch (e) { console.warn('[inventory] onLowStock:', e.message); } }
    return { ok: true, stock: p.stock, low: lowNow };
  }

  // ยอดขายต่อสินค้า — ขายแล้ว / คงเหลือ / แยกตามแพลตฟอร์ม (affiliate hub)
  async function productSales(id) {
    const p = await get(id);
    const mv = (await movements(id)).filter((m) => m.type === 'sale');
    const byPlatform = {};
    let sold = 0;
    for (const m of mv) { const q = Math.abs(m.delta); sold += q; const k = m.platform || 'direct'; byPlatform[k] = (byPlatform[k] || 0) + q; }
    return { id, name: p?.name, sku: p?.sku, sold, remaining: p?.stock ?? 0, low_stock: p?.low_stock ?? 0, low: (p?.stock ?? 0) <= (p?.low_stock ?? 0), byPlatform };
  }

  // รายงานยอดขายทุกสินค้า + รวมตามแพลตฟอร์ม
  async function salesReport() {
    const items = await list();
    const mv = (await movements()).filter((m) => m.type === 'sale');
    const soldByProduct = {}; const byPlatform = {};
    for (const m of mv) {
      const q = Math.abs(m.delta);
      soldByProduct[m.product_id] = (soldByProduct[m.product_id] || 0) + q;
      const k = m.platform || 'direct'; byPlatform[k] = (byPlatform[k] || 0) + q;
    }
    const rows = items.map((p) => ({ id: p.id, name: p.name, sku: p.sku, sold: soldByProduct[p.id] || 0, remaining: p.stock || 0, low_stock: p.low_stock ?? 0, low: (p.stock || 0) <= (p.low_stock ?? 0) }));
    return { mode: useSB ? 'supabase' : 'file', rows, byPlatform, totalSold: Object.values(soldByProduct).reduce((a, b) => a + b, 0) };
  }

  async function summary() {
    const items = await list();
    let valueRetail = 0, valueCost = 0, units = 0;
    const low = [];
    for (const p of items) {
      valueRetail += (p.price || 0) * (p.stock || 0);
      valueCost += (p.cost || 0) * (p.stock || 0);
      units += (p.stock || 0);
      if ((p.stock || 0) <= (p.low_stock ?? 0)) low.push({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, low_stock: p.low_stock });
    }
    const mv = await movements();
    const unitsSold = mv.filter((m) => m.type === 'sale').reduce((t, m) => t + Math.abs(m.delta), 0);
    return { mode: useSB ? 'supabase' : 'file', products: items.length, active: items.filter((p) => p.status === 'active').length, totalUnits: units, valueRetail, valueCost, lowStock: low, unitsSold, movements: mv.length };
  }

  // public — สินค้าพร้อมขาย
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[inventory route]', e.message); res.status(500).json({ success: false, error: 'inventory error' }); });
  router.get('/api/shop/products', wrap(async (req, res) => {
    const items = (await list()).filter((p) => p.status === 'active');
    res.json({ success: true, products: items.map((p) => ({ id: p.id, sku: p.sku, name: p.name, category: p.category, price: p.price, image_url: p.image_url, description: p.description, in_stock: (p.stock || 0) > 0, stock: p.stock })) });
  }));

  return { router, list, get, upsert, remove, adjust, record, movements, summary, productSales, salesReport };
}
