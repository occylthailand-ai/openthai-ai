"use client";
// app/content-partner/page.tsx — พันธมิตรคอนเทนต์ (Content Partner)
import { useState } from "react";
import Link from "next/link";

const BENEFITS = [
  {icon:"🎬",t:"Pro Account ฟรี",d:"ใช้งาน Openthai.ai Pro (฿149/เดือน) ฟรีตลอดระยะเวลาความร่วมมือ"},
  {icon:"✨",t:"Co-create Content",d:"ร่วมสร้าง case study, tutorial และ showcase ของคุณบนช่องทาง Openthai.ai"},
  {icon:"📢",t:"Featured ในแพลตฟอร์ม",d:"โปรไฟล์ของคุณปรากฏในหน้า Featured Partners — เพิ่ม reach ให้กับช่องทางคุณ"},
  {icon:"💵",t:"Brand Collab Fee",d:"รับค่าตอบแทนสำหรับงาน review, tutorial หรือ sponsored content ตามที่ตกลง"},
  {icon:"🔗",t:"Exclusive Affiliate Rate",d:"ได้ rate พิเศษสูงกว่า Affiliate ทั่วไป สำหรับการแนะนำผู้ใช้ใหม่"},
  {icon:"🎁",t:"Early Access + Merch",d:"ได้รับ merchandise Openthai.ai และทดลอง feature ก่อน public launch"},
];

const TIERS = [
  { name:"Nano",   followers:"1K–10K",   channel:"TikTok / IG / YouTube",  fee:"฿500–2,000/งาน",  color:"var(--muted2)" },
  { name:"Micro",  followers:"10K–100K", channel:"ทุกช่องทาง",              fee:"฿2,000–10,000/งาน",color:"var(--gold)",  highlight:true },
  { name:"Macro",  followers:"100K+",    channel:"ทุกช่องทาง + Media",      fee:"ติดต่อเรา",         color:"var(--green)" },
];

export default function ContentPartnerPage() {
  const [form, setForm] = useState({
    name:"", email:"", platform:"", followers:"", channel_url:"", content_type:"", collab_idea:"",
  });
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [err,     setErr]     = useState("");

  const set = (k: string, v: string) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit() {
    if (!form.name || !form.email || !form.channel_url) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    setErr(""); setLoading(true);
    try {
      const res = await fetch("/api/content-partner/apply", {
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
          <Link href="/"           className="nav-link">← กลับ</Link>
          <Link href="/producer"   className="nav-link">ผู้ผลิต</Link>
          <Link href="/api-partner"className="nav-link">นักพัฒนา</Link>
        </div>
        <span className="badge badge-gold">รับสมัคร</span>
      </nav>

      <main style={{padding:"56px 0 80px"}}>
        <div className="wrap">

          {/* HERO */}
          <div style={{textAlign:"center",marginBottom:"56px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"18px"}}>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
              <span className="tag">Content Partner Program</span>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
            </div>
            <div style={{fontSize:"40px",marginBottom:"12px"}}>🎬</div>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(32px,5vw,54px)",fontWeight:300,marginBottom:"10px"}}>
              <em style={{fontStyle:"italic",color:"#F472B6",fontWeight:600}}>พันธมิตรคอนเทนต์</em>
            </h1>
            <p style={{fontSize:"15px",color:"var(--muted2)",maxWidth:"500px",margin:"0 auto",lineHeight:1.9}}>
              Influencer · Blogger · YouTuber · นักรีวิว<br/>
              ร่วมสร้างแบรนด์ Openthai.ai ให้ถึงคนไทยทั่วประเทศ
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

          {/* TIERS */}
          <div className="divider"><div className="divider-line"/><div className="divider-label">ระดับพันธมิตรคอนเทนต์</div><div className="divider-line"/></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",marginBottom:"56px"}}>
            {TIERS.map(t => (
              <div key={t.name} className="card" style={{
                textAlign:"center",
                border: t.highlight ? `1px solid ${t.color}` : "1px solid var(--border)",
                boxShadow: t.highlight ? `0 0 28px ${t.color}18` : "none",
              }}>
                {t.highlight && <div className="tag" style={{color:t.color,display:"block",marginBottom:"8px"}}>ที่นิยมที่สุด</div>}
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"22px",fontWeight:700,color:t.color,marginBottom:"4px"}}>{t.name}</div>
                <div style={{fontSize:"13px",color:"var(--muted2)",lineHeight:2}}>
                  <div>Followers: <span style={{color:"var(--text)"}}>{t.followers}</span></div>
                  <div>ช่องทาง: <span style={{color:"var(--text)"}}>{t.channel}</span></div>
                  <div>ค่าตอบแทน: <span style={{color:t.color,fontWeight:600}}>{t.fee}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* APPLICATION FORM */}
          <div style={{maxWidth:"600px",margin:"0 auto"}}>
            <div className="card">
              <div className="card-head">ยื่นใบสมัคร — พันธมิตรคอนเทนต์</div>

              {done ? (
                <div style={{textAlign:"center",padding:"32px 0"}}>
                  <div style={{fontSize:"40px",marginBottom:"16px"}}>🎬</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:600,color:"#F472B6",marginBottom:"10px"}}>
                    ส่งใบสมัครแล้ว!
                  </div>
                  <p style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.8}}>
                    ทีม Partnership จะตรวจสอบช่องทางของคุณและติดต่อกลับ<br/>
                    ภายใน 3–5 วันทำการ ทาง {form.email}
                  </p>
                  <Link href="/" className="btn-ghost" style={{marginTop:"24px",display:"inline-block"}}>
                    ← กลับหน้าหลัก
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                    <div className="form-group">
                      <label className="form-label">ชื่อ / ชื่อในวงการ *</label>
                      <input placeholder="@yourname" value={form.name} onChange={e=>set("name",e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">อีเมลติดต่อ *</label>
                      <input type="email" placeholder="you@email.com" value={form.email} onChange={e=>set("email",e.target.value)}/>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}>
                    <div className="form-group">
                      <label className="form-label">Platform หลัก</label>
                      <select value={form.platform} onChange={e=>set("platform",e.target.value)}
                        style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"2px",color:"var(--text)",fontSize:"14px",outline:"none"}}>
                        <option value="">เลือก...</option>
                        {["TikTok","YouTube","Instagram","Facebook","Blog/Website","Podcast","อื่นๆ"].map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">จำนวน Followers/Subscribers</label>
                      <input placeholder="เช่น 50,000" value={form.followers} onChange={e=>set("followers",e.target.value)}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ลิงก์ช่องทาง * (TikTok / YouTube / IG / Blog)</label>
                    <input placeholder="https://www.tiktok.com/@yourname" value={form.channel_url} onChange={e=>set("channel_url",e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ประเภทคอนเทนต์ที่ทำ</label>
                    <input placeholder="เช่น รีวิวสินค้า, tutorial, ไลฟ์สไตล์, การตลาด..." value={form.content_type} onChange={e=>set("content_type",e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ไอเดียความร่วมมือที่สนใจ</label>
                    <textarea rows={3} placeholder="เช่น: อยากทำวิดีโอ tutorial การใช้ AI สร้างสคริปต์ TikTok..." value={form.collab_idea} onChange={e=>set("collab_idea",e.target.value)}
                      style={{width:"100%",padding:"12px 16px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"2px",color:"var(--text)",fontSize:"14px",resize:"vertical",fontFamily:"'Sarabun',sans-serif",outline:"none"}}/>
                  </div>
                  {err && <div className="form-error" style={{marginBottom:"14px"}}>{err}</div>}
                  <button className="btn-gold btn-full" disabled={loading} onClick={handleSubmit}
                    style={{fontSize:"14px",padding:"13px",borderColor:"#F472B6",color:"#F472B6",background:"rgba(244,114,182,0.06)"}}>
                    {loading ? "กำลังส่ง..." : "🎬 ยื่นใบสมัคร Content Partner"}
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
