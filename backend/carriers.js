// ── Carriers & Logistics — รับสมัครผู้จัดส่ง/ขนส่งรับจ้าง + งานจัดส่งตามโซน ทุกยานพาหนะ ──
// ครบทุกมิติ: สมัคร/ยืนยันตัวตน(KYC) → ไดเรกทอรีค้นหาตามโซน+ยานพาหนะ → จองงานจัดส่ง →
//            ประเมินค่าขนส่ง → จ่ายงานให้คนขับ → ติดตามสถานะ → เซ็นรับ/ฝากพัสดุ → ให้คะแนน
// Dual-mode: Supabase (REST) เมื่อตั้ง SUPABASE_URL+SERVICE_KEY, ไม่งั้น file JSON
import express from 'express';
import rateLimit from 'express-rate-limit';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const clip = (s, n = 300) => (typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim().slice(0, n) : '');
const num = (v, d = null) => (v === '' || v == null ? d : (Number.isFinite(Number(v)) ? Number(v) : d));
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || '');

// ยานพาหนะทุกประเภท — น้ำหนักบรรทุก (กก.) + ค่าเริ่มต้น + ค่า/กม. (บาท) สำหรับประเมินราคา
export const VEHICLE_TYPES = [
  { id: 'walk',        label: 'เดิน/วิน (ระยะใกล้)', cap_kg: 10,    base: 30,   per_km: 6 },
  { id: 'bicycle',     label: 'จักรยาน',            cap_kg: 15,    base: 35,   per_km: 6 },
  { id: 'motorcycle',  label: 'มอเตอร์ไซค์',        cap_kg: 40,    base: 50,   per_km: 8 },
  { id: 'car',         label: 'รถยนต์',             cap_kg: 150,   base: 90,   per_km: 12 },
  { id: 'pickup',      label: 'รถกระบะ',            cap_kg: 1000,  base: 250,  per_km: 18 },
  { id: 'van',         label: 'รถตู้',              cap_kg: 1200,  base: 320,  per_km: 22 },
  { id: 'truck_4w',    label: 'รถบรรทุก 4 ล้อ',     cap_kg: 2500,  base: 700,  per_km: 30 },
  { id: 'truck_6w',    label: 'รถบรรทุก 6 ล้อ',     cap_kg: 7000,  base: 2000, per_km: 45 },
  { id: 'truck_10w',   label: 'รถบรรทุก 10 ล้อ',    cap_kg: 16000, base: 4500, per_km: 65 },
  { id: 'trailer',     label: 'รถพ่วง/เทรลเลอร์',   cap_kg: 32000, base: 9000, per_km: 90 },
  { id: 'refrigerated',label: 'รถห้องเย็น',         cap_kg: 5000,  base: 1500, per_km: 35 },
  { id: 'boat',        label: 'เรือขนส่ง',          cap_kg: 20000, base: 3000, per_km: 25 },
];
const VEHICLE_IDS = VEHICLE_TYPES.map((v) => v.id);
const vehicleOf = (id) => VEHICLE_TYPES.find((v) => v.id === id) || null;

// โซนบริการ (ภูมิภาค) — จัดส่ง "ตามที่อยู่แต่ละโซน"
export const ZONES = [
  'กรุงเทพและปริมณฑล', 'ภาคกลาง', 'ภาคเหนือ', 'ภาคตะวันออกเฉียงเหนือ',
  'ภาคตะวันออก', 'ภาคตะวันตก', 'ภาคใต้', 'ทั่วประเทศ',
];

const CARRIER_TYPES = ['individual', 'fleet', 'company']; // คนขับอิสระ / กลุ่มรถ / บริษัทขนส่ง
const CARRIER_STATUS = ['pending', 'verified', 'approved', 'rejected', 'suspended'];
// requested→quoted→assigned→accepted→picked_up→in_transit→delivered (/failed/cancelled)
export const JOB_STATUS = ['requested', 'quoted', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled'];

export function createCarriers(dataDir, opts = {}) {
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const useSB = !!(SB_URL && SB_KEY);

  try { if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  const CFILE = join(dataDir, 'carriers.json');
  const JFILE = join(dataDir, 'delivery_jobs.json');
  let carriers = {}; let jobs = {};
  try { if (existsSync(CFILE)) carriers = JSON.parse(readFileSync(CFILE, 'utf8')); } catch { carriers = {}; }
  try { if (existsSync(JFILE)) jobs = JSON.parse(readFileSync(JFILE, 'utf8')); } catch { jobs = {}; }
  const saveC = () => { try { writeFileSync(CFILE, JSON.stringify(carriers, null, 2)); } catch { /* ignore */ } };
  const saveJ = () => { try { writeFileSync(JFILE, JSON.stringify(jobs, null, 2)); } catch { /* ignore */ } };

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

  const arr = (v) => (Array.isArray(v) ? v : (typeof v === 'string' && v ? v.split(',') : [])).map((x) => clip(String(x), 60)).filter(Boolean);

  // ── Carriers (ผู้จัดส่ง) ──────────────────────────────────────────────────────
  async function persistCarrier(c) {
    if (useSB) { try { await sbReq('POST', '/carriers', { body: [c], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' }); return; } catch (e) { console.warn('[carriers] SB write:', e.message); } }
    carriers[c.id] = c; saveC();
  }
  async function getCarrier(id) {
    if (useSB) { try { const r = await sbReq('GET', '/carriers', { params: { id: `eq.${id}`, select: '*', limit: '1' } }); return (r && r[0]) || null; } catch (e) { console.warn('[carriers] SB get:', e.message); } }
    return carriers[id] || null;
  }
  async function allCarriers() {
    if (useSB) { try { const r = await sbReq('GET', '/carriers', { params: { select: '*', order: 'created_at.desc', limit: '2000' } }); return r || []; } catch (e) { console.warn('[carriers] SB list:', e.message); } }
    return Object.values(carriers).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // สมัครเป็นผู้จัดส่ง/ขนส่งรับจ้าง — status เริ่ม 'pending', รอ admin ยืนยันตัวตน
  async function register(input) {
    const vehicles = arr(input.vehicles).filter((v) => VEHICLE_IDS.includes(v));
    const zones = arr(input.zones).filter((z) => ZONES.includes(z));
    const now = new Date().toISOString();
    const c = {
      id: `car_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: CARRIER_TYPES.includes(input.type) ? input.type : 'individual',
      business_name: clip(input.business_name, 120),
      contact_name: clip(input.contact_name, 80),
      phone: clip(input.phone, 40),
      email: clip(input.email, 120).toLowerCase(),
      line_id: clip(input.line_id, 60),
      vehicles: vehicles.length ? vehicles : ['motorcycle'],
      zones: zones.length ? zones : ['กรุงเทพและปริมณฑล'],
      base_province: clip(input.base_province, 60),
      capacity_kg: num(input.capacity_kg, null),
      rate_type: ['flat', 'per_km', 'per_zone'].includes(input.rate_type) ? input.rate_type : 'per_km',
      base_rate: num(input.base_rate, null),
      per_km_rate: num(input.per_km_rate, null),
      cod_supported: !!input.cod_supported,        // เก็บเงินปลายทาง
      express_supported: !!input.express_supported, // ส่งด่วน
      refrigerated: !!input.refrigerated,           // ควบคุมอุณหภูมิ
      // เอกสารยืนยันตัวตน (KYC) — ทำให้ "เป็นจริง"
      national_id: clip(input.national_id, 40),
      license_plate: clip(input.license_plate, 40),
      driver_license: clip(input.driver_license, 60),
      vehicle_reg: clip(input.vehicle_reg, 80),
      company_reg: clip(input.company_reg, 80),
      note: clip(input.note, 500),
      status: 'pending',
      verified: false,
      available: true,
      rating_avg: 0, rating_count: 0, jobs_done: 0,
      created_at: now, updated_at: now,
    };
    if (!c.contact_name || !c.phone) return { ok: false, error: 'กรอกชื่อผู้ติดต่อและเบอร์โทรให้ครบ' };
    if (c.type !== 'individual' && !c.business_name) return { ok: false, error: 'กรอกชื่อกิจการ/บริษัท' };
    if (c.email && !isEmail(c.email)) return { ok: false, error: 'อีเมลไม่ถูกต้อง' };
    await persistCarrier(c);
    try { await opts.onNewCarrier?.(c); } catch (e) { console.warn('[carriers] notify:', e.message); }
    return { ok: true, id: c.id, status: c.status };
  }

  // admin ยืนยันตัวตน / อนุมัติ / ระงับ
  async function setCarrierStatus(id, status, { verified } = {}) {
    if (!CARRIER_STATUS.includes(status)) return { ok: false, error: 'invalid status' };
    const c = await getCarrier(id);
    if (!c) return { ok: false, error: 'not found' };
    c.status = status;
    if (verified != null) c.verified = !!verified;
    if (status === 'approved' || status === 'verified') c.verified = true;
    c.updated_at = new Date().toISOString();
    await persistCarrier(c);
    return { ok: true, id, status: c.status, verified: c.verified };
  }

  async function setAvailability(id, available) {
    const c = await getCarrier(id);
    if (!c) return { ok: false, error: 'not found' };
    c.available = !!available; c.updated_at = new Date().toISOString();
    await persistCarrier(c);
    return { ok: true, id, available: c.available };
  }

  // ไดเรกทอรีสาธารณะ — ค้นหาผู้จัดส่งที่อนุมัติแล้ว ตามโซน + ยานพาหนะ + คีย์เวิร์ด
  function publicCarrier(c) {
    return {
      id: c.id, type: c.type, business_name: c.business_name, contact_name: c.contact_name,
      phone: c.phone, line_id: c.line_id, vehicles: c.vehicles || [], zones: c.zones || [],
      base_province: c.base_province, capacity_kg: c.capacity_kg, cod_supported: c.cod_supported,
      express_supported: c.express_supported, refrigerated: c.refrigerated, verified: c.verified,
      available: c.available, rating_avg: c.rating_avg || 0, rating_count: c.rating_count || 0, jobs_done: c.jobs_done || 0,
    };
  }
  async function directory({ zone, vehicle, q, cod, refrigerated } = {}) {
    const list = (await allCarriers()).filter((c) => ['approved', 'verified'].includes(c.status));
    const Q = (q || '').toString().trim().toLowerCase();
    const matched = list.filter((c) => {
      if (zone && zone !== 'ทั้งหมด' && !(c.zones || []).includes(zone) && !(c.zones || []).includes('ทั่วประเทศ')) return false;
      if (vehicle && !(c.vehicles || []).includes(vehicle)) return false;
      if (cod && !c.cod_supported) return false;
      if (refrigerated && !c.refrigerated) return false;
      if (Q && ![c.business_name, c.contact_name, c.base_province].some((f) => (f || '').toLowerCase().includes(Q))) return false;
      return true;
    });
    // จัดอันดับ: พร้อมรับงาน > คะแนนสูง > งานสำเร็จเยอะ
    matched.sort((a, b) => (Number(b.available) - Number(a.available)) || ((b.rating_avg || 0) - (a.rating_avg || 0)) || ((b.jobs_done || 0) - (a.jobs_done || 0)));
    return matched.map(publicCarrier);
  }

  // ── Quote — ประเมินค่าขนส่งตามยานพาหนะ + ระยะทาง + ข้ามโซน + ส่งด่วน ──────────────
  function quote({ vehicle, distance_km, pickup_zone, dropoff_zone, express, weight_kg }) {
    const v = vehicleOf(vehicle) || vehicleOf('motorcycle');
    const dist = Math.max(0, num(distance_km, 0) || 0);
    let price = v.base + v.per_km * dist;
    const crossZone = pickup_zone && dropoff_zone && pickup_zone !== dropoff_zone;
    if (crossZone) price *= 1.2;                       // ข้ามโซน +20%
    if (express) price *= 1.3;                         // ส่งด่วน +30%
    const w = num(weight_kg, 0) || 0;
    if (w > v.cap_kg) price *= 1 + Math.min(1, (w - v.cap_kg) / v.cap_kg); // เกินพิกัด +ตามส่วน
    price = Math.max(v.base, Math.round(price));
    return { vehicle: v.id, vehicle_label: v.label, distance_km: dist, cross_zone: !!crossZone, express: !!express, capacity_kg: v.cap_kg, price };
  }

  // ── Delivery jobs (งานจัดส่ง) ─────────────────────────────────────────────────
  const hist = (status, note) => ({ status, at: new Date().toISOString(), note: note || '' });
  async function persistJob(j) {
    if (useSB) { try { await sbReq('POST', '/delivery_jobs', { body: [j], params: { on_conflict: 'id' }, prefer: 'resolution=merge-duplicates,return=minimal' }); return; } catch (e) { console.warn('[jobs] SB write:', e.message); } }
    jobs[j.id] = j; saveJ();
  }
  async function getJob(id) {
    if (useSB) { try { const r = await sbReq('GET', '/delivery_jobs', { params: { id: `eq.${id}`, select: '*', limit: '1' } }); return (r && r[0]) || null; } catch (e) { console.warn('[jobs] SB get:', e.message); } }
    return jobs[id] || null;
  }
  async function allJobs() {
    if (useSB) { try { const r = await sbReq('GET', '/delivery_jobs', { params: { select: '*', order: 'created_at.desc', limit: '2000' } }); return r || []; } catch (e) { console.warn('[jobs] SB list:', e.message); } }
    return Object.values(jobs).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // จองงานจัดส่ง (ลูกค้า/ร้าน) — ประเมินราคาอัตโนมัติ, status 'quoted'
  async function createJob(input) {
    const vehicle = VEHICLE_IDS.includes(input.vehicle) ? input.vehicle : 'motorcycle';
    const q = quote({ vehicle, distance_km: input.distance_km, pickup_zone: input.pickup_zone, dropoff_zone: input.dropoff_zone, express: !!input.express, weight_kg: input.weight_kg });
    const now = new Date().toISOString();
    const j = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      carrier_id: '',
      shipper_name: clip(input.shipper_name, 80),
      shipper_contact: clip(input.shipper_contact, 120),
      pickup_address: clip(input.pickup_address, 400),
      pickup_zone: ZONES.includes(input.pickup_zone) ? input.pickup_zone : '',
      dropoff_name: clip(input.dropoff_name, 80),
      dropoff_contact: clip(input.dropoff_contact, 120),
      dropoff_address: clip(input.dropoff_address, 400),
      dropoff_zone: ZONES.includes(input.dropoff_zone) ? input.dropoff_zone : '',
      vehicle, weight_kg: num(input.weight_kg, null), parcel_desc: clip(input.parcel_desc, 200),
      distance_km: q.distance_km, express: q.express, cross_zone: q.cross_zone,
      cod_amount: num(input.cod_amount, null), quote_price: q.price,
      ref_order: clip(input.ref_order, 80),
      status: 'quoted',
      tracking_no: '', delivered_at: '', received_by: '', drop_off: '', proof_note: '',
      rating: null, rating_comment: '',
      history: [hist('requested'), hist('quoted', `ประเมิน ฿${q.price} (${q.vehicle_label})`)],
      created_at: now, updated_at: now,
    };
    if (!j.shipper_contact || !j.pickup_address || !j.dropoff_address) return { ok: false, error: 'กรอกที่อยู่รับ-ส่ง และช่องทางติดต่อให้ครบ' };
    await persistJob(j);
    try { await opts.onNewJob?.(j); } catch (e) { console.warn('[jobs] notify:', e.message); }
    return { ok: true, id: j.id, quote: q };
  }

  // จ่ายงานให้ผู้จัดส่ง (admin/dispatch)
  async function assignJob(id, carrier_id, note) {
    const j = await getJob(id);
    if (!j) return { ok: false, error: 'not found' };
    const c = await getCarrier(carrier_id);
    if (!c) return { ok: false, error: 'ไม่พบผู้จัดส่ง' };
    if (!['approved', 'verified'].includes(c.status)) return { ok: false, error: 'ผู้จัดส่งยังไม่ผ่านการอนุมัติ' };
    j.carrier_id = carrier_id;
    j.status = 'assigned';
    j.history = [...(j.history || []), hist('assigned', note || `${c.business_name || c.contact_name}`)];
    j.updated_at = new Date().toISOString();
    await persistJob(j);
    try { await opts.onAssign?.(j, c); } catch (e) { console.warn('[jobs] assign notify:', e.message); }
    return { ok: true, id, carrier_id, carrier_name: c.business_name || c.contact_name };
  }

  async function jobSetStatus(id, status, note) {
    if (!JOB_STATUS.includes(status)) return { ok: false, error: 'invalid status' };
    const j = await getJob(id);
    if (!j) return { ok: false, error: 'not found' };
    j.status = status;
    if (status === 'picked_up' || status === 'in_transit') j.tracking_no = j.tracking_no || `OTL${Date.now().toString().slice(-9)}`;
    j.history = [...(j.history || []), hist(status, note)];
    j.updated_at = new Date().toISOString();
    await persistJob(j);
    return { ok: true, id, status, tracking_no: j.tracking_no };
  }

  // ยืนยันส่งถึงปลายทาง + หลักฐาน (เซ็นรับ received_by / จุดฝากพัสดุ drop_off)
  async function deliverJob(id, { received_by, drop_off, proof_note }) {
    const j = await getJob(id);
    if (!j) return { ok: false, error: 'not found' };
    j.status = 'delivered';
    j.delivered_at = new Date().toISOString();
    j.received_by = clip(received_by, 80);
    j.drop_off = clip(drop_off, 120);
    j.proof_note = clip(proof_note, 200);
    const proof = j.received_by ? `เซ็นรับโดย ${j.received_by}` : j.drop_off ? `ฝากไว้ที่ ${j.drop_off}` : 'จัดส่งสำเร็จ';
    j.history = [...(j.history || []), hist('delivered', proof)];
    j.updated_at = j.delivered_at;
    await persistJob(j);
    // นับงานสำเร็จให้ผู้จัดส่ง
    if (j.carrier_id) { const c = await getCarrier(j.carrier_id); if (c) { c.jobs_done = (c.jobs_done || 0) + 1; c.updated_at = j.delivered_at; await persistCarrier(c); } }
    return { ok: true, id, delivered_at: j.delivered_at };
  }

  // ลูกค้าให้คะแนนผู้จัดส่ง (1-5) → อัปเดตคะแนนเฉลี่ย
  async function rateJob(id, rating, comment, contact) {
    const j = await getJob(id);
    if (!j) return { ok: false, error: 'ไม่พบงานจัดส่ง' };
    const c = (contact || '').toString().trim().toLowerCase();
    if (!c || ![j.shipper_contact, j.dropoff_contact].map((x) => (x || '').toLowerCase()).includes(c)) return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับงานนี้' };
    if (j.status !== 'delivered') return { ok: false, error: 'ให้คะแนนได้เมื่อจัดส่งสำเร็จแล้ว' };
    if (j.rating) return { ok: false, error: 'งานนี้ให้คะแนนแล้ว' };
    const r = Math.max(1, Math.min(5, parseInt(rating, 10) || 0));
    if (!r) return { ok: false, error: 'ให้คะแนน 1-5' };
    j.rating = r; j.rating_comment = clip(comment, 300);
    await persistJob(j);
    if (j.carrier_id) {
      const car = await getCarrier(j.carrier_id);
      if (car) { const n = (car.rating_count || 0) + 1; car.rating_avg = Math.round((((car.rating_avg || 0) * (car.rating_count || 0) + r) / n) * 10) / 10; car.rating_count = n; await persistCarrier(car); }
    }
    return { ok: true, id, rating: r };
  }

  // ติดตามงาน (สาธารณะ) — ต้องระบุ contact ให้ตรง (ผู้ส่งหรือผู้รับ)
  async function trackJob(id, contact) {
    const j = await getJob(id);
    if (!j) return { ok: false, error: 'ไม่พบงานจัดส่งนี้' };
    const c = (contact || '').toString().trim().toLowerCase();
    if (!c || ![j.shipper_contact, j.dropoff_contact].map((x) => (x || '').toLowerCase()).includes(c)) return { ok: false, error: 'ช่องทางติดต่อไม่ตรงกับงานนี้' };
    let carrier = null;
    if (j.carrier_id) { const cc = await getCarrier(j.carrier_id); if (cc) carrier = { name: cc.business_name || cc.contact_name, phone: cc.phone, rating_avg: cc.rating_avg, verified: cc.verified }; }
    return { ok: true, job: {
      id: j.id, status: j.status, vehicle: j.vehicle, parcel_desc: j.parcel_desc,
      pickup_zone: j.pickup_zone, dropoff_zone: j.dropoff_zone, quote_price: j.quote_price,
      cod_amount: j.cod_amount, tracking_no: j.tracking_no, distance_km: j.distance_km,
      delivered_at: j.delivered_at, received_by: j.received_by, drop_off: j.drop_off,
      rating: j.rating, history: j.history || [], created_at: j.created_at, carrier,
    } };
  }

  async function summary() {
    const cs = await allCarriers();
    const js = await allJobs();
    const carrierByStatus = {}; const byVehicle = {}; const byZone = {};
    for (const c of cs) {
      carrierByStatus[c.status || 'pending'] = (carrierByStatus[c.status || 'pending'] || 0) + 1;
      for (const v of (c.vehicles || [])) byVehicle[v] = (byVehicle[v] || 0) + 1;
      for (const z of (c.zones || [])) byZone[z] = (byZone[z] || 0) + 1;
    }
    const jobByStatus = {}; let gmv = 0; let delivered = 0;
    for (const j of js) {
      jobByStatus[j.status || 'requested'] = (jobByStatus[j.status || 'requested'] || 0) + 1;
      if (j.status === 'delivered') { delivered += 1; gmv += Number(j.quote_price) || 0; }
    }
    return {
      mode: useSB ? 'supabase' : 'file',
      carriers: cs.length, carrierByStatus, byVehicle, byZone,
      verified: cs.filter((c) => c.verified).length, available: cs.filter((c) => c.available && ['approved', 'verified'].includes(c.status)).length,
      jobs: js.length, jobByStatus, delivered, gmv,
      recentCarriers: cs.slice(0, 10), recentJobs: js.slice(0, 15),
    };
  }

  // ── Routes ──────────────────────────────────────────────────────────────────
  const applyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 6, message: { success: false, error: 'สมัครบ่อยเกินไป กรุณารอแล้วลองใหม่' } });
  const jobLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: { success: false, error: 'สร้างงานบ่อยเกินไป' } });
  const readLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
  const router = express.Router();
  const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error('[carriers route]', e.message); res.status(500).json({ success: false, error: 'carrier error' }); });

  // metadata สาธารณะ — ยานพาหนะ + โซน
  router.get('/api/logistics/meta', (req, res) => res.json({ success: true, vehicles: VEHICLE_TYPES, zones: ZONES, carrier_types: CARRIER_TYPES }));

  // สมัครเป็นผู้จัดส่ง
  router.post('/api/logistics/carriers/apply', applyLimiter, wrap(async (req, res) => {
    const r = await register(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, id: r.id, status: r.status, message: 'รับใบสมัครแล้ว ทีมงานจะตรวจสอบเอกสารและยืนยันตัวตนก่อนเปิดรับงาน' });
  }));

  // ไดเรกทอรีค้นหาผู้จัดส่ง (สาธารณะ)
  router.get('/api/logistics/carriers', readLimiter, wrap(async (req, res) => {
    const list = await directory({ zone: req.query.zone, vehicle: req.query.vehicle, q: req.query.q, cod: req.query.cod === '1', refrigerated: req.query.refrigerated === '1' });
    res.json({ success: true, count: list.length, carriers: list });
  }));

  // ประเมินค่าขนส่ง (สาธารณะ)
  router.get('/api/logistics/quote', readLimiter, (req, res) => {
    res.json({ success: true, quote: quote({ vehicle: req.query.vehicle, distance_km: req.query.distance_km, pickup_zone: req.query.pickup_zone, dropoff_zone: req.query.dropoff_zone, express: req.query.express === '1', weight_kg: req.query.weight_kg }) });
  });

  // จองงานจัดส่ง (สาธารณะ)
  router.post('/api/logistics/jobs', jobLimiter, wrap(async (req, res) => {
    const r = await createJob(req.body || {});
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, id: r.id, quote: r.quote, message: 'รับงานจัดส่งแล้ว ติดตามสถานะได้ด้วยรหัสงาน + ช่องทางติดต่อ' });
  }));

  // ติดตามงาน (สาธารณะ)
  router.get('/api/logistics/jobs/track', readLimiter, wrap(async (req, res) => {
    const r = await trackJob(req.query.id, req.query.contact);
    if (!r.ok) return res.status(404).json({ success: false, error: r.error });
    res.json({ success: true, ...r });
  }));

  // ให้คะแนนผู้จัดส่ง (สาธารณะ)
  router.post('/api/logistics/jobs/rate', readLimiter, wrap(async (req, res) => {
    const r = await rateJob(req.body?.id, req.body?.rating, req.body?.comment, req.body?.contact);
    if (!r.ok) return res.status(400).json({ success: false, error: r.error });
    res.json({ success: true, ...r });
  }));

  return {
    router, register, allCarriers, getCarrier, setCarrierStatus, setAvailability, directory,
    quote, createJob, assignJob, jobSetStatus, deliverJob, rateJob, trackJob, allJobs, summary,
    VEHICLE_TYPES, ZONES, JOB_STATUS,
  };
}
