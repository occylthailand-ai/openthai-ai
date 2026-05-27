"use client";
// app/page.tsx — Partner Hub (4 ประเภทพันธมิตร)
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth";

const PARTNERS = [
  {
    id:    "sale",
    emoji: "🔗",
    title: "พันธมิตรขาย",
    en:    "Affiliate",
    desc:  "แชร์ลิงก์ → มีคนซื้อ → รับ commission 20–40%",
    perks: ["Commission สูงถึง 40%","PromptPay อัตโนมัติ","Dashboard real-time","Media Kit พร้อมใช้"],
    cta:   "เริ่มต้นฟรี",
    href:  null,         // เปิด modal
    color: "var(--gold)",
    badge: "เปิดรับแล้ว",
    badgeCls: "badge-green",
  },
  {
    id:    "producer",
    emoji: "🏭",
    title: "พันธมิตรผู้ผลิต",
    en:    "Producer",
    desc:  "นำสินค้ามาลงขาย → เครือข่ายพันธมิตรขายช่วยแชร์",
    perks: ["ฟรีค่าลงสินค้า","เครือข่าย 4,200+ พันธมิตร","Dashboard ผู้ผลิต","อนุมัติใน 1–2 วัน"],
    cta:   "ลงทะเบียน",
    href:  "/producer",
    color: "var(--green)",
    badge: "เปิดรับแล้ว",
    badgeCls: "badge-green",
  },
  {
    id:    "api",
    emoji: "⚡",
    title: "พันธมิตรนักพัฒนา",
    en:    "API Partner",
    desc:  "Build สินค้าบน AI ของ Openthai.ai + revenue share",
    perks: ["API access ราคาพิเศษ","Revenue share 15%","Technical support","Early access features"],
    cta:   "สมัคร API Partner",
    href:  "/api-partner",
    color: "#A78BFA",
    badge: "เปิดรับจำกัด",
    badgeCls: "badge-gold",
  },
  {
    id:    "content",
    emoji: "🎬",
    title: "พันธมิตรคอนเทนต์",
    en:    "Content Partner",
    desc:  "Influencer / สื่อ ร่วมสร้างแบรนด์ + exclusive benefits",
    perks: ["Pro account ฟรี","Co-create content","Featured ในแพลตฟอร์ม","Brand collab fee"],
    cta:   "ยื่นใบสมัคร",
    href:  "/content-partner",
    color: "#F472B6",
    badge: "รับสมัคร",
    badgeCls: "badge-gold",
  },
];

function HubContent() {
  const router   = useRouter();
  const params   = useSearchParams();
  const [modal,  setModal]  = useState<"login"|"register"|null>(
    params.get("auth") === "login" ? "login" : null
  );
  const [form,   setForm]   = useState({ name:"", email:"", password:"" });
  const [err,    setErr]    = useState("");
  const [info,   setInfo]   = useState("");
  const [loading,setLoad]   = useState(false);

  const set = (k: string, v: string) => setForm(f => ({...f,[k]:v}));

  async function handleRegister() {
    setErr(""); setLoad(true);
    try {
      await signUp(form.name, form.email, form.password);
      setModal(null);
      setInfo("✦ สมัครสำเร็จ — กรุณายืนยันอีเมลก่อนเข้าระบบ");
    } catch(e: any) { setErr(e.message); }
    finally { setLoad(false); }
  }

  async function handleLogin() {
    setErr(""); setLoad(true);
    try {
      await signIn(form.email, form.password);
      router.push("/dashboard");
    } catch(e: any) { setErr(e.message); }
    finally { setLoad(false); }
  }

  function openModal(type: "login"|"register") {
    setModal(type); setErr(""); setInfo("");
    setForm({ name:"", email:"", password:"" });
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <span className="nav-logo"><span className="nav-dot"/>พันธมิตร Hub</span>
        <div className="nav-links">
          <button className="nav-link" onClick={() => openModal("login")}>เข้าสู่ระบบ</button>
          <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
        </div>
        <button className="btn-gold" style={{padding:"9px 22px",fontSize:"14px"}} onClick={() => openModal("register")}>
          ✦ เข้าร่วมฟรี
        </button>
      </nav>

      {info && <div className="toast">{info}</div>}

      {/* HERO */}
      <section style={{textAlign:"center",padding:"72px 24px 56px"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"10px",border:"1px solid var(--border2)",borderRadius:"2px",padding:"6px 20px",marginBottom:"28px"}}>
          <span className="live-dot"/>
          <span className="tag">Openthai.ai Partner Ecosystem</span>
        </div>
        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(38px,6vw,68px)",fontWeight:300,lineHeight:1.1,marginBottom:"14px"}}>
          ร่วมเป็น<em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>พันธมิตร</em><br/>สร้าง AI ไทยด้วยกัน
        </h1>
        <p style={{fontSize:"15px",color:"var(--muted2)",maxWidth:"480px",margin:"0 auto 48px",lineHeight:1.9,fontWeight:300}}>
          4 ประเภทพันธมิตร — เลือกบทบาทที่เหมาะกับคุณ<br/>
          ทุกฝ่ายได้ประโยชน์ร่วมกันในระบบนิเวศเดียว
        </p>

        {/* STATS */}
        <div style={{display:"inline-flex",border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden",marginBottom:"56px"}}>
          {[["4,200+","พันธมิตรขาย"],["300+","สินค้าในระบบ"],["35%","Commission Rate"],["฿2.4M+","จ่ายไปแล้ว"]].map(([v,l], i, arr)=>(
            <div key={l} style={{padding:"16px 24px",textAlign:"center",borderRight: i < arr.length-1 ? "1px solid var(--border)":"none"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:700,color:"var(--gold)"}}>{v}</div>
              <div className="tag" style={{marginTop:"4px",display:"block"}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 4 PARTNER CARDS */}
      <section style={{maxWidth:"960px",margin:"0 auto",padding:"0 24px 80px"}}>
        <div className="divider"><div className="divider-line"/><div className="divider-label">เลือกประเภทพันธมิตร</div><div className="divider-line"/></div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"16px"}}>
          {PARTNERS.map(p => (
            <div key={p.id} className="card" style={{position:"relative",display:"flex",flexDirection:"column",gap:"0"}}>
              {/* Badge */}
              <div style={{position:"absolute",top:"16px",right:"16px"}}>
                <span className={`badge ${p.badgeCls}`}>{p.badge}</span>
              </div>

              <div style={{fontSize:"32px",marginBottom:"14px"}}>{p.emoji}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:700,marginBottom:"3px",color:p.color}}>{p.title}</div>
              <div className="tag" style={{marginBottom:"14px",display:"block"}}>{p.en}</div>
              <p style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.8,marginBottom:"20px",fontWeight:300}}>{p.desc}</p>

              <ul style={{listStyle:"none",padding:0,margin:"0 0 24px",display:"flex",flexDirection:"column",gap:"7px",flex:1}}>
                {p.perks.map(perk => (
                  <li key={perk} style={{fontSize:"12px",color:"var(--text)",display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{color:p.color,fontSize:"10px"}}>✦</span>{perk}
                  </li>
                ))}
              </ul>

              {p.href ? (
                <Link href={p.href} className="btn-ghost btn-full" style={{borderColor:p.color+"44",color:p.color,textAlign:"center"}}>
                  {p.cta} →
                </Link>
              ) : (
                <button
                  className="btn-gold btn-full"
                  style={{fontSize:"13px",padding:"11px"}}
                  onClick={() => openModal("register")}>
                  {p.cta} →
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{maxWidth:"700px",margin:"0 auto",padding:"0 24px 80px",textAlign:"center",borderTop:"1px solid var(--border)"}}>
        <div className="divider"><div className="divider-line"/><div className="divider-label">พันธมิตรขาย — เริ่มทำเงินใน 3 ขั้น</div><div className="divider-line"/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px"}}>
          {[["01","สมัครฟรี","กรอกชื่อ อีเมล รหัสผ่าน ยืนยันอีเมล ได้ลิงก์ทันที"],
            ["02","แชร์ลิงก์","โพสต์ TikTok, Facebook, LINE — ที่ไหนก็ได้"],
            ["03","รับเงิน","มีคนคลิกและซื้อ = commission เข้าอัตโนมัติ"],
          ].map(([n,t,d])=>(
            <div key={n} style={{padding:"22px 14px",border:"1px solid var(--border)",borderRadius:"3px",background:"var(--surface)"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"var(--gold)",letterSpacing:"2px",marginBottom:"10px"}}>{n}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",fontWeight:600,marginBottom:"8px"}}>{t}</div>
              <div style={{fontSize:"12px",color:"var(--muted2)",lineHeight:1.7}}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:"28px",display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
          <button className="btn-gold" style={{fontSize:"16px",padding:"13px 40px"}} onClick={() => openModal("register")}>
            ✦ เริ่มต้นฟรี — พันธมิตรขาย
          </button>
          <button className="btn-ghost" onClick={() => openModal("login")}>มีบัญชีแล้ว →</button>
        </div>
      </section>

      {/* AUTH MODAL */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(3,4,7,0.9)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
             onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div style={{background:"var(--base)",border:"1px solid var(--border2)",borderRadius:"4px",padding:"40px",width:"100%",maxWidth:"420px",position:"relative",animation:"fadeUp 0.3s ease"}}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <button onClick={()=>setModal(null)} style={{position:"absolute",top:"16px",right:"20px",background:"none",border:"none",color:"var(--muted2)",fontSize:"18px",cursor:"pointer"}}>✕</button>

            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"26px",fontWeight:600,marginBottom:"4px"}}>
              {modal==="register" ? "สมัคร — พันธมิตรขาย" : "เข้าสู่ระบบ"}
            </div>
            <div style={{fontSize:"13px",color:"var(--muted2)",marginBottom:"28px",lineHeight:1.6}}>
              {modal==="register" ? "เริ่มรับ commission ได้ทันที — ฟรีตลอดชีพ" : "ยินดีต้อนรับกลับ — รายได้ของคุณรอคุณอยู่"}
            </div>

            {modal==="register" && (
              <div className="form-group">
                <label className="form-label">ชื่อ-นามสกุล</label>
                <input placeholder="สมชาย ใจดี" value={form.name} onChange={e=>set("name",e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleRegister()}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">อีเมล</label>
              <input type="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)} onKeyDown={e=>e.key==="Enter"&&(modal==="login"?handleLogin():handleRegister())}/>
            </div>
            <div className="form-group">
              <label className="form-label">รหัสผ่าน</label>
              <input type="password" placeholder={modal==="register"?"อย่างน้อย 6 ตัวอักษร":"รหัสผ่าน"} value={form.password} onChange={e=>set("password",e.target.value)} onKeyDown={e=>e.key==="Enter"&&(modal==="login"?handleLogin():handleRegister())}/>
            </div>

            {err && <div className="form-error" style={{marginBottom:"14px"}}>{err}</div>}

            <button className="btn-gold btn-full" disabled={loading} onClick={modal==="register"?handleRegister:handleLogin}>
              {loading ? "กำลังดำเนินการ..." : modal==="register" ? "✦ สมัครและเริ่มทำเงิน" : "✦ เข้าสู่ระบบ"}
            </button>
            <div style={{textAlign:"center",marginTop:"18px",fontSize:"13px",color:"var(--muted2)"}}>
              {modal==="register"
                ? <>มีบัญชีแล้ว? <button onClick={()=>openModal("login")} style={{background:"none",border:"none",color:"var(--gold)",cursor:"pointer",fontSize:"13px",fontFamily:"'Sarabun',sans-serif"}}>เข้าสู่ระบบ</button></>
                : <>ยังไม่มีบัญชี? <button onClick={()=>openModal("register")} style={{background:"none",border:"none",color:"var(--gold)",cursor:"pointer",fontSize:"13px",fontFamily:"'Sarabun',sans-serif"}}>สมัครฟรี</button></>
              }
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PartnerHub() {
  return (
    <Suspense fallback={null}>
      <HubContent />
    </Suspense>
  );
}
