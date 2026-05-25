import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */
const PLATFORMS = [
  { id:"tiktok",  name:"TikTok Shop",   flag:"🎵", color:"#010101", region:"ASEAN" },
  { id:"xiaohongshu", name:"小红书",    flag:"📕", color:"#FF2442", region:"China" },
  { id:"taobao",  name:"淘宝 Taobao",   flag:"🛒", color:"#FF6000", region:"China" },
  { id:"shopee",  name:"Shopee",         flag:"🧡", color:"#EE4D2D", region:"ASEAN" },
  { id:"lazada",  name:"Lazada",         flag:"🔵", color:"#0F1464", region:"ASEAN" },
  { id:"temu",    name:"TEMU",           flag:"🌍", color:"#E47A2E", region:"Global" },
  { id:"amazon",  name:"Amazon",         flag:"📦", color:"#FF9900", region:"Global" },
  { id:"weibo",   name:"微博 Weibo",     flag:"🇨🇳", color:"#E6162D", region:"China" },
  { id:"line",    name:"LINE Shopping",  flag:"💚", color:"#06C755", region:"TH" },
];

const CONTENT_TYPES = [
  "Product Description", "Caption / Post", "Video Script", "KOL Brief",
  "Ad Copy", "SEO Title", "Email Campaign", "Live Script"
];

const LANGS = [
  { code:"th", label:"🇹🇭 ไทย" },
  { code:"cn", label:"🇨🇳 中文" },
  { code:"en", label:"🇬🇧 English" },
];

const CODE_PRESETS = [
  { id:"explain", label:"Explain Code", icon:"🔍", prompt: (code) => `อธิบาย code นี้ให้เข้าใจง่ายเป็นภาษาไทย พร้อม step-by-step:\n\`\`\`\n${code}\n\`\`\`` },
  { id:"fix",     label:"Fix Bugs",     icon:"🐛", prompt: (code) => `ช่วยหาและแก้ bug ใน code นี้ แสดง diff และอธิบายสาเหตุ:\n\`\`\`\n${code}\n\`\`\`` },
  { id:"refactor",label:"Refactor",     icon:"✨", prompt: (code) => `Refactor code นี้ให้ clean มากขึ้น พร้อมอธิบายการเปลี่ยนแปลง:\n\`\`\`\n${code}\n\`\`\`` },
  { id:"test",    label:"Write Tests",  icon:"🧪", prompt: (code) => `เขียน unit test สำหรับ code นี้ (Jest/Vitest):\n\`\`\`\n${code}\n\`\`\`` },
  { id:"deploy",  label:"Deploy Guide", icon:"🚀", prompt: (code) => `สร้าง step-by-step deploy guide สำหรับโปรเจกต์นี้:\n\`\`\`\n${code}\n\`\`\`` },
  { id:"cmd",     label:"CLI Commands", icon:"⌨️", prompt: (text) => `สร้าง shell commands สำหรับ: ${text}` },
];

const COWORK_TEMPLATES = [
  { id:"n8n",     label:"n8n Workflow",   icon:"⚙️", desc:"สร้าง workflow JSON สำหรับ n8n" },
  { id:"launch",  label:"Launch Plan",    icon:"🚀", desc:"วางแผน launch สินค้า/โปรเจกต์" },
  { id:"okr",     label:"OKR Framework",  icon:"🎯", desc:"กำหนด OKR รายไตรมาส" },
  { id:"meeting", label:"Meeting Agenda", icon:"📋", desc:"เตรียมวาระประชุม" },
  { id:"swot",    label:"SWOT Analysis",  icon:"📊", desc:"วิเคราะห์ SWOT ธุรกิจ" },
  { id:"email",   label:"Email Draft",    icon:"📧", desc:"ร่างอีเมลธุรกิจ" },
];

/* ═══════════════════════════════════════════════════════
   CLAUDE API
═══════════════════════════════════════════════════════ */
async function callClaude(prompt, system = "") {
  const messages = [{ role: "user", content: prompt }];
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages,
  };
  if (system) body.system = system;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content?.find(c => c.type === "text")?.text || "";
}

/* ═══════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════ */
const C = {
  bg:      "#0A0A0F",
  surface: "#111118",
  card:    "#16161E",
  border:  "#252535",
  gold:    "#C9A84C",
  goldDim: "#7A6230",
  text:    "#E8E8F0",
  muted:   "#6B6B80",
  accent:  "#4F8EF7",
  green:   "#3DD68C",
  red:     "#FF5555",
};

const S = {
  wrap: {
    fontFamily: "'Noto Sans Thai', 'DM Sans', sans-serif",
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
    display: "flex",
    flexDirection: "column",
  },
  // TOP NAV
  nav: {
    background: C.surface,
    borderBottom: `1px solid ${C.border}`,
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    gap: 0,
    height: 52,
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  logo: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.5px",
    color: C.gold,
    marginRight: 24,
    whiteSpace: "nowrap",
  },
  logoSub: { color: C.muted, fontSize: 11, fontWeight: 400 },
  navTabs: { display: "flex", gap: 2, flex: 1 },
  tab: (active) => ({
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? C.gold : C.muted,
    background: active ? `${C.gold}15` : "transparent",
    border: active ? `1px solid ${C.goldDim}` : "1px solid transparent",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap",
  }),
  // CONTENT
  content: { flex: 1, padding: "20px", maxWidth: 960, margin: "0 auto", width: "100%" },
  // GRID
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 },
  // CARD
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 16,
  },
  cardTitle: { fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 },
  // INPUT
  input: {
    width: "100%",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: C.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: C.text,
    fontSize: 12,
    outline: "none",
    resize: "vertical",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    boxSizing: "border-box",
    lineHeight: 1.6,
  },
  // BUTTON
  btn: (variant = "primary") => ({
    padding: variant === "sm" ? "6px 12px" : "9px 18px",
    fontSize: variant === "sm" ? 11 : 13,
    fontWeight: 600,
    borderRadius: 7,
    cursor: "pointer",
    border: "none",
    background: variant === "gold"
      ? `linear-gradient(135deg, ${C.gold} 0%, #9A7230 100%)`
      : variant === "ghost"
      ? "transparent"
      : variant === "outline"
      ? "transparent"
      : C.accent,
    color: variant === "ghost" ? C.muted : variant === "outline" ? C.gold : "#fff",
    border: variant === "outline" ? `1px solid ${C.goldDim}` : "none",
    transition: "opacity 0.15s",
    whiteSpace: "nowrap",
  }),
  // CHIP
  chip: (active, color = C.gold) => ({
    padding: "4px 10px",
    fontSize: 11,
    fontWeight: active ? 600 : 400,
    borderRadius: 20,
    cursor: "pointer",
    background: active ? `${color}22` : C.surface,
    border: `1px solid ${active ? color : C.border}`,
    color: active ? color : C.muted,
    transition: "all 0.15s",
  }),
  // OUTPUT
  output: {
    background: `${C.surface}cc`,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: 14,
    fontSize: 12.5,
    lineHeight: 1.75,
    whiteSpace: "pre-wrap",
    maxHeight: 320,
    overflowY: "auto",
    color: C.text,
  },
  // STAT
  stat: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statNum: { fontSize: 24, fontWeight: 700, color: C.gold, letterSpacing: "-1px" },
  statLabel: { fontSize: 11, color: C.muted },
  // PLATFORM BADGE
  platBadge: (active, color) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    background: active ? `${color}18` : C.surface,
    border: `1px solid ${active ? color : C.border}`,
    transition: "all 0.15s",
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? C.text : C.muted,
  }),
  // TASK ITEM
  taskRow: (done) => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 12px",
    borderRadius: 7,
    background: C.surface,
    border: `1px solid ${C.border}`,
    marginBottom: 6,
    opacity: done ? 0.5 : 1,
    transition: "opacity 0.2s",
  }),
  // SECTION HEADER
  sectionHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  h2: { fontSize: 15, fontWeight: 700, color: C.text },
  label: { fontSize: 12, color: C.muted, marginBottom: 6 },
  divider: { height: 1, background: C.border, margin: "16px 0" },
  loading: {
    display: "flex", alignItems: "center", gap: 8,
    color: C.gold, fontSize: 12, padding: "8px 0",
  },
};

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */
function Spinner() {
  return (
    <div style={S.loading}>
      <div style={{ width:14, height:14, border:`2px solid ${C.goldDim}`, borderTopColor:C.gold, borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      กำลังประมวลผล...
    </div>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button style={{ ...S.btn("ghost"), fontSize:11, padding:"4px 8px", color: copied ? C.green : C.muted }}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD TAB
═══════════════════════════════════════════════════════ */
function Dashboard({ setTab }) {
  const stats = [
    { num: "21", label: "Commerce Platforms" },
    { num: "3", label: "Languages (TH/CN/EN)" },
    { num: "∞", label: "AI Generations" },
    { num: "1", label: "Unified Workspace" },
  ];
  const modules = [
    { tab:"commerce", icon:"🌏", name:"Commerce AI", desc:"สร้างคอนเทนต์หลายภาษาสำหรับ 21 แพลตฟอร์ม", color:C.gold },
    { tab:"code",     icon:"💻", name:"Claude Code", desc:"เขียน อธิบาย และ deploy code ด้วย AI", color:C.accent },
    { tab:"cowork",   icon:"🤝", name:"Claude Cowork", desc:"Automation workflow, OKR, และงานธุรกิจ", color:C.green },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ ...S.card, marginBottom:20, borderColor:C.goldDim, background:`linear-gradient(135deg, #16161E 0%, #1A1520 100%)` }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.5px", marginBottom:6 }}>
              ✦ <span style={{ color:C.gold }}>OpenThai</span> × Claude
            </div>
            <div style={{ fontSize:13, color:C.muted, maxWidth:460, lineHeight:1.6 }}>
              แพลตฟอร์มรวม AI สำหรับผู้ขายและนักพัฒนาไทย — สร้างคอนเทนต์ เขียนโค้ด และจัดการงานในที่เดียว
            </div>
          </div>
          <div style={{ fontSize:28 }}>🇹🇭</div>
        </div>
        <div style={S.divider} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {stats.map(s => (
            <div key={s.label} style={S.stat}>
              <div style={S.statNum}>{s.num}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Module Cards */}
      <div style={S.cardTitle}>เลือก Module</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {modules.map(m => (
          <div key={m.tab}
            style={{ ...S.card, cursor:"pointer", borderColor:`${m.color}40`, transition:"all 0.15s" }}
            onClick={() => setTab(m.tab)}
            onMouseEnter={e => e.currentTarget.style.borderColor = m.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${m.color}40`}
          >
            <div style={{ fontSize:28, marginBottom:10 }}>{m.icon}</div>
            <div style={{ fontSize:14, fontWeight:700, marginBottom:4, color:m.color }}>{m.name}</div>
            <div style={{ fontSize:11.5, color:C.muted, lineHeight:1.6 }}>{m.desc}</div>
            <div style={{ marginTop:12 }}>
              <span style={{ ...S.btn("outline"), fontSize:11, padding:"4px 10px", border:`1px solid ${m.color}50`, color:m.color }}>
                เปิด →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Launch */}
      <div style={{ ...S.card, marginTop:20 }}>
        <div style={S.sectionHead}>
          <div style={S.h2}>⚡ Quick Actions</div>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {[
            { label:"🎵 สร้าง TikTok Caption", action: () => setTab("commerce") },
            { label:"💻 Debug Code", action: () => setTab("code") },
            { label:"🚀 Launch Plan", action: () => setTab("cowork") },
            { label:"📕 เขียน Xiaohongshu Note", action: () => setTab("commerce") },
            { label:"⚙️ n8n Workflow", action: () => setTab("cowork") },
            { label:"🧪 Write Tests", action: () => setTab("code") },
          ].map(q => (
            <button key={q.label} style={{ ...S.btn("outline"), fontSize:12 }} onClick={q.action}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COMMERCE TAB
═══════════════════════════════════════════════════════ */
function CommerceTab() {
  const [platform, setPlatform] = useState("tiktok");
  const [contentType, setContentType] = useState("Caption / Post");
  const [langs, setLangs] = useState(["th","cn","en"]);
  const [product, setProduct] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleLang = (c) => setLangs(l => l.includes(c) ? l.filter(x=>x!==c) : [...l,c]);
  const plat = PLATFORMS.find(p => p.id === platform);

  const generate = async () => {
    if (!product.trim()) return;
    setLoading(true); setResult("");
    try {
      const langNames = langs.map(l => LANGS.find(x=>x.code===l)?.label).join(", ");
      const sys = `คุณคือ Openthai.ai ผู้เชี่ยวชาญด้าน Cross-border E-commerce สำหรับผู้ขายไทย ตอบเป็นภาษาที่กำหนดเท่านั้น ห้ามเพิ่มคำอธิบายภาษาอื่น`;
      const prompt = `สร้าง ${contentType} สำหรับ Platform: ${plat?.name}
สินค้า/ธุรกิจ: ${product}
ภาษาที่ต้องการ: ${langNames}

กฎ:
- แยกแต่ละภาษาชัดเจน ขึ้นต้นด้วย emoji flag
- เนื้อหาต้องเหมาะกับ ${plat?.name} โดยเฉพาะ
- ใช้ keyword ที่ช่วย SEO และ algorithm ของ platform
- สำหรับจีน ใช้ภาษาธรรมชาติที่คนจีนใช้จริง
- ปิดท้ายด้วย 💡 Tips 1 ข้อ`;
      const r = await callClaude(prompt, sys);
      setResult(r);
    } catch(e) { setResult(`❌ ${e.message}`); }
    setLoading(false);
  };

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={S.h2}>🌏 Commerce AI — Content Generator</div>
        <span style={{ ...S.chip(false), fontSize:10 }}>{PLATFORMS.length} Platforms</span>
      </div>

      <div style={S.grid2}>
        {/* Left: Config */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* Platform */}
          <div style={S.card}>
            <div style={S.cardTitle}>เลือก Platform</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {PLATFORMS.map(p => (
                <div key={p.id} style={S.platBadge(platform===p.id, p.color)}
                  onClick={() => setPlatform(p.id)}>
                  <span style={{ fontSize:16 }}>{p.flag}</span>
                  <span style={{ flex:1 }}>{p.name}</span>
                  <span style={{ fontSize:10, color:C.muted }}>{p.region}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Generate */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={S.card}>
            <div style={S.cardTitle}>ตั้งค่าคอนเทนต์</div>

            <div style={S.label}>ประเภทคอนเทนต์</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
              {CONTENT_TYPES.map(t => (
                <button key={t} style={S.chip(contentType===t)} onClick={() => setContentType(t)}>{t}</button>
              ))}
            </div>

            <div style={S.label}>ภาษา</div>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {LANGS.map(l => (
                <button key={l.code} style={S.chip(langs.includes(l.code))} onClick={() => toggleLang(l.code)}>
                  {l.label}
                </button>
              ))}
            </div>

            <div style={S.label}>สินค้า / บริการ / ธุรกิจ</div>
            <input style={{ ...S.input, marginBottom:14 }}
              value={product} onChange={e => setProduct(e.target.value)}
              placeholder="เช่น น้ำมะพร้าวออร์แกนิก จากสวนสมุย..." />

            <button style={{ ...S.btn("gold"), width:"100%" }} onClick={generate} disabled={loading || !product}>
              {loading ? "⏳ กำลังสร้าง..." : `⚡ สร้างคอนเทนต์ — ${plat?.name}`}
            </button>
          </div>

          {/* Result */}
          {(loading || result) && (
            <div style={S.card}>
              <div style={{ ...S.sectionHead, marginBottom:8 }}>
                <div style={S.cardTitle}>ผลลัพธ์</div>
                {result && <CopyBtn text={result} />}
              </div>
              {loading ? <Spinner /> : <div style={S.output}>{result}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CODE TAB
═══════════════════════════════════════════════════════ */
function CodeTab() {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState("explain");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("python");

  const run = async () => {
    if (!code.trim()) return;
    setLoading(true); setResult("");
    try {
      const preset = CODE_PRESETS.find(p => p.id === mode);
      const prompt = preset.prompt(code);
      const sys = `คุณคือ Claude Code assistant ผู้เชี่ยวชาญด้านการเขียนโค้ด ตอบเป็นภาษาไทย พร้อมโค้ด ${lang} ที่ถูกต้อง`;
      const r = await callClaude(prompt, sys);
      setResult(r);
    } catch(e) { setResult(`❌ ${e.message}`); }
    setLoading(false);
  };

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={S.h2}>💻 Claude Code — Dev Assistant</div>
        <div style={{ display:"flex", gap:8 }}>
          {["python","javascript","typescript","bash"].map(l => (
            <button key={l} style={S.chip(lang===l, C.accent)} onClick={() => setLang(l)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Mode Select */}
      <div style={{ ...S.card, marginBottom:14 }}>
        <div style={S.cardTitle}>เลือก Action</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {CODE_PRESETS.map(p => (
            <button key={p.id}
              style={{ ...S.platBadge(mode===p.id, C.accent), justifyContent:"flex-start" }}
              onClick={() => setMode(p.id)}>
              <span style={{ fontSize:18 }}>{p.icon}</span>
              <span style={{ fontSize:12 }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={{ ...S.sectionHead, marginBottom:8 }}>
            <div style={S.cardTitle}>
              {mode === "cmd" ? "บอก task ที่ต้องการ CLI command" : `วาง ${lang} code ที่นี่`}
            </div>
            <button style={S.btn("ghost")} onClick={() => setCode("")}>Clear</button>
          </div>
          <textarea style={{ ...S.textarea, minHeight:200, marginBottom:12 }}
            value={code} onChange={e => setCode(e.target.value)}
            placeholder={mode === "cmd"
              ? "เช่น: push code to GitHub, install dependencies..."
              : `# วาง ${lang} code ที่นี่...\n\ndef example():\n    pass`}
          />
          <button style={{ ...S.btn("primary"), width:"100%" }} onClick={run} disabled={loading || !code}>
            {loading ? "⏳ ประมวลผล..." : `${CODE_PRESETS.find(p=>p.id===mode)?.icon} ${CODE_PRESETS.find(p=>p.id===mode)?.label}`}
          </button>
        </div>

        <div style={S.card}>
          <div style={{ ...S.sectionHead, marginBottom:8 }}>
            <div style={S.cardTitle}>ผลลัพธ์จาก Claude</div>
            {result && <CopyBtn text={result} />}
          </div>
          {loading ? <Spinner /> : result
            ? <div style={{ ...S.output, minHeight:200 }}>{result}</div>
            : <div style={{ color:C.muted, fontSize:12, padding:"20px 0", textAlign:"center" }}>
                ผลลัพธ์จะแสดงที่นี่
              </div>
          }
        </div>
      </div>

      {/* Deploy Helper */}
      <div style={{ ...S.card, marginTop:14, borderColor:`${C.accent}40` }}>
        <div style={S.cardTitle}>🚀 OpenThai Deploy Commands</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {[
            "git add . && git commit -m 'update'",
            "vercel --prod",
            "npm run build",
            "npm install",
            "git push origin main",
          ].map(cmd => (
            <div key={cmd} style={{ display:"flex", alignItems:"center", gap:6,
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:6,
              padding:"4px 10px", fontSize:11, color:C.muted, fontFamily:"monospace" }}>
              <span style={{ color:C.accent }}>$</span> {cmd}
              <CopyBtn text={cmd} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   COWORK TAB
═══════════════════════════════════════════════════════ */
function CoworkTab() {
  const [tasks, setTasks] = useState([
    { id:1, text:"Deploy Openthai.ai ไปยัง Vercel", done:false },
    { id:2, text:"ตั้งค่า n8n workflow automation", done:false },
    { id:3, text:"เพิ่ม Claude API key ใน .env", done:true },
    { id:4, text:"ทดสอบ Content Generator", done:false },
  ]);
  const [newTask, setNewTask] = useState("");
  const [template, setTemplate] = useState("launch");
  const [brief, setBrief] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(t => [...t, { id:Date.now(), text:newTask, done:false }]);
    setNewTask("");
  };

  const toggleTask = (id) => setTasks(t => t.map(x => x.id===id ? {...x,done:!x.done} : x));
  const removeTask = (id) => setTasks(t => t.filter(x => x.id!==id));

  const generate = async () => {
    if (!brief.trim()) return;
    setLoading(true); setResult("");
    try {
      const tmpl = COWORK_TEMPLATES.find(t => t.id===template);
      const prompts = {
        n8n: `สร้าง n8n workflow สำหรับ: ${brief}\nให้ JSON workflow ที่ใช้งานได้จริง พร้อม node configurations`,
        launch: `วางแผน Product/Project Launch สำหรับ: ${brief}\nรูปแบบ: Week 1-4, แต่ละสัปดาห์มี 3-5 tasks เฉพาะเจาะจง`,
        okr: `กำหนด OKR สำหรับ: ${brief}\nรูปแบบ: 1 Objective + 3-5 Key Results พร้อม metrics วัดผลชัดเจน`,
        meeting: `สร้างวาระประชุมสำหรับ: ${brief}\nรูปแบบ: เวลา, หัวข้อ, ผู้รับผิดชอบ, เป้าหมาย`,
        swot: `วิเคราะห์ SWOT สำหรับ: ${brief}\nตอบเป็นภาษาไทย แบบ structured table ชัดเจน`,
        email: `ร่างอีเมลธุรกิจสำหรับ: ${brief}\nภาษาไทยและอังกฤษ ทั้งสองฉบับ professional`,
      };
      const r = await callClaude(prompts[template],
        "คุณคือ Claude Cowork assistant ผู้เชี่ยวชาญด้านการจัดการธุรกิจและ automation ตอบเป็นภาษาไทย");
      setResult(r);
    } catch(e) { setResult(`❌ ${e.message}`); }
    setLoading(false);
  };

  const done = tasks.filter(t => t.done).length;

  return (
    <div>
      <div style={S.sectionHead}>
        <div style={S.h2}>🤝 Claude Cowork — Automation & Tasks</div>
        <span style={{ fontSize:12, color:done===tasks.length && tasks.length>0 ? C.green : C.muted }}>
          {done}/{tasks.length} tasks done
        </span>
      </div>

      <div style={S.grid2}>
        {/* Task Manager */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>📋 Task Manager — Openthai.ai</div>

            {/* Progress */}
            <div style={{ background:C.surface, borderRadius:4, height:4, marginBottom:14, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${tasks.length ? (done/tasks.length)*100 : 0}%`,
                background:`linear-gradient(90deg, ${C.gold}, ${C.green})`, transition:"width 0.3s" }} />
            </div>

            {tasks.map(t => (
              <div key={t.id} style={S.taskRow(t.done)}>
                <div style={{ width:16, height:16, borderRadius:4, border:`2px solid ${t.done ? C.green : C.border}`,
                  background: t.done ? C.green : "transparent", cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
                  onClick={() => toggleTask(t.id)}>
                  {t.done && <span style={{ color:"#000", fontSize:10, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ flex:1, fontSize:12, textDecoration:t.done?"line-through":"none", color:t.done?C.muted:C.text }}>
                  {t.text}
                </span>
                <button style={{ ...S.btn("ghost"), padding:"2px 6px", fontSize:10, color:C.red }}
                  onClick={() => removeTask(t.id)}>✕</button>
              </div>
            ))}

            <div style={{ display:"flex", gap:8, marginTop:10 }}>
              <input style={{ ...S.input, flex:1, padding:"8px 10px", fontSize:12 }}
                value={newTask} onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key==="Enter" && addTask()}
                placeholder="เพิ่ม task ใหม่..." />
              <button style={S.btn("gold")} onClick={addTask}>+</button>
            </div>
          </div>

          {/* n8n Quick */}
          <div style={{ ...S.card, marginTop:14, borderColor:`${C.green}30` }}>
            <div style={S.cardTitle}>⚙️ Automation Status</div>
            {[
              { name:"Content Generator", status:"🟢 Active", color:C.green },
              { name:"Waitlist → Google Sheets", status:"🟡 Setup needed", color:"#F5A623" },
              { name:"n8n Webhook", status:"🔴 Not connected", color:C.red },
              { name:"Vercel Auto Deploy", status:"🟢 Active", color:C.green },
            ].map(a => (
              <div key={a.name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"7px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                <span style={{ color:C.muted }}>{a.name}</span>
                <span style={{ fontSize:11, color:a.color }}>{a.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Generator */}
        <div>
          <div style={S.card}>
            <div style={S.cardTitle}>🤖 AI Workflow Generator</div>

            <div style={S.label}>เลือก Template</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {COWORK_TEMPLATES.map(t => (
                <button key={t.id}
                  style={{ ...S.platBadge(template===t.id, C.green), flexDirection:"column", alignItems:"flex-start", gap:2 }}
                  onClick={() => setTemplate(t.id)}>
                  <div style={{ fontSize:18 }}>{t.icon}</div>
                  <div style={{ fontSize:11, fontWeight:600 }}>{t.label}</div>
                  <div style={{ fontSize:10, color:C.muted }}>{t.desc}</div>
                </button>
              ))}
            </div>

            <div style={S.label}>รายละเอียด / Context</div>
            <textarea style={{ ...S.textarea, minHeight:90, marginBottom:12, fontFamily:"inherit", fontSize:12 }}
              value={brief} onChange={e => setBrief(e.target.value)}
              placeholder="เช่น: Launch สินค้าน้ำมะพร้าว บน TikTok Shop และ Xiaohongshu ภายใน 4 สัปดาห์..." />

            <button style={{ ...S.btn("primary"), width:"100%", background:`linear-gradient(135deg, #2A7A50, #1A5A3A)` }}
              onClick={generate} disabled={loading || !brief}>
              {loading ? "⏳ สร้าง..." : `${COWORK_TEMPLATES.find(t=>t.id===template)?.icon} สร้าง ${COWORK_TEMPLATES.find(t=>t.id===template)?.label}`}
            </button>
          </div>

          {(loading || result) && (
            <div style={{ ...S.card, marginTop:14 }}>
              <div style={{ ...S.sectionHead, marginBottom:8 }}>
                <div style={S.cardTitle}>ผลลัพธ์</div>
                {result && <CopyBtn text={result} />}
              </div>
              {loading ? <Spinner /> : <div style={{ ...S.output, maxHeight:260 }}>{result}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab] = useState("dashboard");

  const tabs = [
    { id:"dashboard", label:"🏠 Dashboard" },
    { id:"commerce",  label:"🌏 Commerce AI" },
    { id:"code",      label:"💻 Claude Code" },
    { id:"cowork",    label:"🤝 Cowork" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700;800&family=DM+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:${C.bg}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        button:disabled { opacity:0.5; cursor:not-allowed; }
        button:not(:disabled):hover { opacity:0.85; }
      `}</style>
      <div style={S.wrap}>
        {/* NAV */}
        <nav style={S.nav}>
          <div style={S.logo}>
            ✦ OpenThai<span style={S.logoSub}> × Claude</span>
          </div>
          <div style={S.navTabs}>
            {tabs.map(t => (
              <button key={t.id} style={S.tab(tab===t.id)} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:11, color:C.goldDim, marginLeft:12, whiteSpace:"nowrap" }}>
            🇹🇭 v3.0 Unified
          </div>
        </nav>

        {/* CONTENT */}
        <div style={S.content}>
          {tab === "dashboard" && <Dashboard setTab={setTab} />}
          {tab === "commerce"  && <CommerceTab />}
          {tab === "code"      && <CodeTab />}
          {tab === "cowork"    && <CoworkTab />}
        </div>
      </div>
    </>
  );
}
