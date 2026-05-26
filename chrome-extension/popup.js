// popup.js — ตัวควบคุม UI ทั้งหมด

let currentProduct = null;
let currentResult  = null;
let currentAffLink = '';

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // ดึงข้อมูลสินค้าจาก active tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { showNoProduct('ไม่พบ tab ที่ active'); return; }

    // inject content script ถ้ายังไม่มี
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    } catch (_) { /* already injected */ }

    const product = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_PRODUCT' });
    if (product?.name) {
      currentProduct = product;
      renderProduct(product);
      showControls(true);
    } else {
      showNoProduct('ไม่พบข้อมูลสินค้าในหน้านี้\nลองเปิดหน้าสินค้าบน Shopee, Lazada หรือ AliExpress');
    }
  } catch (e) {
    showNoProduct('เปิดหน้าสินค้าก่อน แล้วคลิกส่วนขยายนี้อีกครั้ง');
  }
});

// ── Render Product ────────────────────────────────────────────────────────────
function renderProduct(p) {
  const platformColor = {
    shopee: '#ee4d2d', lazada: '#0f146b', aliexpress: '#ff6a00',
    tiktokshop: '#fe2c55', generic: '#6366f1',
  };
  const platformName = { shopee:'Shopee', lazada:'Lazada', aliexpress:'AliExpress', tiktokshop:'TikTok Shop', generic:'ทั่วไป' };

  const imgHtml = p.image
    ? `<img class="product-img" src="${escHtml(p.image)}" onerror="this.style.display='none'" alt="">`
    : `<div class="product-img placeholder">🛍️</div>`;

  document.getElementById('productSection').innerHTML = `
    <div class="product">
      ${imgHtml}
      <div class="product-info">
        <div class="product-name">${escHtml(p.name)}</div>
        ${p.price ? `<div class="product-price">${escHtml(p.price)}</div>` : ''}
        <div class="product-platform" style="color:${platformColor[p.platform]||'#6366f1'}">${platformName[p.platform]||p.platform}</div>
      </div>
    </div>`;
}

function showNoProduct(msg) {
  document.getElementById('productSection').innerHTML = `<div class="no-product">${msg}</div>`;
}

function showControls(show) {
  ['controls','btnGenerate','settingsSection'].forEach(id => {
    document.getElementById(id).style.display = show ? '' : 'none';
  });
}

// ── Generate ──────────────────────────────────────────────────────────────────
async function generate() {
  if (!currentProduct) return;

  const btn = document.getElementById('btnGenerate');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>กำลังสร้างคอนเทนต์...';
  document.getElementById('results').style.display = 'none';
  document.getElementById('errMsg').style.display  = 'none';

  // เดา category จากชื่อสินค้า
  const category = guessCategory(currentProduct.name);
  const form = {
    product:  currentProduct.name,
    category,
    platform: document.getElementById('selPlatform').value,
    style:    document.getElementById('selStyle').value,
    lang:     'ภาษาไทย',
    price:    currentProduct.price || '',
    audience: 'ทั่วไป',
  };

  const resp = await chrome.runtime.sendMessage({
    type: 'GENERATE_CONTENT',
    form,
    product: currentProduct,
  });

  btn.disabled = false;
  btn.innerHTML = '✨ สร้างใหม่อีกครั้ง';

  if (!resp?.ok) {
    showError(resp?.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    return;
  }

  currentResult  = resp.data;
  currentAffLink = resp.affiliateLink;
  renderResults(resp.data, resp.affiliateLink);
}

// ── Render Results ────────────────────────────────────────────────────────────
function renderResults(data, affLink) {
  // Hook
  document.getElementById('hook').textContent = data.hook || '';

  // Script
  const script = Array.isArray(data.script) ? data.script.join('\n\n') : (data.script || '');
  document.getElementById('script').textContent = script;

  // Caption
  document.getElementById('caption').textContent = data.caption || '';

  // Hashtags
  const tags = Array.isArray(data.hashtags) ? data.hashtags : [];
  document.getElementById('hashtags').innerHTML = tags
    .map(t => `<span class="hashtag">${escHtml(t)}</span>`).join('');

  // Affiliate Link
  if (affLink) {
    document.getElementById('affLink').textContent  = affLink;
    document.getElementById('affEarn').textContent  = commissionText(currentProduct?.platform);
    document.getElementById('affCard').style.display = '';
  }

  // Source badge
  const src    = data.source || 'mock';
  const badge  = document.getElementById('sourceBadge');
  const labels = { claude:'⚡ Claude', gemini:'🔮 Gemini', cache:'💾 Cache', 'stale-cache':'📦 Stale', mock:'🔧 Mock' };
  badge.textContent  = labels[src] || src;
  badge.className    = `hdr-badge source-${src.replace('-','')}`;
  badge.style.display = '';

  document.getElementById('results').style.display = '';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// ── Copy Helpers ──────────────────────────────────────────────────────────────
function copyField(field) {
  if (!currentResult) return;
  let text = '';
  if (field === 'hook')     text = currentResult.hook || '';
  if (field === 'script')   text = Array.isArray(currentResult.script) ? currentResult.script.join('\n\n') : (currentResult.script || '');
  if (field === 'caption')  text = currentResult.caption || '';
  if (field === 'hashtags') text = (currentResult.hashtags || []).join(' ');
  copyToClipboard(text, event.currentTarget);
}

function copyAff() {
  if (currentAffLink) copyToClipboard(currentAffLink, event.currentTarget);
}

function copyPlatform(platform) {
  if (!currentResult) return;
  const tags = (currentResult.hashtags || []).join(' ');
  const script = Array.isArray(currentResult.script) ? currentResult.script.join('\n\n') : (currentResult.script || '');
  const link = currentAffLink ? `\n\n🔗 ลิงก์สั่งซื้อ: ${currentAffLink}` : '';

  // จัดรูปแบบตาม platform
  let text = '';
  if (platform === 'TikTok') {
    text = `${currentResult.hook}\n\n${script}${link}\n\n${currentResult.caption}\n\n${tags}`;
  } else if (platform === 'Facebook') {
    text = `${currentResult.hook}\n\n${currentResult.caption}${link}\n\n${tags}`;
  } else if (platform === 'LINE') {
    text = `${currentResult.hook}\n\n${currentResult.caption}${link}`;
  } else if (platform === 'Instagram') {
    text = `${currentResult.caption}${link}\n\n${tags}`;
  } else {
    text = `${currentResult.hook}\n\n${script}${link}\n\n${tags}`;
  }

  copyToClipboard(text, event.currentTarget);
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ คัดลอกแล้ว';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1800);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

// ── Auto-Post ─────────────────────────────────────────────────────────────────
async function postAll() {
  if (!currentResult) return;
  const btn = document.getElementById('btnPostAll');
  btn.disabled = true;
  btn.textContent = '⏳ กำลังโพสต์...';

  const platforms = ['tiktok', 'facebook', 'line', 'instagram'];
  const results = await Promise.allSettled(platforms.map(p => postOne(p, true)));

  btn.disabled = false;
  const ok = results.filter(r => r.status === 'fulfilled').length;
  btn.textContent = `✅ โพสต์แล้ว ${ok}/${platforms.length} platform`;
  setTimeout(() => { btn.textContent = '⚡ โพสต์ทุก Platform ในคลิกเดียว'; }, 3000);
}

async function postOne(platform, silent = false) {
  if (!currentResult) return;
  const btnId = { tiktok:'postTikTok', facebook:'postFacebook', line:'postLine', instagram:'postInstagram' }[platform];
  const btn = document.getElementById(btnId);
  if (btn) { btn.classList.add('posting'); btn.textContent = '⏳'; }

  try {
    await _doPost(platform);
    if (btn) { btn.classList.remove('posting'); btn.classList.add('done'); btn.textContent = '✅'; }
    setTimeout(() => { if (btn) { btn.classList.remove('done'); btn.textContent = 'โพสต์'; } }, 3000);
  } catch (e) {
    if (btn) { btn.classList.remove('posting'); btn.textContent = '❌'; }
    setTimeout(() => { if (btn) btn.textContent = 'โพสต์'; }, 2000);
    if (!silent) showError(`${platform}: ${e.message}`);
    throw e;
  }
}

async function _doPost(platform) {
  if (!currentResult) throw new Error('ยังไม่มีคอนเทนต์');
  const c = currentResult;
  const aff = currentAffLink;
  const tags = (c.hashtags || []).join(' ');
  const script = Array.isArray(c.script) ? c.script.join('\n') : (c.script || '');

  const s = await new Promise(r => chrome.storage.sync.get(null, r));

  if (platform === 'line') {
    const text = `${c.hook}\n\n${c.caption}\n\n🔗 ${aff}\n\n${tags}`;
    const r = await chrome.runtime.sendMessage({ type: 'POST_LINE', text, affLink: aff });
    if (!r?.ok) throw new Error(r?.error || 'LINE post failed');
    return;
  }

  if (platform === 'facebook') {
    const text = `${c.hook}\n\n${c.caption}\n\n🔗 ${aff}\n\n${tags}`;
    const r = await chrome.runtime.sendMessage({ type: 'POST_FACEBOOK', text, affLink: aff });
    if (!r?.ok) throw new Error(r?.error || 'Facebook post failed');
    return;
  }

  if (platform === 'tiktok') {
    const r = await chrome.runtime.sendMessage({ type: 'POST_TIKTOK', content: c, affLink: aff });
    if (!r?.ok) throw new Error(r?.error || 'TikTok post failed');
    return;
  }

  if (platform === 'instagram') {
    const r = await chrome.runtime.sendMessage({ type: 'POST_INSTAGRAM', content: c, affLink: aff });
    if (!r?.ok) throw new Error(r?.error || 'Instagram post failed');
    return;
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
async function loadSettings() {
  const s = await chrome.storage.sync.get(null);
  const set = (id, val) => { if (val && document.getElementById(id)) document.getElementById(id).value = val; };
  set('inApiUrl',    s.apiUrl);
  set('inShopeeSmtt', s.shopeeSmtt);
  set('inLazadaCC',  s.lazadaCC);
  set('inMyRef',     s.myRef);
  set('inLineToken', s.lineNotifyToken);
  set('inFbPageId',  s.fbPageId);
  set('inFbToken',   s.fbPageToken);
}

function saveSettings() {
  const g = id => document.getElementById(id)?.value?.trim() || '';
  chrome.storage.sync.set({
    apiUrl:          g('inApiUrl'),
    shopeeSmtt:      g('inShopeeSmtt'),
    lazadaCC:        g('inLazadaCC'),
    myRef:           g('inMyRef'),
    lineNotifyToken: g('inLineToken'),
    fbPageId:        g('inFbPageId'),
    fbPageToken:     g('inFbToken'),
  }, () => {
    const btn = event.currentTarget;
    btn.textContent = '✅ บันทึกแล้ว';
    setTimeout(() => btn.textContent = '💾 บันทึกการตั้งค่า', 1500);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errMsg');
  el.textContent = '⚠️ ' + msg;
  el.style.display = '';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function guessCategory(name = '') {
  const n = name.toLowerCase();
  if (/ครีม|เซรั่ม|น้ำหอม|ลิปสติก|บำรุง|สกิน/.test(n)) return 'ความงาม';
  if (/อาหาร|ขนม|น้ำพริก|ซอส|แกง|ขนมจีน/.test(n))      return 'อาหาร';
  if (/ผ้า|เสื้อ|กระโปรง|กางเกง|ชุด/.test(n))            return 'สิ่งทอ';
  if (/น้ำ|ชา|กาแฟ|เครื่องดื่ม/.test(n))                 return 'เครื่องดื่ม';
  if (/สมุนไพร|ยา|วิตามิน|แคปซูล/.test(n))               return 'สมุนไพร';
  if (/แหวน|สร้อย|ต่างหู|กำไล/.test(n))                  return 'เครื่องประดับ';
  if (/โต๊ะ|เก้าอี้|ตู้|โซฟา|เตียง/.test(n))             return 'เฟอร์นิเจอร์';
  if (/otop|ชุมชน|หัตถกรรม/.test(n))                      return 'OTOP';
  return 'ทั่วไป';
}

function commissionText(platform) {
  const rates = {
    shopee:    'คอมมิชชั่น 2–10% ต่อยอดขาย (Shopee Affiliate)',
    lazada:    'คอมมิชชั่น 2–8% ต่อยอดขาย (Lazada Affiliate)',
    aliexpress:'คอมมิชชั่น 3–9% ต่อยอดขาย (AliExpress Affiliate)',
    generic:   'รายได้จาก Openthai.ai Affiliate Program',
  };
  return rates[platform] || rates.generic;
}
