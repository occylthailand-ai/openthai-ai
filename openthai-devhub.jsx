import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════ */
const G = {
  bg:"#030b14", panel:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)",
  gold:"#d4a017", cyan:"#00e5ff", green:"#4ade80", red:"#f87171",
  purple:"#a78bfa", pink:"#f472b6", orange:"#fb923c",
  text:"#e2e8f0", muted:"#475569",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${G.bg};color:${G.text};font-family:'IBM Plex Sans Thai',sans-serif;overflow:hidden}
  ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:2px}
  .mono{font-family:'IBM Plex Mono',monospace}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes flow{0%{stroke-dashoffset:100}100%{stroke-dashoffset:0}}
  .fade{animation:fadeIn .3s ease}
  .pulse{animation:pulse 2s infinite}
  .spin{animation:spin 1s linear infinite}
  .blink{animation:blink 1s infinite}
  input,textarea,select{background:rgba(255,255,255,0.05);border:1px solid ${G.border};border-radius:8px;color:${G.text};font-family:'IBM Plex Sans Thai',sans-serif;font-size:13px;padding:8px 12px;outline:none;transition:.2s}
  input:focus,textarea:focus,select:focus{border-color:${G.gold}}
  button{cursor:pointer;font-family:'IBM Plex Sans Thai',sans-serif;transition:.15s}
  .btn{background:rgba(212,160,23,0.15);border:1px solid rgba(212,160,23,0.4);border-radius:7px;color:${G.gold};padding:7px 14px;font-size:12px}
  .btn:hover{background:rgba(212,160,23,0.28)}
  .btn-cyan{background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);border-radius:7px;color:${G.cyan};padding:7px 14px;font-size:12px}
  .btn-cyan:hover{background:rgba(0,229,255,0.2)}
  .btn-ghost{background:transparent;border:1px solid ${G.border};border-radius:7px;color:${G.muted};padding:7px 14px;font-size:12px}
  .btn-ghost:hover{border-color:rgba(255,255,255,0.2);color:${G.text}}
  .btn-green{background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.35);border-radius:7px;color:${G.green};padding:7px 14px;font-size:12px}
  .btn-green:hover{background:rgba(74,222,128,0.22)}
  .btn-purple{background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.35);border-radius:7px;color:${G.purple};padding:7px 14px;font-size:12px}
  .card{background:${G.panel};border:1px solid ${G.border};border-radius:12px;padding:16px}
  .tag{background:rgba(212,160,23,0.12);border:1px solid rgba(212,160,23,0.2);border-radius:4px;color:${G.gold};font-size:10px;padding:2px 8px;font-family:'IBM Plex Mono',monospace}
`;

/* ═══════════════════════════════════════════════
   MOCK DATA
═══════════════════════════════════════════════ */
const REPOS = [
  { name:"openthai-platform",   lang:"TypeScript", stars:142, forks:28, issues:7,  prs:3,  branch:"main",  lastPush:"2 ชม.", status:"passing", size:"48.2 MB", desc:"Smart-e Super App — Core Platform" },
  { name:"otai-smart-contract", lang:"Solidity",   stars:89,  forks:15, issues:2,  prs:1,  branch:"main",  lastPush:"1 วัน", status:"passing", size:"3.1 MB",  desc:"OTAI Token & DeFi Smart Contracts" },
  { name:"openthai-ai-engine",  lang:"Python",     stars:210, forks:41, issues:12, prs:5,  branch:"dev",   lastPush:"4 ชม.", status:"failing", size:"128 MB",  desc:"AI Studio Backend — Claude Integration" },
  { name:"affiliate-service",   lang:"Go",         stars:56,  forks:9,  issues:1,  prs:2,  branch:"main",  lastPush:"3 วัน", status:"passing", size:"8.7 MB",  desc:"Performance Affiliate Microservice" },
  { name:"openthai-mobile",     lang:"React Native",stars:178,forks:33, issues:9,  prs:4,  branch:"v2",    lastPush:"6 ชม.", status:"pending", size:"224 MB",  desc:"iOS & Android App" },
];

const COMMITS = [
  { hash:"a3f92c1", msg:"feat: เพิ่ม Affiliate 2-tier Performance system",       author:"daniel-chou",  time:"2 ชม.",   branch:"main",  status:"verified" },
  { hash:"b8d471e", msg:"fix: แก้ไข OTAI price feed delay ใน FinChain",          author:"dev-ot01",     time:"5 ชม.",   branch:"main",  status:"verified" },
  { hash:"c2a180f", msg:"chore: update Claude API to sonnet-4-20250514",          author:"daniel-chou",  time:"1 วัน",   branch:"main",  status:"verified" },
  { hash:"d9b334a", msg:"feat: Digital Baht e-CBDC integration draft",            author:"dev-ot02",     time:"2 วัน",   branch:"dev",   status:"pending"  },
  { hash:"e5c891b", msg:"security: เพิ่ม MFA enforcement สำหรับ withdrawal",      author:"sec-ot01",     time:"3 วัน",   branch:"main",  status:"verified" },
];

const ISSUES = [
  { id:47, title:"OTAI Staking APY ไม่แสดงผลถูกต้องบน Mobile",          labels:["bug","mobile"],       priority:"high",   assignee:"dev-ot01",  status:"open",   comments:3 },
  { id:48, title:"เพิ่ม QR Code สำหรับ PromptPay ใน Wallet module",      labels:["enhancement"],        priority:"medium", assignee:"dev-ot02",  status:"open",   comments:1 },
  { id:49, title:"AI Studio: รองรับ streaming response",                  labels:["ai","enhancement"],   priority:"high",   assignee:"daniel-chou",status:"open", comments:7 },
  { id:50, title:"PDPA Consent banner ภาษาจีน",                          labels:["i18n","compliance"],  priority:"medium", assignee:"dev-ot03",  status:"closed", comments:2 },
  { id:51, msg:"Smart Contract audit findings — CertiK report",          labels:["security","critical"], priority:"critical",assignee:"sec-ot01", status:"open",   comments:11 },
];

const PRS = [
  { id:38, title:"feat: Ruflow CI/CD integration",              author:"daniel-chou",  base:"main",   head:"feat/ruflow",    status:"review",  checks:"3/4",  comments:2,   changed:"+412 -38" },
  { id:39, title:"fix: Fix OTAI burn mechanism calculation",    author:"dev-ot01",     base:"main",   head:"fix/burn-calc",  status:"review",  checks:"4/4",  comments:5,   changed:"+28 -14"  },
  { id:40, title:"feat: GitHub + Reflow + Workflow DevHub",     author:"daniel-chou",  base:"main",   head:"feat/devhub",    status:"draft",   checks:"2/4",  comments:0,   changed:"+1,842 -0" },
  { id:41, title:"docs: White Paper v2 สำหรับกระทรวงพาณิชย์",  author:"daniel-chou",  base:"main",   head:"docs/whitepaper",status:"approved",checks:"4/4",  comments:1,   changed:"+840 -120" },
];

const PIPELINES = [
  {
    name:"openthai-platform", branch:"main", trigger:"push", duration:"4m 12s",
    stages:[
      { name:"Install",  status:"success", dur:"45s"  },
      { name:"Lint",     status:"success", dur:"28s"  },
      { name:"Test",     status:"success", dur:"1m 34s"},
      { name:"Build",    status:"success", dur:"52s"  },
      { name:"Deploy Staging", status:"success", dur:"38s" },
      { name:"E2E Test", status:"success", dur:"22s"  },
      { name:"Deploy Prod",  status:"running", dur:"…" },
    ],
    env:"production", commit:"a3f92c1", time:"5 นาที",
  },
  {
    name:"otai-smart-contract", branch:"main", trigger:"push", duration:"2m 08s",
    stages:[
      { name:"Install",   status:"success", dur:"30s" },
      { name:"Compile",   status:"success", dur:"48s" },
      { name:"Test",      status:"success", dur:"35s" },
      { name:"Audit",     status:"success", dur:"15s" },
    ],
    env:"testnet", commit:"b8d471e", time:"1 ชม.",
  },
  {
    name:"openthai-ai-engine", branch:"dev", trigger:"push", duration:"—",
    stages:[
      { name:"Install",  status:"success", dur:"1m 02s" },
      { name:"Lint",     status:"success", dur:"18s"    },
      { name:"Test",     status:"failed",  dur:"2m 41s" },
      { name:"Build",    status:"skipped", dur:"—"      },
    ],
    env:"staging", commit:"c2a180f", time:"4 ชม.",
  },
];

const WORKFLOWS = [
  {
    id:"wf-001", name:"Deploy on Push — Production",
    trigger:"GitHub Push (main)", status:"active", lastRun:"5 นาที", runs:1247,
    nodes:[
      { id:"t1",  type:"trigger",  label:"GitHub Push",      x:60,  y:120, color:G.cyan   },
      { id:"n1",  type:"action",   label:"Run Tests",        x:220, y:60,  color:G.green  },
      { id:"n2",  type:"action",   label:"Build Docker",     x:220, y:180, color:G.gold   },
      { id:"n3",  type:"action",   label:"Push to Registry", x:380, y:120, color:G.purple },
      { id:"n4",  type:"action",   label:"Deploy Staging",   x:540, y:60,  color:G.orange },
      { id:"n5",  type:"action",   label:"E2E Test",         x:540, y:180, color:G.green  },
      { id:"n6",  type:"action",   label:"Deploy Prod",      x:700, y:120, color:G.gold   },
      { id:"n7",  type:"notify",   label:"LINE + Slack",     x:860, y:120, color:G.pink   },
    ],
    edges:[["t1","n1"],["t1","n2"],["n1","n3"],["n2","n3"],["n3","n4"],["n3","n5"],["n4","n6"],["n5","n6"],["n6","n7"]]
  },
  {
    id:"wf-002", name:"Affiliate Payout — Monthly",
    trigger:"Schedule (1st of month)", status:"active", lastRun:"7 วัน", runs:12,
    nodes:[
      { id:"t1", type:"trigger", label:"Cron Trigger",      x:60,  y:120, color:G.purple },
      { id:"n1", type:"action",  label:"Calculate Commission",x:220,y:60,  color:G.gold  },
      { id:"n2", type:"action",  label:"Validate Wallets",  x:220, y:180, color:G.cyan   },
      { id:"n3", type:"action",  label:"Send USDT/OTAI/THB",x:400, y:120, color:G.green  },
      { id:"n4", type:"notify",  label:"Email + LINE",      x:570, y:120, color:G.pink   },
    ],
    edges:[["t1","n1"],["t1","n2"],["n1","n3"],["n2","n3"],["n3","n4"]]
  },
  {
    id:"wf-003", name:"New Referral Onboarding",
    trigger:"Webhook (Signup)", status:"active", lastRun:"2 ชม.", runs:408,
    nodes:[
      { id:"t1", type:"trigger", label:"Signup Webhook",    x:60,  y:100, color:G.cyan  },
      { id:"n1", type:"action",  label:"KYC Check",         x:210, y:60,  color:G.gold  },
      { id:"n2", type:"action",  label:"Assign Tier",       x:210, y:160, color:G.purple},
      { id:"n3", type:"action",  label:"Credit Referrer",   x:380, y:100, color:G.green },
      { id:"n4", type:"notify",  label:"Welcome Email",     x:540, y:100, color:G.pink  },
    ],
    edges:[["t1","n1"],["t1","n2"],["n1","n3"],["n2","n3"],["n3","n4"]]
  },
];

const DESIGN_TOKENS = {
  colors:[ { name:"Gold Primary",     val:"#d4a017", },{ name:"Cyan Accent",  val:"#00e5ff" },
           { name:"Background",       val:"#030b14", },{ name:"Panel",        val:"rgba(255,255,255,0.04)" },
           { name:"Success Green",    val:"#4ade80", },{ name:"Error Red",    val:"#f87171" },
           { name:"Purple",           val:"#a78bfa", },{ name:"Pink Alert",   val:"#f472b6" } ],
  typography:[ { name:"Display",  font:"IBM Plex Mono",      size:"36px", weight:"700" },
               { name:"Heading",  font:"IBM Plex Sans Thai", size:"22px", weight:"600" },
               { name:"Body",     font:"IBM Plex Sans Thai", size:"14px", weight:"400" },
               { name:"Caption",  font:"IBM Plex Mono",      size:"11px", weight:"400" } ],
  spacing:["4px","8px","12px","16px","24px","32px","48px","64px"],
};

const COMPONENTS = [
  { name:"StatCard",      preview:"฿284,500", category:"Finance",  used:12 },
  { name:"BarChart",      preview:"📊",        category:"Charts",   used:8  },
  { name:"TierCard",      preview:"🌱 Affiliate",category:"Affiliate",used:4},
  { name:"TokenBadge",    preview:"◈ OTAI",   category:"Token",    used:15 },
  { name:"PipelineStep",  preview:"✅ Build",  category:"DevOps",   used:7  },
  { name:"WorkflowNode",  preview:"⬡ Action", category:"Workflow", used:6  },
];

/* ═══════════════════════════════════════════════
   MINI HELPERS
═══════════════════════════════════════════════ */
const statusDot = (s) => {
  const map = { passing:"#4ade80", success:"#4ade80", approved:"#4ade80", active:"#4ade80", verified:"#4ade80",
    failing:"#f87171", failed:"#f87171", closed:"#64748b", skipped:"#64748b",
    running:"#fb923c", pending:"#fbbf24", review:"#00e5ff", draft:"#a78bfa" };
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:map[s]||"#64748b", marginRight:5, flexShrink:0, animation:s==="running"?"pulse 1.2s infinite":"none" }} />;
};

const LangDot = ({ lang }) => {
  const lc = { TypeScript:"#3178c6", JavaScript:"#f7df1e", Python:"#3776ab", Solidity:"#363636", Go:"#00acd7", "React Native":"#61dafb" };
  return <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:lc[lang]||G.muted, marginRight:5 }} />;
};

const Tag = ({ label, color="#d4a017" }) => (
  <span style={{ background:`${color}18`, border:`1px solid ${color}35`, borderRadius:4, color, fontSize:10, padding:"1px 7px", fontFamily:"'IBM Plex Mono',monospace", marginRight:3 }}>{label}</span>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display:"flex", gap:6 }}>
    {tabs.map(t => (
      <button key={t.id} onClick={()=>onChange(t.id)} style={{ background:active===t.id?"rgba(212,160,23,0.18)":"transparent", border:`1px solid ${active===t.id?G.gold:G.border}`, borderRadius:8, color:active===t.id?G.gold:G.muted, padding:"7px 14px", fontSize:12 }}>{t.label}</button>
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   WORKFLOW CANVAS
───────────────────────────────────────────── */
const WorkflowCanvas = ({ wf }) => {
  const W=960, H=260;
  const nodeMap = Object.fromEntries(wf.nodes.map(n=>[n.id,n]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H, display:"block" }}>
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.25)" />
        </marker>
      </defs>
      {/* Edges */}
      {wf.edges.map(([a,b],i) => {
        const na=nodeMap[a], nb=nodeMap[b];
        if (!na||!nb) return null;
        const x1=na.x+70, y1=na.y+18, x2=nb.x, y2=nb.y+18;
        const mx=(x1+x2)/2;
        return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none" markerEnd="url(#arr)" />;
      })}
      {/* Nodes */}
      {wf.nodes.map(n => (
        <g key={n.id} transform={`translate(${n.x},${n.y})`}>
          <rect x="0" y="0" width="130" height="36" rx="8"
            fill={`${n.color}18`} stroke={`${n.color}60`} strokeWidth="1.5" />
          <circle cx="12" cy="18" r="4" fill={n.color} opacity=".85" />
          <text x="22" y="22" fontFamily="'IBM Plex Sans Thai',sans-serif" fontSize="11"
            fill={G.text} opacity=".9">{n.label}</text>
          {n.type==="trigger" && <rect x="0" y="0" width="130" height="36" rx="8"
            fill="none" stroke={n.color} strokeWidth="1" opacity=".4" strokeDasharray="4 3" />}
        </g>
      ))}
    </svg>
  );
};

/* ─────────────────────────────────────────────
   GITHUB TAB
───────────────────────────────────────────── */
const GitHubTab = () => {
  const [sub, setSub] = useState("repos");
  const tabs = [{ id:"repos", label:"📁 Repositories" },{ id:"commits", label:"◷ Commits" },{ id:"issues", label:"⚠ Issues" },{ id:"prs", label:"⇄ Pull Requests" }];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <TabBar tabs={tabs} active={sub} onChange={setSub} />
        <button className="btn-ghost" style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill={G.muted}><path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          openthai-ai
        </button>
      </div>

      {sub === "repos" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {REPOS.map((r,i) => (
            <div key={i} className="card" style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:G.cyan }}>{r.name}</span>
                  <span className="mono" style={{ fontSize:10, color:G.muted, background:"rgba(255,255,255,0.05)", borderRadius:10, padding:"1px 8px" }}>{r.branch}</span>
                  <span style={{ background:r.status==="passing"?"rgba(74,222,128,0.12)":r.status==="failing"?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.12)", color:r.status==="passing"?G.green:r.status==="failing"?G.red:"#fbbf24", borderRadius:4, fontSize:10, padding:"1px 7px" }}>{r.status}</span>
                </div>
                <div style={{ fontSize:11, color:G.muted, marginBottom:8 }}>{r.desc}</div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, color:G.muted, display:"flex", alignItems:"center" }}><LangDot lang={r.lang}/>{r.lang}</span>
                  <span style={{ fontSize:11, color:G.muted }}>★ {r.stars}</span>
                  <span style={{ fontSize:11, color:G.muted }}>⑂ {r.forks}</span>
                  <span style={{ fontSize:11, color:r.issues>5?G.red:G.muted }}>⚠ {r.issues} issues</span>
                  <span style={{ fontSize:11, color:r.prs>0?G.cyan:G.muted }}>⇄ {r.prs} PRs</span>
                  <span style={{ fontSize:11, color:G.muted }}>📦 {r.size}</span>
                  <span style={{ fontSize:11, color:G.muted }}>◷ {r.lastPush}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                <button className="btn-ghost" style={{ fontSize:11, padding:"5px 10px" }}>Code</button>
                <button className="btn-cyan" style={{ fontSize:11, padding:"5px 10px" }}>Clone</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "commits" && (
        <div className="card">
          {COMMITS.map((c,i) => (
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:i<COMMITS.length-1?`1px solid ${G.border}`:"none", alignItems:"flex-start" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:c.status==="verified"?G.green:"#fbbf24", marginTop:5, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:3 }}>{c.msg}</div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <span className="mono" style={{ fontSize:10, color:G.cyan, background:"rgba(0,229,255,0.08)", borderRadius:4, padding:"1px 7px" }}>{c.hash}</span>
                  <span style={{ fontSize:10, color:G.muted }}>{c.author}</span>
                  <Tag label={c.branch} color={c.branch==="main"?G.green:G.purple} />
                  <span style={{ fontSize:10, color:G.muted }}}>{c.time}ที่แล้ว</span>
                </div>
              </div>
              <span style={{ fontSize:10, color:c.status==="verified"?G.green:"#fbbf24", flexShrink:0 }}>{c.status==="verified"?"✓ Verified":"⏳ Pending"}</span>
            </div>
          ))}
        </div>
      )}

      {sub === "issues" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {ISSUES.map((issue,i) => (
            <div key={i} className="card" style={{ display:"flex", gap:12, alignItems:"center", borderLeft:`3px solid ${issue.priority==="critical"?G.red:issue.priority==="high"?G.orange:G.border}` }}>
              <div style={{ fontSize:14 }}>{issue.status==="open"?"🟢":"🔴"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:4, color:issue.status==="closed"?G.muted:G.text }}>{issue.title || issue.msg}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {(issue.labels||[]).map(l => <Tag key={l} label={l} color={l==="security"||l==="critical"?G.red:l==="bug"?G.orange:G.purple} />)}
                  <span style={{ fontSize:10, color:G.muted }}>💬 {issue.comments}</span>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:11, color:G.muted }}>{issue.assignee}</div>
                <span style={{ fontSize:10, color:issue.priority==="critical"?G.red:issue.priority==="high"?G.orange:"#fbbf24", background:"rgba(255,255,255,0.04)", borderRadius:4, padding:"1px 7px" }}>{issue.priority}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {sub === "prs" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {PRS.map((pr,i) => (
            <div key={i} className="card" style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
              <div style={{ fontSize:16, marginTop:1 }}>{pr.status==="approved"?"✅":pr.status==="draft"?"⬜":"🔵"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:600, marginBottom:5 }}>
                  #{pr.id} {pr.title}
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  <span className="mono" style={{ fontSize:10, color:G.purple }}>{pr.head}</span>
                  <span style={{ fontSize:10, color:G.muted }}>→</span>
                  <span className="mono" style={{ fontSize:10, color:G.green }}>{pr.base}</span>
                  <span style={{ fontSize:10, color:G.muted }}>by {pr.author}</span>
                  <span style={{ fontSize:10, color:G.muted }}>💬 {pr.comments}</span>
                  <Tag label={pr.status} color={pr.status==="approved"?G.green:pr.status==="draft"?G.muted:G.cyan} />
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div className="mono" style={{ fontSize:11, color:G.green }}>{pr.changed}</div>
                <div style={{ fontSize:10, color:G.muted, marginTop:3 }}>Checks: {pr.checks}</div>
                <button className="btn" style={{ marginTop:6, fontSize:10, padding:"4px 10px" }}>Review</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   RUFLOW CI/CD TAB
───────────────────────────────────────────── */
const RuflowTab = () => {
  const [selected, setSelected] = useState(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:10 }}>
        {[{ l:"Total Runs", v:"1,659", c:G.cyan },{ l:"Success Rate", v:"96.2%", c:G.green },{ l:"Avg Duration", v:"3m 41s", c:G.gold },{ l:"Active Now", v:"1", c:G.orange }].map((s,i)=>(
          <div key={i} className="card" style={{ flex:1 }}>
            <div style={{ fontSize:10, color:G.muted }}>{s.l}</div>
            <div className="mono" style={{ fontSize:20, fontWeight:700, color:s.c, marginTop:4 }}>{s.v}</div>
          </div>
        ))}
      </div>
      {PIPELINES.map((pl,pi) => (
        <div key={pi} className="card" onClick={()=>setSelected(selected===pi?null:pi)} style={{ cursor:"pointer", borderColor:selected===pi?G.gold:G.border }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div>
              <span style={{ fontSize:13, fontWeight:700, color:G.text }}>{pl.name}</span>
              <span className="mono" style={{ fontSize:11, color:G.muted, marginLeft:8 }}>#{pl.commit} · {pl.branch} · {pl.time}ที่แล้ว</span>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <Tag label={pl.env} color={pl.env==="production"?G.gold:pl.env==="testnet"?G.purple:G.cyan} />
              <span style={{ fontSize:11, color:G.muted }}>{pl.duration}</span>
            </div>
          </div>
          {/* Pipeline stages */}
          <div style={{ display:"flex", gap:0, alignItems:"center", overflowX:"auto" }}>
            {pl.stages.map((st,si) => (
              <div key={si} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                <div style={{ background:st.status==="success"?"rgba(74,222,128,0.12)":st.status==="failed"?"rgba(248,113,113,0.12)":st.status==="running"?"rgba(251,146,60,0.12)":"rgba(100,116,139,0.12)", border:`1px solid ${st.status==="success"?G.green:st.status==="failed"?G.red:st.status==="running"?G.orange:G.border}`, borderRadius:8, padding:"6px 10px", minWidth:90, textAlign:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginBottom:2 }}>
                    {statusDot(st.status)}
                    <span style={{ fontSize:10, fontWeight:600, color:st.status==="success"?G.green:st.status==="failed"?G.red:st.status==="running"?G.orange:G.muted }}>{st.name}</span>
                  </div>
                  <div className="mono" style={{ fontSize:9, color:G.muted }}>{st.dur}</div>
                </div>
                {si < pl.stages.length-1 && <div style={{ width:20, height:1, background:G.border, flexShrink:0 }} />}
              </div>
            ))}
          </div>
          {selected===pi && (
            <div style={{ marginTop:12, padding:12, background:"rgba(0,0,0,0.3)", borderRadius:8, fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#94a3b8", lineHeight:1.8 }}>
              <div style={{ color:G.green }}>$ ruflow run pipeline/{pl.name}</div>
              {pl.stages.map((st,si) => (
                <div key={si} style={{ color:st.status==="success"?G.green:st.status==="failed"?G.red:st.status==="running"?G.orange:G.muted }}>
                  [{st.status.toUpperCase().padEnd(7)}] stage/{st.name} ({st.dur})
                </div>
              ))}
              {pl.stages.some(s=>s.status==="running") && <div style={{ color:G.orange }} className="blink">▌</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   WORKFLOW AUTOMATION TAB
───────────────────────────────────────────── */
const WorkflowTab = () => {
  const [active, setActive] = useState(WORKFLOWS[0].id);
  const wf = WORKFLOWS.find(w=>w.id===active);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8 }}>
        {WORKFLOWS.map(w => (
          <button key={w.id} onClick={()=>setActive(w.id)} style={{ background:active===w.id?"rgba(212,160,23,0.18)":"transparent", border:`1px solid ${active===w.id?G.gold:G.border}`, borderRadius:8, color:active===w.id?G.gold:G.muted, padding:"7px 14px", fontSize:12 }}>
            {statusDot("active")}{w.name.slice(0,28)}…
          </button>
        ))}
        <button className="btn-green" style={{ marginLeft:"auto" }}>+ Workflow ใหม่</button>
      </div>

      {wf && (
        <>
          <div style={{ display:"flex", gap:10 }}>
            {[{ l:"Trigger", v:wf.trigger, c:G.purple },{ l:"Total Runs", v:wf.runs.toLocaleString(), c:G.cyan },{ l:"Last Run", v:wf.lastRun+"ที่แล้ว", c:G.gold },{ l:"Status", v:wf.status, c:G.green }].map((s,i)=>(
              <div key={i} className="card" style={{ flex:1 }}>
                <div style={{ fontSize:10, color:G.muted }}>{s.l}</div>
                <div style={{ fontSize:13, fontWeight:600, color:s.c, marginTop:4 }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* Canvas */}
          <div className="card" style={{ padding:16, background:"rgba(0,0,0,0.4)", border:`1px solid ${G.border}` }}>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:10, display:"flex", justifyContent:"space-between" }}>
              <span>⬡ Workflow Canvas</span>
              <div style={{ display:"flex", gap:6 }}>
                {[["trigger",G.cyan,"Trigger"],["action",G.gold,"Action"],["notify",G.pink,"Notify"]].map(([t,c,l])=>(
                  <span key={t} style={{ fontSize:10, color:c, background:`${c}12`, borderRadius:4, padding:"2px 8px" }}>◈ {l}</span>
                ))}
              </div>
            </div>
            <div style={{ overflowX:"auto" }}>
              <WorkflowCanvas wf={wf} />
            </div>
          </div>

          {/* Node Details */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:8 }}>
            {wf.nodes.map(n => (
              <div key={n.id} style={{ background:`${n.color}10`, border:`1px solid ${n.color}30`, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, color:n.color, fontWeight:600, textTransform:"uppercase", marginBottom:3 }}>{n.type}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{n.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   REFLOW DESIGN TAB
───────────────────────────────────────────── */
const ReflowTab = () => {
  const [sub, setSub] = useState("tokens");
  const tabs = [{ id:"tokens", label:"🎨 Design Tokens" },{ id:"components", label:"◧ Components" },{ id:"preview", label:"👁 Preview" }];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <TabBar tabs={tabs} active={sub} onChange={setSub} />

      {sub === "tokens" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <div className="card">
            <div style={{ fontSize:12, fontWeight:700, marginBottom:12, color:G.gold }}>🎨 Colors</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {DESIGN_TOKENS.colors.map((c,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:c.val, border:`1px solid rgba(255,255,255,0.15)`, flexShrink:0 }} />
                  <div>
                    <div style={{ fontSize:11 }}>{c.name}</div>
                    <div className="mono" style={{ fontSize:10, color:G.muted }}>{c.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize:12, fontWeight:700, marginBottom:12, color:G.cyan }}>✏️ Typography</div>
            {DESIGN_TOKENS.typography.map((t,i) => (
              <div key={i} style={{ padding:"8px 0", borderBottom:i<3?`1px solid ${G.border}`:"none" }}>
                <div style={{ fontFamily:t.font.includes("Mono")?"'IBM Plex Mono',monospace":"'IBM Plex Sans Thai',sans-serif", fontSize:t.size, fontWeight:t.weight, lineHeight:1.3, marginBottom:2 }}>{t.name}</div>
                <div className="mono" style={{ fontSize:10, color:G.muted }}>{t.font} · {t.size} · {t.weight}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontSize:12, fontWeight:700, marginBottom:12, color:G.purple }}>📐 Spacing Scale</div>
            {DESIGN_TOKENS.spacing.map((s,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width: parseInt(s)*1.5, height:16, background:`rgba(167,139,250,0.3)`, borderRadius:3, flexShrink:0, minWidth:4, maxWidth:96 }} />
                <span className="mono" style={{ fontSize:11, color:G.muted }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "components" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {COMPONENTS.map((c,i) => (
            <div key={i} className="card" style={{ textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>{c.preview}</div>
              <div style={{ fontSize:12, fontWeight:700 }}>{c.name}</div>
              <div style={{ fontSize:10, color:G.muted, marginTop:2 }}>{c.category}</div>
              <div style={{ fontSize:10, color:G.cyan, marginTop:4 }}>ใช้ {c.used} ครั้ง</div>
              <button className="btn-ghost" style={{ marginTop:8, width:"100%", fontSize:11, padding:"5px" }}>ดู Code →</button>
            </div>
          ))}
        </div>
      )}

      {sub === "preview" && (
        <div className="card" style={{ background:"rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:14, color:G.muted }}>👁 Live Component Preview — OpenThai.ai Design System</div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <button className="btn">btn — Gold</button>
            <button className="btn-cyan">btn — Cyan</button>
            <button className="btn-ghost">btn — Ghost</button>
            <button className="btn-green">btn — Green</button>
            <button className="btn-purple">btn — Purple</button>
          </div>
          <div style={{ marginTop:14, display:"flex", gap:10 }}>
            {["passing","failing","running","pending"].map(s => (
              <span key={s} style={{ display:"flex", alignItems:"center", fontSize:12 }}>{statusDot(s)}{s}</span>
            ))}
          </div>
          <div style={{ marginTop:14, display:"flex", gap:6, flexWrap:"wrap" }}>
            {["OpenThai","OTAI","DeFi","PDPA","GitHub","Ruflow","Reflow","Workflow"].map(t => <Tag key={t} label={t} />)}
          </div>
          <div style={{ marginTop:14, display:"flex", gap:10 }}>
            {[G.gold,G.cyan,G.green,G.purple,G.pink,G.orange].map((c,i) => (
              <div key={i} style={{ flex:1, height:40, borderRadius:8, background:`${c}25`, border:`1px solid ${c}40`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span className="mono" style={{ fontSize:9, color:c }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   MAIN DEV HUB
═══════════════════════════════════════════════ */
const TICKER = ["BTC ฿3,180,000 ↑2.3%","ETH ฿112,400 ↓1.1%","OTAI ฿4.85 ↑8.8%","BTC ฿3,180,000 ↑2.3%","ETH ฿112,400 ↓1.1%","OTAI ฿4.85 ↑8.8%"];
const NAV_MAIN = [
  { id:"overview", icon:"🏠", label:"Overview" },
  { id:"github",   icon:"⑂",  label:"GitHub" },
  { id:"ruflow",   icon:"⬡",  label:"Ruflow CI/CD" },
  { id:"workflow", icon:"◎",  label:"Workflow" },
  { id:"reflow",   icon:"◧",  label:"Reflow Design" },
];

const Overview = ({ setTab }) => (
  <div className="fade" style={{ display:"flex", flexDirection:"column", gap:14 }}>
    <div className="card" style={{ background:"linear-gradient(135deg,rgba(212,160,23,.12),rgba(0,229,255,.06))", border:"1px solid rgba(212,160,23,.3)" }}>
      <div style={{ fontSize:10, color:G.muted, marginBottom:4 }}>🛠️ Dev Hub — OpenThai.ai Development Command Center</div>
      <div style={{ fontSize:28, fontWeight:700, color:G.gold, fontFamily:"'IBM Plex Mono',monospace" }}>5 Repositories · 3 Pipelines · 3 Workflows</div>
      <div style={{ fontSize:12, color:G.green, marginTop:4 }}>↑ 96.2% Pipeline Success · 1 Running Now</div>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
      {[{ l:"Open Issues", v:"20", c:G.orange, tab:"github" },{ l:"Open PRs", v:"3", c:G.cyan, tab:"github" },{ l:"Active Pipelines", v:"1", c:G.green, tab:"ruflow" },{ l:"Workflows", v:"3", c:G.purple, tab:"workflow" }].map((s,i)=>(
        <div key={i} className="card" style={{ cursor:"pointer" }} onClick={()=>setTab(s.tab)}>
          <div style={{ fontSize:10, color:G.muted }}>{s.l}</div>
          <div className="mono" style={{ fontSize:24, fontWeight:700, color:s.c, marginTop:4 }}>{s.v}</div>
        </div>
      ))}
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
      <div className="card">
        <div style={{ fontSize:12, fontWeight:600, marginBottom:10, display:"flex", justifyContent:"space-between" }}>
          <span>⑂ Recent Commits</span>
          <button onClick={()=>setTab("github")} style={{ background:"none", border:"none", color:G.gold, fontSize:11 }}>ทั้งหมด →</button>
        </div>
        {COMMITS.slice(0,3).map((c,i)=>(
          <div key={i} style={{ padding:"6px 0", borderBottom:i<2?`1px solid ${G.border}`:"none" }}>
            <div style={{ fontSize:11, fontWeight:600 }}>{c.msg.slice(0,52)}…</div>
            <div className="mono" style={{ fontSize:10, color:G.muted, marginTop:2 }}>{c.hash} · {c.time}ที่แล้ว</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div style={{ fontSize:12, fontWeight:600, marginBottom:10, display:"flex", justifyContent:"space-between" }}>
          <span>⬡ Pipeline Status</span>
          <button onClick={()=>setTab("ruflow")} style={{ background:"none", border:"none", color:G.gold, fontSize:11 }}>ทั้งหมด →</button>
        </div>
        {PIPELINES.map((p,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:i<2?`1px solid ${G.border}`:"none" }}>
            <span style={{ fontSize:12 }}>{p.name}</span>
            <span style={{ display:"flex", alignItems:"center", fontSize:11 }}>{statusDot(p.stages.some(s=>s.status==="failed")?"failed":p.stages.some(s=>s.status==="running")?"running":"success")}{p.stages.some(s=>s.status==="failed")?"failed":p.stages.some(s=>s.status==="running")?"running":"passing"}</span>
          </div>
        ))}
      </div>
    </div>
    <div className="card">
      <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>◎ Active Workflows</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {WORKFLOWS.map((w,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              {statusDot("active")}
              <span style={{ fontSize:12 }}>{w.name}</span>
            </div>
            <span style={{ fontSize:11, color:G.muted }}>{w.trigger} · {w.runs} runs</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default function DevHub() {
  const [tab, setTab] = useState("overview");
  const PAGES = {
    overview: <Overview setTab={setTab} />,
    github:   <GitHubTab />,
    ruflow:   <RuflowTab />,
    workflow: <WorkflowTab />,
    reflow:   <ReflowTab />,
  };
  return (
    <>
      <style>{css}</style>
      <div style={{ display:"flex", height:"100vh", background:G.bg, overflow:"hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width:200, background:"rgba(255,255,255,0.02)", borderRight:`1px solid ${G.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"16px", borderBottom:`1px solid ${G.border}` }}>
            <div style={{ fontSize:15, fontWeight:700, color:G.gold }}>◈ OpenThai.ai</div>
            <div style={{ fontSize:10, color:G.muted, marginTop:1, fontFamily:"'IBM Plex Mono',monospace" }}>Dev Hub</div>
          </div>
          <nav style={{ flex:1, padding:"10px 8px" }}>
            {NAV_MAIN.map(n=>(
              <button key={n.id} onClick={()=>setTab(n.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"9px 12px", borderRadius:8, marginBottom:2, background:tab===n.id?"rgba(212,160,23,.15)":"transparent", border:tab===n.id?"1px solid rgba(212,160,23,.35)":"1px solid transparent", color:tab===n.id?G.gold:G.muted, textAlign:"left", fontSize:13 }}>
                <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${G.border}` }}>
            <div style={{ fontSize:10, color:G.muted, marginBottom:4 }}>Integrated with</div>
            {[["⑂","GitHub","#fff"],["⬡","Ruflow CI/CD",G.orange],["◎","n8n Workflow",G.purple],["◧","Reflow Design",G.cyan]].map(([ic,lb,c])=>(
              <div key={lb} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <span style={{ fontSize:11, color:c }}>{ic}</span>
                <span style={{ fontSize:10, color:G.muted }}>{lb}</span>
                <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:G.green }} />
              </div>
            ))}
          </div>
        </div>
        {/* MAIN */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Ticker */}
          <div style={{ borderBottom:`1px solid ${G.border}`, background:"rgba(0,0,0,0.3)", overflow:"hidden", height:26, display:"flex", alignItems:"center" }}>
            <div style={{ display:"flex", gap:32, animation:"ticker 20s linear infinite", whiteSpace:"nowrap", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>
              {TICKER.map((t,i)=><span key={i} style={{ color:t.includes("↓")?G.red:G.green, marginRight:32 }}>◈ {t}</span>)}
            </div>
          </div>
          {/* Header */}
          <div style={{ padding:"12px 24px", borderBottom:`1px solid ${G.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:15, fontWeight:700 }}>{NAV_MAIN.find(n=>n.id===tab)?.icon} {NAV_MAIN.find(n=>n.id===tab)?.label}</div>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ fontSize:11, color:G.green, display:"flex", alignItems:"center", gap:4 }}><span style={{ width:7, height:7, borderRadius:"50%", background:G.green, display:"inline-block" }} />All Systems Operational</span>
              <div style={{ width:1, height:16, background:G.border }} />
              <span className="mono" style={{ fontSize:11, color:G.muted }}>github.com/openthai-ai</span>
            </div>
          </div>
          {/* Content */}
          <div className="fade" style={{ flex:1, overflowY:"auto", padding:"18px 24px" }}>
            {PAGES[tab]}
          </div>
        </div>
      </div>
    </>
  );
}
