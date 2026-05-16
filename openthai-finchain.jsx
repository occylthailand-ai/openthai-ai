import { useState, useEffect, useRef } from "react";

const WALLET = { address:"0x3f9A...d4E2", thb:284500, otai:12500 };
const PORTFOLIO = [
  { symbol:"BTC",  name:"Bitcoin",       amount:0.4821,  price:3180000, change:+2.34, color:"#f7931a" },
  { symbol:"ETH",  name:"Ethereum",      amount:3.142,   price:112400,  change:-1.12, color:"#627eea" },
  { symbol:"USDT", name:"Tether",        amount:7820.44, price:36.2,    change:+0.01, color:"#26a17b" },
  { symbol:"OTAI", name:"OpenThai Token",amount:12500,   price:4.85,    change:+8.77, color:"#d4a017" },
  { symbol:"BNB",  name:"BNB Chain",     amount:12.5,    price:19800,   change:+3.21, color:"#f3ba2f" },
];
const TX_HISTORY = [
  { hash:"0xab12…f930", type:"รับ",   asset:"USDT",    amount:"+2,500",    thb:"+90,500",  time:"10 นาทีที่แล้ว", status:"success" },
  { hash:"0xcc47…a211", type:"โอน",   asset:"ETH",     amount:"-0.5",      thb:"-56,200",  time:"2 ชม.ที่แล้ว",   status:"success" },
  { hash:"0xde88…b302", type:"Swap",  asset:"BTC→ETH", amount:"0.05→1.42", thb:"≈159,000", time:"1 วันที่แล้ว",   status:"success" },
  { hash:"0xff11…c901", type:"Stake", asset:"OTAI",    amount:"5,000",     thb:"+24,250",  time:"3 วันที่แล้ว",   status:"pending" },
  { hash:"0x7b23…e440", type:"รับ",   asset:"BNB",     amount:"+3.0",      thb:"+59,400",  time:"5 วันที่แล้ว",   status:"success" },
];
const DEFI_POOLS = [
  { name:"BTC/USDT LP",  apy:"12.4%", tvl:"₿ 2.4M",  myStake:"₿ 0.2",  reward:"OTAI", badge:"HOT" },
  { name:"ETH/THB LP",   apy:"8.7%",  tvl:"Ξ 850K",  myStake:"Ξ 1.0",  reward:"OTAI", badge:""    },
  { name:"OTAI Staking", apy:"24.5%", tvl:"฿ 12M",   myStake:"12,500", reward:"OTAI", badge:"NEW" },
  { name:"THB Yield",    apy:"5.2%",  tvl:"฿ 450M",  myStake:"฿ 50K",  reward:"THB+", badge:""    },
];

/* ── AFFILIATE DATA ── */
const AFF_CODE = "OTAI-3F9A-D4E2";
const AFF_LINK = "https://openthai.ai/ref/OTAI-3F9A-D4E2";
const AFF_TIERS = [
  { tier:"Bronze",  icon:"🥉", minRef:0,   comm:"5%",  bonus:"0 OTAI",    color:"#cd7f32", myTier:false },
  { tier:"Silver",  icon:"🥈", minRef:10,  comm:"8%",  bonus:"500 OTAI",  color:"#c0c0c0", myTier:false },
  { tier:"Gold",    icon:"🥇", minRef:50,  comm:"12%", bonus:"2,000 OTAI",color:"#d4a017", myTier:true  },
  { tier:"Platinum",icon:"💎", minRef:200, comm:"18%", bonus:"10K OTAI",  color:"#7fffff", myTier:false },
];
const AFF_EARN = [
  { mo:"ม.ค.", v:4200 },{ mo:"ก.พ.", v:6800 },{ mo:"มี.ค.", v:5100 },
  { mo:"เม.ย.",v:9400 },{ mo:"พ.ค.", v:12750},{ mo:"มิ.ย.",v:11200},
];
const AFF_NET = [
  { name:"สมชาย ว.",  code:"SMCH-001", joined:"15 วัน",   vol:"฿82,400", comm:"฿9,888", active:true,  lv:1 },
  { name:"นภา ก.",    code:"NPHA-002", joined:"22 วัน",   vol:"฿61,200", comm:"฿7,344", active:true,  lv:1 },
  { name:"วิชัย ป.",  code:"WCHI-003", joined:"1 เดือน",  vol:"฿34,500", comm:"฿4,140", active:false, lv:1 },
  { name:"ปิยะ ส.",   code:"PIYA-004", joined:"35 วัน",   vol:"฿18,900", comm:"฿2,268", active:true,  lv:2 },
  { name:"กานต์ ม.",  code:"KAAN-005", joined:"40 วัน",   vol:"฿9,200",  comm:"฿1,104", active:true,  lv:2 },
];
const AFF_PAYOUTS = [
  { date:"01 พ.ค. 2026", amount:"฿12,750", asset:"USDT", tx:"0xpay…a1f2", status:"paid"    },
  { date:"01 เม.ย. 2026", amount:"฿9,400",  asset:"OTAI", tx:"0xpay…b3c4", status:"paid"    },
  { date:"01 มิ.ย. 2026", amount:"฿14,200", asset:"USDT", tx:"—",          status:"pending" },
];

const AI_SYS = `คุณคือ OpenThai AI FinAdvisor — ผู้เชี่ยวชาญการเงิน FinTech, Blockchain และ Affiliate Marketing ตลาดไทย/ASEAN ตอบเป็นภาษาไทยเสมอ ใส่ตัวเลขจริง เตือนความเสี่ยง ระบุว่าข้อมูลเพื่อการศึกษา`;

const fmt = n => n.toLocaleString("th-TH");
const totalP = () => PORTFOLIO.reduce((s,t)=>s+t.amount*t.price,0);
const totalAff = AFF_EARN.reduce((s,m)=>s+m.v,0);
const maxBar = Math.max(...AFF_EARN.map(m=>m.v));

/* ════════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab,      setTab]      = useState("dashboard");
  const [netTab,   setNetTab]   = useState("network");
  const [copied,   setCopied]   = useState(false);
  const [swapFrom, setSwapFrom] = useState("BTC");
  const [swapTo,   setSwapTo]   = useState("USDT");
  const [swapAmt,  setSwapAmt]  = useState("");
  const [sendAddr, setSendAddr] = useState("");
  const [sendAmt,  setSendAmt]  = useState("");
  const [sendAsset,setSendAsset]= useState("USDT");
  const [msgs,     setMsgs]     = useState([{ role:"assistant", content:"🤖 สวัสดี! ฉันคือ **OpenThai AI FinAdvisor**\n\nถามได้ทุกเรื่อง Crypto · DeFi · Blockchain · Affiliate Program\nรองรับ ไทย · 中文 · English" }]);
  const [aiIn,     setAiIn]     = useState("");
  const [aiLoad,   setAiLoad]   = useState(false);
  const [px,       setPx]       = useState({ btc:3180000, eth:112400, otai:4.85 });
  const [tick,     setTick]     = useState(0);
  const end = useRef(null);

  useEffect(()=>{ end.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);
  useEffect(()=>{
    const id = setInterval(()=>{
      setPx(p=>({ btc:p.btc+(Math.random()-.5)*800, eth:p.eth+(Math.random()-.5)*200, otai:p.otai+(Math.random()-.5)*.05 }));
      setTick(t=>t+1);
    },2500);
    return ()=>clearInterval(id);
  },[]);

  const copy = () => { navigator.clipboard?.writeText(AFF_LINK).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const ask = async (text) => {
    const msg = text||aiIn.trim(); if(!msg||aiLoad) return; setAiIn("");
    const ctx = `\n\n[PORTFOLIO] ${PORTFOLIO.map(t=>`${t.symbol}:${t.amount}@฿${fmt(t.price)}`).join(", ")} รวม฿${fmt(Math.round(totalP()))}\n[AFFILIATE] Gold Tier · รายได้฿${fmt(totalAff)} · ${AFF_NET.length}คน`;
    setMsgs(p=>[...p,{role:"user",content:msg}]);
    setAiLoad(true);
    try {
      const hist = msgs.map(m=>({role:m.role,content:m.content}));
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, system:AI_SYS, messages:[...hist,{role:"user",content:msg+ctx}] })
      });
      const d = await r.json();
      setMsgs(p=>[...p,{role:"assistant",content:d.content?.[0]?.text||"ขออภัย เกิดข้อผิดพลาด"}]);
    } catch { setMsgs(p=>[...p,{role:"assistant",content:"⚠️ เชื่อมต่อไม่ได้ กรุณาลองใหม่"}]); }
    setAiLoad(false);
  };

  const TABS = [
    {id:"dashboard",icon:"◈",label:"Dashboard"},
    {id:"affiliate",icon:"◎",label:"Affiliate"},
    {id:"portfolio",icon:"◉",label:"Portfolio"},
    {id:"defi",     icon:"⬡",label:"DeFi"},
    {id:"send",     icon:"↗",label:"โอน/รับ"},
    {id:"txs",      icon:"≡",label:"ธุรกรรม"},
    {id:"ai",       icon:"✦",label:"AI Advisor"},
  ];

  const pTotal = totalP();
  const card = { background:"rgba(255,255,255,.03)", border:"1px solid rgba(0,255,136,.1)", borderRadius:12 };
  const affCard = { background:"rgba(212,160,23,.04)", border:"1px solid rgba(212,160,23,.18)", borderRadius:12 };

  return (
    <div style={{fontFamily:"'IBM Plex Sans Thai','Sarabun',sans-serif",background:"#050a14",minHeight:"100vh",color:"#c9d6e8",overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600&family=Share+Tech+Mono&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#07101f} ::-webkit-scrollbar-thumb{background:#1a3a2a;border-radius:4px}
        .scan{position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,136,.012) 2px,rgba(0,255,136,.012) 4px);pointer-events:none;z-index:0}
        .fade{animation:fi .3s ease}@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .pulse{animation:pd 1.8s ease-in-out infinite}@keyframes pd{0%,100%{opacity:1}50%{opacity:.3}}
        .glow{text-shadow:0 0 14px rgba(0,255,136,.6)} .glow-g{text-shadow:0 0 14px rgba(212,160,23,.7)}
        .mono{font-family:'Share Tech Mono',monospace}
        .hash{font-family:'Share Tech Mono',monospace;font-size:10px;color:#2a7a5a}
        .hvr{transition:all .18s;cursor:pointer;border:none}
        .hvr:hover{background:rgba(0,255,136,.08)!important;border-color:rgba(0,255,136,.28)!important;transform:translateY(-1px)}
        .ahvr{transition:all .18s;cursor:pointer;border:none}
        .ahvr:hover{background:rgba(212,160,23,.12)!important;border-color:rgba(212,160,23,.4)!important;transform:translateY(-1px)}
        .btn{cursor:pointer;font-family:inherit;transition:all .2s;border:none}
        .btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,255,136,.2)}
        .abtn{cursor:pointer;font-family:inherit;transition:all .2s;border:none}
        .abtn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(212,160,23,.25)}
        input:focus,textarea:focus,select:focus{outline:none}
      `}</style>
      <div className="scan"/>

      {/* TOP BAR */}
      <div style={{position:"relative",zIndex:10,background:"rgba(5,10,20,.97)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(0,255,136,.1)",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:"linear-gradient(135deg,#00ff88,#d4a017)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#050a14"}}>อ</div>
          <div>
            <div className="mono" style={{fontSize:14,color:"#00ff88",letterSpacing:1}}>OpenThai<span style={{color:"#d4a017"}}>.ai</span></div>
            <div style={{fontSize:8,color:"#2a5a3a",letterSpacing:3,textTransform:"uppercase"}}>FinChain · Blockchain Edition</div>
          </div>
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          {[{s:"BTC",v:px.btc},{s:"ETH",v:px.eth},{s:"OTAI",v:px.otai}].map(t=>(
            <div key={t.s} style={{textAlign:"center"}}>
              <div style={{fontSize:8,color:"#2a7a5a",letterSpacing:1}}>{t.s}/THB</div>
              <div className="mono" style={{fontSize:11,color:"#00ff88"}}>฿{fmt(Math.round(t.v))}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"#00ff88"}}/>
          <span className="mono" style={{fontSize:9,color:"#2a7a5a"}}>{WALLET.address}</span>
        </div>
      </div>

      <div style={{position:"relative",zIndex:1,display:"flex",height:"calc(100vh - 52px)"}}>

        {/* SIDE NAV */}
        <div style={{width:64,background:"rgba(5,10,20,.9)",borderRight:"1px solid rgba(0,255,136,.07)",display:"flex",flexDirection:"column",alignItems:"center",paddingTop:10,gap:2}}>
          {TABS.map(t=>(
            <button key={t.id} className={t.id==="affiliate"?"ahvr":"hvr"} onClick={()=>setTab(t.id)} style={{
              width:52,padding:"9px 0",borderRadius:10,textAlign:"center",
              background: tab===t.id ? (t.id==="affiliate"?"rgba(212,160,23,.14)":"rgba(0,255,136,.1)") : "transparent",
              border:     tab===t.id ? (t.id==="affiliate"?"1px solid rgba(212,160,23,.4)":"1px solid rgba(0,255,136,.25)") : "1px solid transparent",
            }}>
              <div style={{fontSize:16,color:tab===t.id?(t.id==="affiliate"?"#d4a017":"#00ff88"):"#2a5a3a"}}>{t.icon}</div>
              <div style={{fontSize:7,color:tab===t.id?(t.id==="affiliate"?"#d4a017":"#00ff88"):"#2a4a3a",letterSpacing:.3,marginTop:2}}>{t.label}</div>
            </button>
          ))}
        </div>

        {/* MAIN */}
        <div style={{flex:1,overflow:"auto",padding:"16px 20px"}}>

          {/* ══ DASHBOARD ══════════════════════════════════════════════════════════ */}
          {tab==="dashboard" && (
            <div className="fade">
              {/* Hero row */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:12,marginBottom:12}}>

                {/* Portfolio balance */}
                <div style={{position:"relative",overflow:"hidden",background:"linear-gradient(135deg,rgba(0,255,136,.07),rgba(212,160,23,.04))",border:"1px solid rgba(0,255,136,.2)",borderRadius:14,padding:"20px 24px"}}>
                  <div style={{position:"absolute",top:-30,right:-30,width:150,height:150,background:"radial-gradient(circle,rgba(0,255,136,.07),transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
                  <div style={{fontSize:9,color:"#2a7a5a",letterSpacing:3,textTransform:"uppercase",marginBottom:4}}>มูลค่าพอร์ตโฟลิโอรวม</div>
                  <div className="glow mono" style={{fontSize:34,fontWeight:700,color:"#00ff88",marginBottom:3}}>{`฿${fmt(Math.round(pTotal))}`}</div>
                  <div style={{display:"flex",gap:14,alignItems:"center"}}>
                    <span style={{fontSize:11,color:"#00ff88"}}>▲ +12.4% (7 วัน)</span>
                    <span style={{fontSize:9,color:"#2a7a5a"}}>USDT {fmt(Math.round(pTotal/36.2))}</span>
                  </div>
                  <div style={{position:"absolute",top:14,right:16,textAlign:"right"}}>
                    <div style={{fontSize:8,color:"#2a5a3a"}}>Block #{43000+(tick%999)}</div>
                    <div className="mono" style={{fontSize:10,color:"#d4a017"}}>BNB Chain</div>
                  </div>
                </div>

                {/* ★ AFFILIATE HUB CARD ★ */}
                <div onClick={()=>setTab("affiliate")} style={{
                  position:"relative",overflow:"hidden",cursor:"pointer",
                  background:"linear-gradient(135deg,rgba(212,160,23,.12),rgba(212,160,23,.04),rgba(0,255,136,.04))",
                  border:"1px solid rgba(212,160,23,.38)",borderRadius:14,padding:"16px 20px",
                  transition:"all .2s",boxShadow:"0 0 24px rgba(212,160,23,.1)"
                }} className="ahvr">
                  <div style={{position:"absolute",top:-25,right:-25,width:160,height:160,background:"radial-gradient(circle,rgba(212,160,23,.13),transparent 70%)",borderRadius:"50%",pointerEvents:"none"}}/>
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:9,color:"#d4a017",letterSpacing:3,textTransform:"uppercase",marginBottom:2}}>◎ Affiliate Hub</div>
                      <div style={{fontSize:9,color:"#7a5a00"}}>คลิกเพื่อจัดการ Affiliate →</div>
                    </div>
                    <div style={{fontSize:9,padding:"3px 9px",borderRadius:4,background:"rgba(212,160,23,.22)",border:"1px solid rgba(212,160,23,.45)",color:"#d4a017"}}>🥇 Gold Tier · 12%</div>
                  </div>
                  {/* 3-stat row */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:10}}>
                    {[
                      {l:"รายได้รวม",  v:`฿${fmt(totalAff)}`,    s:"ตลอดกาล",    c:"#d4a017"},
                      {l:"Active Ref.", v:`${AFF_NET.filter(n=>n.active).length}/${AFF_NET.length}`,s:"คน",c:"#00ff88"},
                      {l:"เดือนนี้",   v:`฿${fmt(AFF_EARN[AFF_EARN.length-1].v)}`,s:"+35.4%",c:"#f7931a"},
                    ].map((s,i)=>(
                      <div key={i} style={{background:"rgba(0,0,0,.28)",borderRadius:8,padding:"8px 9px"}}>
                        <div style={{fontSize:7,color:"#7a6020",letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>{s.l}</div>
                        <div className="mono" style={{fontSize:14,color:s.c,fontWeight:700}}>{s.v}</div>
                        <div style={{fontSize:8,color:"#5a4a20"}}>{s.s}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini bar chart */}
                  <div style={{marginBottom:9}}>
                    <div style={{fontSize:7,color:"#7a6020",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>รายได้ 6 เดือน</div>
                    <div style={{display:"flex",gap:4,alignItems:"flex-end",height:32}}>
                      {AFF_EARN.map((m,i)=>{
                        const h=Math.round((m.v/maxBar)*30);
                        const hot=m.v===maxBar;
                        return (
                          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                            <div style={{width:"100%",borderRadius:"3px 3px 0 0",height:h+"px",background:hot?"#d4a017":"rgba(212,160,23,.3)"}}/>
                            <div style={{fontSize:6.5,color:"#7a5a00"}}>{m.mo}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Ref link */}
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:"rgba(0,0,0,.3)",borderRadius:6,border:"1px solid rgba(212,160,23,.2)"}}>
                    <span className="mono" style={{fontSize:8,color:"#7a6020",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{AFF_LINK}</span>
                    <button onClick={e=>{e.stopPropagation();copy();}} className="abtn" style={{fontSize:8,padding:"2px 8px",borderRadius:4,background:"rgba(212,160,23,.2)",border:"1px solid rgba(212,160,23,.4)",color:"#d4a017"}}>
                      {copied?"✓ copied":"คัดลอก"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:12}}>
                {[
                  {l:"THB สด",      v:`฿${fmt(WALLET.thb)}`,  s:"PromptPay Ready",  c:"#00ff88",icon:"💳"},
                  {l:"Yield รายวัน",v:"฿1,240",               s:"จาก DeFi Pools",  c:"#d4a017",icon:"⬡"},
                  {l:"OTAI Token",  v:fmt(WALLET.otai),        s:"+8.77% วันนี้",   c:"#d4a017",icon:"✦"},
                  {l:"Gas Fee",     v:"~฿0.18",                s:"BNB Chain",       c:"#627eea",icon:"⛽"},
                ].map((s,i)=>(
                  <div key={i} style={{...card,padding:"12px 14px"}}>
                    <div style={{fontSize:17,marginBottom:5}}>{s.icon}</div>
                    <div style={{fontSize:8,color:"#2a7a5a",letterSpacing:1,textTransform:"uppercase"}}>{s.l}</div>
                    <div className="mono" style={{fontSize:15,color:s.c,marginTop:3,marginBottom:2}}>{s.v}</div>
                    <div style={{fontSize:8,color:"#2a5a3a"}}>{s.s}</div>
                  </div>
                ))}
              </div>

              {/* Recent txs */}
              <div style={{...card,padding:"12px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:9,color:"#00ff88",letterSpacing:2,textTransform:"uppercase"}}>ธุรกรรมล่าสุด</span>
                  <button onClick={()=>setTab("txs")} style={{fontSize:9,color:"#2a7a5a",background:"none",border:"none",cursor:"pointer"}}>ดูทั้งหมด →</button>
                </div>
                {TX_HISTORY.slice(0,3).map((tx,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<2?"1px solid rgba(0,255,136,.05)":"none"}}>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <div style={{width:24,height:24,borderRadius:7,background:tx.type==="รับ"?"rgba(0,255,136,.15)":"rgba(255,68,102,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>
                        {tx.type==="รับ"?"↙":tx.type==="Swap"?"⇄":tx.type==="Stake"?"⬡":"↗"}
                      </div>
                      <div>
                        <div style={{fontSize:11,color:"#c9d6e8"}}>{tx.type} · {tx.asset}</div>
                        <div className="hash">{tx.hash}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="mono" style={{fontSize:11,color:tx.type==="รับ"||tx.type==="Stake"?"#00ff88":"#ff4466"}}>{tx.amount}</div>
                      <div style={{fontSize:8,color:"#2a5a3a"}}>{tx.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ AFFILIATE HUB ══════════════════════════════════════════════════════ */}
          {tab==="affiliate" && (
            <div className="fade">

              {/* BANNER */}
              <div style={{position:"relative",overflow:"hidden",background:"linear-gradient(135deg,rgba(212,160,23,.13),rgba(0,255,136,.05))",border:"1px solid rgba(212,160,23,.38)",borderRadius:14,padding:"20px 24px",marginBottom:14}}>
                <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,background:"radial-gradient(circle,rgba(212,160,23,.12),transparent 65%)",borderRadius:"50%",pointerEvents:"none"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{fontSize:9,color:"#d4a017",letterSpacing:3,textTransform:"uppercase",marginBottom:3}}>◎ OpenThai Affiliate Hub</div>
                    <div className="glow-g mono" style={{fontSize:28,color:"#d4a017",marginBottom:2}}>{`฿${fmt(totalAff)}`}</div>
                    <div style={{fontSize:11,color:"#7a6020"}}>รายได้สะสมทั้งหมด · Commission 12% · Gold Tier</div>
                  </div>
                  <div style={{display:"flex",gap:9}}>
                    {[
                      {v:`${AFF_NET.length} คน`,    l:"ผู้แนะนำทั้งหมด"},
                      {v:`฿${fmt(AFF_EARN[AFF_EARN.length-1].v)}`, l:"เดือนนี้"},
                      {v:"฿14,200", l:"รอรับเดือนหน้า"},
                    ].map((s,i)=>(
                      <div key={i} style={{textAlign:"center",background:"rgba(0,0,0,.3)",borderRadius:10,padding:"9px 14px",border:"1px solid rgba(212,160,23,.2)"}}>
                        <div className="mono" style={{fontSize:17,color:"#d4a017",fontWeight:700}}>{s.v}</div>
                        <div style={{fontSize:8,color:"#7a5a00",letterSpacing:.5}}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* REF LINK */}
              <div style={{...affCard,padding:"14px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#d4a017",letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>🔗 Referral Link & Code</div>
                  <div className="mono" style={{fontSize:11,color:"#c9d6e8",background:"rgba(0,0,0,.4)",padding:"7px 11px",borderRadius:7,border:"1px solid rgba(212,160,23,.15)",marginBottom:5,wordBreak:"break-all"}}>{AFF_LINK}</div>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:9,color:"#7a6020"}}>Code:</span>
                    <span className="mono" style={{fontSize:12,color:"#d4a017",fontWeight:700}}>{AFF_CODE}</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  <button onClick={copy} className="abtn" style={{padding:"8px 18px",borderRadius:8,fontSize:11,background:copied?"rgba(0,255,136,.14)":"rgba(212,160,23,.14)",border:`1px solid ${copied?"rgba(0,255,136,.4)":"rgba(212,160,23,.4)"}`,color:copied?"#00ff88":"#d4a017"}}>
                    {copied?"✓ คัดลอกแล้ว":"📋 คัดลอก Link"}
                  </button>
                  <button className="abtn" style={{padding:"8px 18px",borderRadius:8,fontSize:11,background:"rgba(99,126,234,.1)",border:"1px solid rgba(99,126,234,.3)",color:"#627eea"}}>📤 แชร์</button>
                </div>
              </div>

              {/* TIERS */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:14}}>
                {AFF_TIERS.map((t,i)=>(
                  <div key={i} style={{
                    position:"relative",overflow:"hidden",
                    background:t.myTier?"rgba(212,160,23,.1)":"rgba(255,255,255,.02)",
                    border:`1px solid ${t.myTier?"rgba(212,160,23,.45)":"rgba(255,255,255,.06)"}`,
                    borderRadius:12,padding:"13px",
                    boxShadow:t.myTier?"0 0 18px rgba(212,160,23,.14)":""
                  }}>
                    {t.myTier && <div style={{position:"absolute",top:7,right:7,fontSize:7,padding:"1px 5px",borderRadius:3,background:"rgba(212,160,23,.25)",color:"#d4a017",border:"1px solid rgba(212,160,23,.4)"}}>ระดับคุณ</div>}
                    <div style={{fontSize:22,marginBottom:5}}>{t.icon}</div>
                    <div style={{fontSize:12,color:t.color,fontWeight:600,marginBottom:3}}>{t.tier}</div>
                    <div className="mono" style={{fontSize:20,color:t.myTier?"#d4a017":"#c9d6e8",fontWeight:700}}>{t.comm}</div>
                    <div style={{fontSize:8,color:"#5a5a5a",marginBottom:5}}>commission/ธุรกรรม</div>
                    <div style={{fontSize:9,color:"#2a7a5a"}}>Bonus: {t.bonus}</div>
                    <div style={{fontSize:8,color:"#4a4a4a",marginTop:2}}>≥ {t.minRef} refs</div>
                  </div>
                ))}
              </div>

              {/* CHART + TABLE */}
              <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:12}}>

                {/* Bar chart */}
                <div style={{...affCard,padding:"14px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <span style={{fontSize:9,color:"#d4a017",letterSpacing:2,textTransform:"uppercase"}}>📊 รายได้รายเดือน (THB)</span>
                    <span className="mono" style={{fontSize:9,color:"#2a7a5a"}}>{`฿${fmt(totalAff)}`} รวม</span>
                  </div>
                  <div style={{display:"flex",gap:7,alignItems:"flex-end",height:96}}>
                    {AFF_EARN.map((m,i)=>{
                      const h=Math.round((m.v/maxBar)*88);
                      const hot=m.v===maxBar;
                      return (
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                          {hot && <div className="mono" style={{fontSize:7,color:"#d4a017"}}>{`฿${fmt(m.v)}`}</div>}
                          <div style={{
                            width:"100%",borderRadius:"4px 4px 0 0",height:h+"px",
                            background:hot?"linear-gradient(180deg,#d4a017,#a07010)":"rgba(212,160,23,.28)",
                            boxShadow:hot?"0 0 10px rgba(212,160,23,.35)":""
                          }}/>
                          <div style={{fontSize:8,color:"#7a5a00"}}>{m.mo}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Network / Payout */}
                <div style={{...affCard,borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column"}}>
                  <div style={{display:"flex",borderBottom:"1px solid rgba(212,160,23,.1)"}}>
                    {["network","payout"].map(t=>(
                      <button key={t} onClick={()=>setNetTab(t)} style={{
                        flex:1,padding:"9px",fontSize:9,cursor:"pointer",border:"none",fontFamily:"inherit",
                        background:netTab===t?"rgba(212,160,23,.1)":"transparent",
                        color:netTab===t?"#d4a017":"#5a5a5a",
                        borderBottom:netTab===t?"2px solid #d4a017":"2px solid transparent",
                        letterSpacing:1,textTransform:"uppercase"
                      }}>{t==="network"?"👥 เครือข่าย":"💸 จ่ายออก"}</button>
                    ))}
                  </div>

                  <div style={{flex:1,overflow:"auto",padding:"6px 10px"}}>
                    {netTab==="network" && AFF_NET.map((n,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 4px",borderBottom:"1px solid rgba(212,160,23,.05)"}}>
                        <div style={{display:"flex",gap:7,alignItems:"center"}}>
                          <div style={{width:20,height:20,borderRadius:5,background:n.active?"rgba(0,255,136,.15)":"rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:n.active?"#00ff88":"#4a4a4a",fontFamily:"'Share Tech Mono',monospace"}}>L{n.lv}</div>
                          <div>
                            <div style={{fontSize:11,color:"#c9d6e8"}}>{n.name}</div>
                            <div className="hash">{n.code} · {n.joined}</div>
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div className="mono" style={{fontSize:11,color:"#d4a017"}}>{n.comm}</div>
                          <div style={{fontSize:7,padding:"1px 5px",borderRadius:3,background:n.active?"rgba(0,255,136,.1)":"rgba(255,255,255,.04)",color:n.active?"#00ff88":"#5a5a5a",marginTop:2,display:"inline-block"}}>{n.active?"active":"inactive"}</div>
                        </div>
                      </div>
                    ))}
                    {netTab==="payout" && AFF_PAYOUTS.map((p,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 4px",borderBottom:"1px solid rgba(212,160,23,.05)"}}>
                        <div>
                          <div style={{fontSize:11,color:"#c9d6e8"}}>{p.date}</div>
                          <div className="hash">{p.tx}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div className="mono" style={{fontSize:13,color:p.status==="paid"?"#00ff88":"#ffb400",fontWeight:600}}>{p.amount}</div>
                          <div style={{fontSize:8,color:"#5a5a5a"}}>{p.asset} · <span style={{color:p.status==="paid"?"#00ff88":"#ffb400"}}>{p.status}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{padding:"9px",borderTop:"1px solid rgba(212,160,23,.1)"}}>
                    <button className="abtn" style={{width:"100%",padding:"8px",borderRadius:8,fontSize:11,background:"linear-gradient(135deg,rgba(212,160,23,.18),rgba(212,160,23,.08))",border:"1px solid rgba(212,160,23,.38)",color:"#d4a017"}}>
                      💸 ถอนรายได้ → USDT / OTAI
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ PORTFOLIO ══════════════════════════════════════════════════════════ */}
          {tab==="portfolio" && (
            <div className="fade">
              <div style={{fontSize:9,color:"#00ff88",letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>Asset Portfolio</div>
              <div style={{display:"flex",gap:9,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
                {PORTFOLIO.map(t=>{
                  const pct=(t.amount*t.price/pTotal*100).toFixed(1);
                  return (
                    <div key={t.symbol} style={{...card,minWidth:115,padding:"11px",textAlign:"center"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:t.color+"22",border:`2px solid ${t.color}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 5px",fontSize:10,fontWeight:700,color:t.color}}>{t.symbol.slice(0,2)}</div>
                      <div style={{fontSize:9,color:"#c9d6e8",marginBottom:2}}>{t.symbol}</div>
                      <div className="mono" style={{fontSize:14,color:t.color}}>{pct}%</div>
                      <div style={{fontSize:8,color:t.change>=0?"#00ff88":"#ff4466",marginTop:2}}>{t.change>=0?"▲":"▼"} {Math.abs(t.change)}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{...card,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr .8fr",padding:"7px 12px",borderBottom:"1px solid rgba(0,255,136,.1)"}}>
                  {["สินทรัพย์","จำนวน","ราคา (THB)","มูลค่า (THB)","เปลี่ยน"].map(h=><div key={h} style={{fontSize:7.5,color:"#2a7a5a",letterSpacing:1,textTransform:"uppercase"}}>{h}</div>)}
                </div>
                {PORTFOLIO.map((t,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr .8fr",padding:"9px 12px",borderBottom:"1px solid rgba(0,255,136,.05)",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:t.color}}/>
                      <span style={{fontSize:12,color:"#e8f0e8"}}>{t.symbol}</span>
                    </div>
                    <div className="mono" style={{fontSize:11,color:"#c9d6e8"}}>{t.amount}</div>
                    <div className="mono" style={{fontSize:11,color:"#c9d6e8"}}>฿{fmt(t.price)}</div>
                    <div className="mono" style={{fontSize:11,color:"#00ff88"}}>฿{fmt(Math.round(t.amount*t.price))}</div>
                    <div className="mono" style={{fontSize:11,color:t.change>=0?"#00ff88":"#ff4466"}}>{t.change>=0?"+":""}{t.change}%</div>
                  </div>
                ))}
                <div style={{padding:"9px 12px",display:"flex",justifyContent:"space-between",background:"rgba(0,255,136,.04)",borderTop:"1px solid rgba(0,255,136,.15)"}}>
                  <span style={{fontSize:9,color:"#2a7a5a"}}>รวมทั้งหมด</span>
                  <span className="glow mono" style={{fontSize:14,color:"#00ff88"}}>฿{fmt(Math.round(pTotal))}</span>
                </div>
              </div>
            </div>
          )}

          {/* ══ DeFi ══════════════════════════════════════════════════════════════ */}
          {tab==="defi" && (
            <div className="fade">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{...card,padding:"16px"}}>
                  <div style={{fontSize:9,color:"#00ff88",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>⇄ Token Swap</div>
                  {["From","To"].map((lbl,idx)=>{
                    const val=idx===0?swapFrom:swapTo; const set=idx===0?setSwapFrom:setSwapTo;
                    return (
                      <div key={lbl} style={{marginBottom:9}}>
                        <div style={{fontSize:8,color:"#2a7a5a",marginBottom:3}}>{lbl}</div>
                        <div style={{display:"flex",gap:6}}>
                          <select value={val} onChange={e=>set(e.target.value)} style={{flex:1,padding:"7px 9px",borderRadius:7,fontSize:11,background:"#07101f",border:"1px solid rgba(0,255,136,.2)",color:"#c9d6e8",fontFamily:"inherit"}}>
                            {["BTC","ETH","USDT","OTAI","BNB"].map(s=><option key={s}>{s}</option>)}
                          </select>
                          {idx===0 && <input value={swapAmt} onChange={e=>setSwapAmt(e.target.value)} placeholder="จำนวน" style={{flex:1.3,padding:"7px 9px",borderRadius:7,fontSize:11,background:"#07101f",border:"1px solid rgba(0,255,136,.2)",color:"#00ff88",fontFamily:"'Share Tech Mono',monospace"}}/>}
                          {idx===1 && <div style={{flex:1.3,padding:"7px 9px",borderRadius:7,background:"rgba(0,255,136,.04)",border:"1px solid rgba(0,255,136,.1)",fontSize:11,color:"#00ff88",fontFamily:"'Share Tech Mono',monospace"}}>{swapAmt?(parseFloat(swapAmt)*31800/1000).toFixed(4):"0.0000"}</div>}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{fontSize:8,color:"#2a5a3a",marginBottom:9,padding:"5px 8px",background:"rgba(0,255,136,.04)",borderRadius:5}}>Fee: 0.3% · Slippage: 0.5% · Gas: ~฿0.18</div>
                  <button className="btn" style={{width:"100%",padding:"8px",borderRadius:7,fontSize:11,background:"linear-gradient(135deg,#004d2a,#006636)",border:"1px solid rgba(0,255,136,.4)",color:"#00ff88"}}>Confirm Swap ⇄</button>
                </div>
                <div>
                  <div style={{fontSize:9,color:"#d4a017",letterSpacing:2,textTransform:"uppercase",marginBottom:9}}>⬡ Liquidity Pools</div>
                  {DEFI_POOLS.map((p,i)=>(
                    <div key={i} style={{...card,padding:"10px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontSize:11,color:"#c9d6e8",fontWeight:500}}>{p.name}</span>
                          {p.badge&&<span style={{fontSize:7.5,padding:"1px 5px",borderRadius:3,background:p.badge==="HOT"?"rgba(255,100,0,.2)":"rgba(0,255,136,.15)",color:p.badge==="HOT"?"#ff6400":"#00ff88",border:`1px solid ${p.badge==="HOT"?"rgba(255,100,0,.3)":"rgba(0,255,136,.3)"}`}}>{p.badge}</span>}
                        </div>
                        <div style={{fontSize:8,color:"#2a5a3a",marginTop:2}}>TVL:{p.tvl} · My:{p.myStake}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div className="mono" style={{fontSize:14,color:"#d4a017"}}>{p.apy}</div>
                        <div style={{fontSize:7.5,color:"#2a5a3a"}}>APY·{p.reward}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{...card,marginTop:10,padding:"12px 14px",background:"rgba(212,160,23,.04)",borderColor:"rgba(212,160,23,.18)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:9,color:"#d4a017",letterSpacing:2,textTransform:"uppercase",marginBottom:2}}>🏛 Digital Baht (CBDC) · ธปท.</div>
                    <div style={{fontSize:10,color:"#2a7a5a"}}>ยอดคงเหลือ: <span className="mono" style={{color:"#d4a017"}}>฿50,000</span> · PromptPay Connected</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {["TopUp","ถอน"].map(a=><button key={a} className="abtn" style={{padding:"5px 11px",borderRadius:6,fontSize:9,background:"rgba(212,160,23,.14)",border:"1px solid rgba(212,160,23,.3)",color:"#d4a017"}}>{a}</button>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ SEND/RECEIVE ═══════════════════════════════════════════════════════ */}
          {tab==="send" && (
            <div className="fade" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{...card,padding:"16px"}}>
                <div style={{fontSize:9,color:"#ff4466",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>↗ โอน / Send</div>
                {[{l:"ที่อยู่ผู้รับ",t:"text",v:sendAddr,s:setSendAddr,p:"0x..."},{l:"จำนวน",t:"number",v:sendAmt,s:setSendAmt,p:"0.00"}].map((f,i)=>(
                  <div key={i} style={{marginBottom:9}}>
                    <div style={{fontSize:8,color:"#2a7a5a",marginBottom:3}}>{f.l}</div>
                    <input value={f.v} onChange={e=>f.s(e.target.value)} type={f.t} placeholder={f.p} style={{width:"100%",padding:"7px 9px",borderRadius:7,fontSize:11,background:"#07101f",border:"1px solid rgba(0,255,136,.2)",color:"#c9d6e8",fontFamily:f.t==="text"?"'Share Tech Mono',monospace":"inherit"}}/>
                  </div>
                ))}
                <select value={sendAsset} onChange={e=>setSendAsset(e.target.value)} style={{width:"100%",padding:"7px 9px",borderRadius:7,fontSize:11,background:"#07101f",border:"1px solid rgba(0,255,136,.2)",color:"#c9d6e8",fontFamily:"inherit",marginBottom:9}}>
                  {["USDT","BTC","ETH","OTAI","BNB"].map(s=><option key={s}>{s}</option>)}
                </select>
                <div style={{padding:"6px 8px",background:"rgba(255,68,102,.06)",borderRadius:5,fontSize:8,color:"#ff4466",marginBottom:9}}>⚠️ ตรวจสอบที่อยู่ก่อนส่ง — ธุรกรรม Blockchain ย้อนกลับไม่ได้</div>
                <button className="btn" style={{width:"100%",padding:"8px",borderRadius:7,fontSize:11,background:"linear-gradient(135deg,#4d0015,#660020)",border:"1px solid rgba(255,68,102,.4)",color:"#ff4466"}}>ยืนยันการโอน →</button>
              </div>
              <div style={{...card,padding:"16px"}}>
                <div style={{fontSize:9,color:"#00ff88",letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>↙ รับ / Receive</div>
                <div style={{width:120,height:120,margin:"0 auto 12px",background:"#07101f",border:"2px solid rgba(0,255,136,.2)",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,padding:9}}>
                    {Array(49).fill(0).map((_,i)=>(
                      <div key={i} style={{width:10,height:10,borderRadius:1,background:[0,1,2,3,4,5,6,7,13,14,21,28,35,42,43,44,45,46,47,48].includes(i)||Math.random()>.5?"rgba(0,255,136,.7)":"transparent"}}/>
                    ))}
                  </div>
                </div>
                <div className="mono" style={{fontSize:9.5,color:"#00ff88",background:"rgba(0,255,136,.06)",padding:"6px 9px",borderRadius:6,border:"1px solid rgba(0,255,136,.15)",wordBreak:"break-all",marginBottom:9,textAlign:"center"}}>{WALLET.address}</div>
                <div style={{display:"flex",gap:6,marginBottom:10}}>
                  {["คัดลอก","แชร์","QR"].map(a=><button key={a} className="btn" style={{flex:1,padding:"6px",borderRadius:6,fontSize:9.5,background:"rgba(0,255,136,.07)",border:"1px solid rgba(0,255,136,.2)",color:"#00ff88"}}>{a}</button>)}
                </div>
                <div style={{padding:"9px",background:"rgba(99,126,234,.06)",borderRadius:7,border:"1px solid rgba(99,126,234,.2)"}}>
                  <div style={{fontSize:8,color:"#627eea",letterSpacing:1,marginBottom:4}}>🌏 CROSS-BORDER ASEAN</div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
                    {["🇹🇭 THB","🇨🇳 CNY","🇸🇬 SGD","🇯🇵 JPY"].map(c=><span key={c} style={{color:"#627eea"}}>{c}</span>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TRANSACTIONS ════════════════════════════════════════════════════════ */}
          {tab==="txs" && (
            <div className="fade">
              <div style={{fontSize:9,color:"#00ff88",letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>On-Chain Transaction History</div>
              <div style={{...card,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:".75fr 1fr 1.1fr .9fr .85fr .65fr",padding:"7px 12px",borderBottom:"1px solid rgba(0,255,136,.1)"}}>
                  {["Tx Hash","ประเภท","สินทรัพย์","มูลค่า THB","เวลา","Status"].map(h=><div key={h} style={{fontSize:7.5,color:"#2a7a5a",letterSpacing:1,textTransform:"uppercase"}}>{h}</div>)}
                </div>
                {TX_HISTORY.map((tx,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:".75fr 1fr 1.1fr .9fr .85fr .65fr",padding:"9px 12px",borderBottom:"1px solid rgba(0,255,136,.05)",alignItems:"center"}}>
                    <div className="hash">{tx.hash}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <div style={{width:20,height:20,borderRadius:5,background:tx.type==="รับ"?"rgba(0,255,136,.15)":"rgba(255,68,102,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>
                        {tx.type==="รับ"?"↙":tx.type==="Swap"?"⇄":tx.type==="Stake"?"⬡":"↗"}
                      </div>
                      <span style={{fontSize:10,color:"#c9d6e8"}}>{tx.type}</span>
                    </div>
                    <div className="mono" style={{fontSize:10,color:"#c9d6e8"}}>{tx.asset}</div>
                    <div className="mono" style={{fontSize:10,color:tx.type==="รับ"||tx.type==="Stake"?"#00ff88":"#ff4466"}}>{tx.thb}</div>
                    <div style={{fontSize:8.5,color:"#2a5a3a"}}>{tx.time}</div>
                    <div style={{fontSize:8.5,padding:"2px 6px",borderRadius:3,background:tx.status==="success"?"rgba(0,255,136,.1)":"rgba(255,180,0,.1)",color:tx.status==="success"?"#00ff88":"#ffb400",border:`1px solid ${tx.status==="success"?"rgba(0,255,136,.2)":"rgba(255,180,0,.2)"}`,textAlign:"center"}}>{tx.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ AI ADVISOR ════════════════════════════════════════════════════════ */}
          {tab==="ai" && (
            <div className="fade" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 106px)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                <div style={{fontSize:9,color:"#d4a017",letterSpacing:3,textTransform:"uppercase"}}>✦ OpenThai AI FinAdvisor</div>
                <div style={{fontSize:8,color:"#2a5a3a",background:"rgba(212,160,23,.07)",padding:"3px 10px",borderRadius:4,border:"1px solid rgba(212,160,23,.2)"}}>
                  ฿{fmt(Math.round(pTotal))} · {PORTFOLIO.length} Assets · Affiliate Gold
                </div>
              </div>
              <div style={{display:"flex",gap:4,marginBottom:9,flexWrap:"wrap"}}>
                {["วิเคราะห์พอร์ตโฟลิโอของฉัน","ความเสี่ยง Stake OTAI?","เปรียบเทียบ DeFi vs ธนาคาร","แนวโน้ม BTC/THB 30 วัน","อธิบาย Smart Contract","กลยุทธ์เพิ่มรายได้ Affiliate"].map((p,i)=>(
                  <button key={i} onClick={()=>ask(p)} style={{padding:"3px 8px",borderRadius:5,fontSize:8.5,cursor:"pointer",background:"rgba(212,160,23,.07)",border:"1px solid rgba(212,160,23,.2)",color:"#d4a017",fontFamily:"inherit"}}>{p}</button>
                ))}
              </div>
              <div style={{flex:1,overflow:"auto",marginBottom:9}}>
                {msgs.map((m,i)=>(
                  <div key={i} className="fade" style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:9}}>
                    {m.role==="assistant"&&<div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#00ff88,#d4a017)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#050a14",marginRight:7,flexShrink:0,marginTop:2}}>AI</div>}
                    <div style={{maxWidth:"78%",background:m.role==="user"?"rgba(0,255,136,.07)":"rgba(212,160,23,.05)",border:m.role==="user"?"1px solid rgba(0,255,136,.18)":"1px solid rgba(212,160,23,.14)",borderRadius:m.role==="user"?"12px 3px 12px 12px":"3px 12px 12px 12px",padding:"8px 12px",fontSize:11.5,lineHeight:1.7,color:"#c9d6e8"}}>
                      <div dangerouslySetInnerHTML={{__html:m.content.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#00ff88">$1</strong>').replace(/\n/g,'<br/>')}}/>
                    </div>
                  </div>
                ))}
                {aiLoad&&(
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9}}>
                    <div style={{width:22,height:22,borderRadius:6,background:"linear-gradient(135deg,#00ff88,#d4a017)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#050a14"}}>AI</div>
                    <div style={{display:"flex",gap:4,padding:"8px 12px",background:"rgba(212,160,23,.05)",border:"1px solid rgba(212,160,23,.14)",borderRadius:"3px 12px 12px 12px"}}>
                      {[0,1,2].map(j=><div key={j} className="pulse" style={{width:6,height:6,borderRadius:"50%",background:"#d4a017",animationDelay:`${j*.2}s`}}/>)}
                    </div>
                  </div>
                )}
                <div ref={end}/>
              </div>
              <div style={{display:"flex",gap:7}}>
                <textarea value={aiIn} onChange={e=>setAiIn(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask();}}} placeholder="ถามเกี่ยวกับ Crypto, DeFi, Blockchain, Affiliate..." rows={2} style={{flex:1,padding:"8px 11px",borderRadius:9,fontSize:11.5,background:"#07101f",border:"1px solid rgba(212,160,23,.2)",color:"#c9d6e8",resize:"none",fontFamily:"inherit",lineHeight:1.6}}/>
                <button onClick={()=>ask()} disabled={aiLoad||!aiIn.trim()} className="abtn" style={{padding:"0 15px",borderRadius:9,background:aiLoad||!aiIn.trim()?"rgba(212,160,23,.05)":"linear-gradient(135deg,#4d3600,#664800)",border:"1px solid rgba(212,160,23,.3)",color:aiLoad||!aiIn.trim()?"#4a4030":"#d4a017",fontSize:17}}>▶</button>
              </div>
              <div style={{fontSize:7.5,color:"#2a4030",textAlign:"center",marginTop:4}}>⚠️ ข้อมูลเพื่อการศึกษาเท่านั้น ไม่ใช่คำแนะนำทางการเงิน</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
