"use client";
// app/api-partner/page.tsx — พันธมิตรนักพัฒนา (API Partner)
import { useState } from "react";
import Link from "next/link";

const PLANS = [
  { name:"Starter",   price:"ราคา Pro",          api:"500 calls/วัน",   share:"ไม่มี",   color:"var(--muted2)" },
  { name:"Growth",    price:"฿999/เดือน",         api:"10,000 calls/วัน",share:"10%",     color:"var(--gold)",   highlight:true },
  { name:"Scale",     price:"ติดต่อเรา",           api:"Unlimited",       share:"15%",     color:"var(--green)" },
];

const BENEFITS = [
  {icon:"⚡",t:"API Access ราคาพิเศษ",d:"เข้าถึง Claude AI สำหรับ TikTok content generation ในราคาพันธมิตร"},
  {icon:"💰",t:"Revenue Share 10–15%",d:"รับส่วนแบ่งรายได้จากผู้ใช้ที่คุณ bring เข้ามา ตลอดอายุการใช้งาน"},
  {icon:"🛠",t:"Technical Support",d:"ทีม tech ช่วย integrate API ตั้งแต่ต้นจนเปิดตัว"},
  {icon:"🚀",t:"Early Access",d:"ได้ทดลอง feature ใหม่ก่อนใคร — อยู่ใน roadmap ก่อน public"},
  {icon:"📊",t:"Analytics Dashboard",d:"เห็น usage, revenue share และ user analytics แบบ real-time"},
  {icon:"🏷",t:"White-label Option",d:"แบบ Scale plan สามารถ brand ด้วยโลโก้ของคุณเองได้"},
];

export default function ApiPartnerPage() {
  const [form,    setForm]    = useState({ name:"", company:"", email:"", website:"", usecase:"", plan:"Growth" });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState("");

  const set = (k: string, v: string) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit() {
    if (!form.name || !form.email || !form.usecase) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/api-partner/register", {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "เกิดข้อผิดพลาด");
      setDone(true);
    } catch(e:any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo"><span className="nav-dot"/>พันธมิตร Hub</Link>
        <div className="nav-links">
          <Link href="/"               className="nav-link">← กลับ</Link>
          <Link href="/producer"       className="nav-link">ผู้ผลิต</Link>
          <Link href="/content-partner"className="nav-link">คอนเทนต์</Link>
        </div>
        <span className="badge badge-gold">เปิดรับจำกัด</span>
      </nav>

      <main style={{padding:"56px 0 80px"}}>
        <div className="wrap">

          {/* HERO */}
          <div style={{textAlign:"center",marginBottom:"56px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"18px"}}>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
              <span className="tag">API Partner Program</span>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
            </div>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>⚡</div>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(32px,5vw,54px)",fontWeight:300,marginBottom:"10px"}}>
              <em style={{fontStyle:"italic",color:"#A78BFA",fontWeight:600}}>พันธมิตรนักพัฒนา</em>
            </h1>
            <p style={{fontSize:"15px",color:"var(--muted2)",maxWidth:"500px",margin:"0 auto",lineHeight:1.9}}>
              Build สินค้า/บริการบน AI ของ Openthai.ai<br/>
              รับ revenue share ทุกเดือนตลอดอายุการใช้งาน
            </p>
          </div>

          {/* BENEFITS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:"16px",marginBottom:"48px"}}>
            {BENEFITS.map(b => (
              <div key={b.t} className="card">
                <div style={{fontSize:"24px",marginBottom:"10px"}}>{b.icon}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",fontWeight:600,marginBottom:"8px"}}>{b.t}</div>
                <div style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.7}}>{b.d}</div>
              </div>
            ))}
          </div>

          {/* PRICING */}
          <div className="divider"><div className="divider-line"/><div className="divider-label">แผนพันธมิตรนักพัฒนา</div><div className="divider-line"/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",marginBottom:"56px"}}>
            {PLANS.map(p => (
              <div key={p.name} className="card" style={{
                textAlign:"center",
                border: p.highlight ? `1px solid ${p.color}` : "1px solid var(--border)",
                boxShadow: p.highlight ? `0 0 28px ${p.color}18` : "none",
              }}>
                {p.highlight && <div className="tag" style={{color:p.color,display:"block",marginBottom:"8px"}}>แนะนำ</div>}
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:700,color:p.color,marginBottom:"4px"}}>{p.name}</div>
                <div style={{fontSize:"16px",fontWeight:600,marginBottom:"16px"}}>{p.price}</div>
                <div style={{fontSize:"13px",color:"var(--muted2)",lineHeight:2}}>
                  <div>API: <span style={{color:"var(--text)"}}>{p.api}</span></div>
                  <div>Revenue Share: <span style={{color:p.share==="ไม่มี"?"var(--muted2)":p.color,fontWeight:600}}>{p.share}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* REGISTRATION FORM */}
          <div style={{maxWidth:"560px",margin:"0 auto"}}>
            <div className="card">
              <div className="card-head">สมัคร API Partner</div>

              {done ? (
                <div style={{textAlign:"center",padding:"32px 0"}}>
                  <div style={{fontSize:"40px",marginBottom:"16px"}}>✦</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:600,color:"var(--gold)",marginBottom:"10px"}}>
                    ส่งใบสมัครแล้ว
                  </div>
                  <p style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.8}}>
                    ทีมงานจะติดต่อกลับภายใน 2–3 วันทำการ<br/>
                    ขอบคุณที่สนใจเป็นพันธมิตรนักพัฒนากับ Openthai.ai
                  </p>
                  <Link href="/" className="btn-ghost" style={{marginTop:"24px",display:"inline-block"}}>
                    ← กลับหน้าหลัก
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                    <div className="form-group">
                      <label className="form-label">ชื่อ-นามสกุล *</label>
                      <input placeholder="สมชาย ใจดี" value={form.name} onChange={e=>set("name",e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">บริษัท / ชื่อ Project</label>
                      <input placeholder="TechCo Ltd." value={form.company} onChange={e=>set("company",e.target.value)}/>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                    <div className="form-group">
                      <label className="form-label">อีเมล *</label>
                      <input type="email" placeholder="dev@company.com" value={form.email} onChange={e=>set("email",e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">เว็บไซต์ / GitHub</label>
                      <input placeholder="https://..." value={form.website} onChange={e=>set("website",e.target.value)}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">แผนที่สนใจ</label>
                    <select value={form.plan} onChange={e=>set("plan",e.target.value)}
                      style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"2px",color:"var(--text)",fontSize:"14px",outline:"none"}}>
                      {PLANS.map(p => <option key={p.name} value={p.name}>{p.name} — {p.price}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">อธิบาย use case ที่ต้องการ build *</label>
                    <textarea rows={4} placeholder="เช่น: ต้องการ build ระบบสร้างสคริปต์ TikTok สำหรับ SME ไทย..." value={form.usecase} onChange={e=>set("usecase",e.target.value)}
                      style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"2px",color:"var(--text)",fontSize:"14px",resize:"vertical",fontFamily:"'Sarabun',sans-serif",outline:"none"}}/>
                  </div>
                  {err && <div className="form-error" style={{marginBottom:"14px"}}>{err}</div>}
                  <button className="btn-gold btn-full" disabled={loading} onClick={handleSubmit}
                    style={{fontSize:"14px",padding:"13px"}}>
                    {loading ? "กำลังส่ง..." : "✦ ส่งใบสมัคร API Partner"}
                  </button>
                </>
              )}
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
