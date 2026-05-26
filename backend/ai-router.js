// Openthai.ai — Spider-Web AI Router
// Pattern: Smart Cache → Parallel Race → Circuit Breaker → Stale Cache → Mock
//
// เหมือนทางแยก Chongqing: ทุกเส้นทำงานพร้อมกัน ถ้าเส้นไหนพัง ข้ามไปอีกเส้นทันที

// ── Circuit Breaker ───────────────────────────────────────────────────────────
// ตัดวงจรเส้นที่พังซ้ำ → ลดโหลด → เปิดคืนอัตโนมัติหลัง cooldown

export class CircuitBreaker {
  constructor(name, { threshold = 3, cooldown = 60_000 } = {}) {
    this.name     = name;
    this.threshold = threshold;
    this.cooldown  = cooldown;
    this._failures = 0;
    this._state    = 'closed'; // closed | open | half-open
    this._openedAt = null;
  }

  get state() {
    if (this._state === 'open' && Date.now() - this._openedAt >= this.cooldown) {
      this._state = 'half-open';
    }
    return this._state;
  }

  async call(fn) {
    if (this.state === 'open') {
      const remainSec = Math.ceil((this.cooldown - (Date.now() - this._openedAt)) / 1000);
      throw new Error(`[CB:${this.name}] OPEN — retry in ${remainSec}s`);
    }
    try {
      const result = await fn();
      this._failures = 0;
      this._state    = 'closed';
      return result;
    } catch (e) {
      this._failures++;
      if (this._failures >= this.threshold) {
        this._state    = 'open';
        this._openedAt = Date.now();
      }
      throw e;
    }
  }

  status() {
    return {
      name:     this.name,
      state:    this.state,
      failures: this._failures,
      cooldown_sec: this.cooldown / 1000,
    };
  }

  reset() {
    this._failures = 0;
    this._state    = 'closed';
    this._openedAt = null;
  }
}

// ── Smart Cache ───────────────────────────────────────────────────────────────
// จำผลลัพธ์ไว้ 30 นาที — ตอบทันทีโดยไม่เรียก AI ซ้ำ
// มี stale-cache เป็น emergency fallback ถ้าทุก provider ล้ม

export class SmartCache {
  constructor({ ttl = 30 * 60_000, maxSize = 500 } = {}) {
    this.ttl     = ttl;
    this.maxSize = maxSize;
    this._store  = new Map();
    this._hits   = 0;
    this._misses = 0;
  }

  _key(form) {
    const p = form.product?.trim().toLowerCase() || '';
    return `${p}|${form.category || ''}|${form.platform || ''}|${form.style || ''}|${form.lang || ''}`;
  }

  get(form) {
    const k = this._key(form);
    const entry = this._store.get(k);
    if (!entry) { this._misses++; return null; }
    if (Date.now() - entry.ts > this.ttl) {
      // เก็บ stale ไว้แต่ mark expired — getStale() ยังดึงได้
      entry.expired = true;
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.data;
  }

  getStale(form) {
    return this._store.get(this._key(form))?.data || null;
  }

  set(form, data) {
    if (this._store.size >= this.maxSize) {
      // LRU eviction: ลบ entry เก่าที่สุด
      this._store.delete(this._store.keys().next().value);
    }
    this._store.set(this._key(form), { data, ts: Date.now(), expired: false });
  }

  invalidate(form) {
    this._store.delete(this._key(form));
  }

  clear() {
    this._store.clear();
  }

  stats() {
    const total = this._hits + this._misses;
    return {
      size:      this._store.size,
      max_size:  this.maxSize,
      ttl_min:   this.ttl / 60_000,
      hits:      this._hits,
      misses:    this._misses,
      hit_rate:  total ? `${((this._hits / total) * 100).toFixed(1)}%` : '0%',
    };
  }
}

// ── Parallel Race ─────────────────────────────────────────────────────────────
// ยิง providers พร้อมกันทั้งหมด เอาคนที่ตอบก่อน — เร็วกว่า sequential เสมอ
// ถ้าทุกคนล้ม → reject พร้อม error details ทุกเส้น

function parallelRace(providers) {
  return new Promise((resolve, reject) => {
    if (!providers.length) return reject([{ name: 'none', error: 'No providers available' }]);

    const errors  = [];
    let resolved  = false;

    for (const { name, fn } of providers) {
      fn()
        .then(result => {
          if (!resolved) { resolved = true; resolve({ result, winner: name }); }
        })
        .catch(e => {
          errors.push({ name, error: e.message });
          if (errors.length === providers.length && !resolved) {
            resolved = true;
            reject(errors);
          }
        });
    }
  });
}

// ── AI Router Factory ─────────────────────────────────────────────────────────
// เอา claudeFn + geminiFn + mockFn มาห่อด้วย Circuit Breaker + Cache + Race

export function createAIRouter({ claudeFn, geminiFn, mockFn, onLog } = {}) {
  const breakers = {
    claude: new CircuitBreaker('claude', { threshold: 3, cooldown: 60_000 }),
    gemini: new CircuitBreaker('gemini', { threshold: 3, cooldown: 30_000 }),
  };
  const cache = new SmartCache({ ttl: 30 * 60_000, maxSize: 500 });
  const log   = onLog || (() => {});

  async function generate(form) {
    // ── Layer 1: Cache ──────────────────────────────────────────────────────
    const cached = cache.get(form);
    if (cached) {
      log('cache', 'HIT', form.product);
      return { ...cached, source: 'cache' };
    }

    // ── Layer 2: Parallel Race ─────────────────────────────────────────────
    const providers = [];

    if (claudeFn && breakers.claude.state !== 'open') {
      providers.push({
        name: 'claude',
        fn:   () => breakers.claude.call(() => claudeFn(form)),
      });
    }
    if (geminiFn && breakers.gemini.state !== 'open') {
      providers.push({
        name: 'gemini',
        fn:   () => breakers.gemini.call(() => geminiFn(form)),
      });
    }

    if (providers.length > 0) {
      try {
        const { result, winner } = await parallelRace(providers);
        log('race', winner, form.product);
        cache.set(form, result);
        return result;
      } catch (errors) {
        const names = errors.map(e => e.name).join(', ');
        log('race', `ALL_FAILED(${names})`, form.product);
      }
    }

    // ── Layer 3: Stale Cache (emergency) ───────────────────────────────────
    const stale = cache.getStale(form);
    if (stale) {
      log('cache', 'STALE', form.product);
      return { ...stale, source: 'stale-cache' };
    }

    // ── Layer 4: Mock ──────────────────────────────────────────────────────
    log('mock', 'fallback', form.product);
    return mockFn(form);
  }

  return {
    generate,
    status() {
      return {
        circuit_breakers: Object.values(breakers).map(b => b.status()),
        cache:            cache.stats(),
      };
    },
    resetBreaker(name) { breakers[name]?.reset(); },
    cache,
  };
}
