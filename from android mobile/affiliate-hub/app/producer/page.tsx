"use client";
// app/producer/page.tsx — Producer Landing + Auth Modal
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  "อาหารและเครื่องดื่ม","ความงามและสุขภาพ","แฟชั่นและเสื้อผ้า","อิเล็กทรอนิกส์",
  "บ้านและสวน","กีฬาและฟิตเนส","หนังสือและการศึกษา","ซอฟต์แวร์และดิจิทัล","อื่น ๆ",
];

function ProducerContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [modal, setModal]   = useState<"login"|"register"|null>(
    params.get("auth") === "login" ? "login" : null
  );
  const [step,  setStep]    = useState(1); // register: step 1 = account, step 2 = company
  const [form,  setForm]    = useState({
    email:"", password:"", contact_name:"", company:"",
    phone:"", website:"", category:"", description:"",
  });
  const [err,     setErr]   = useState("");
  const [info,    setInfo]  = useState("");
  const [loading, setLoad]  = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleRegister() {
    setErr(""); setLoad(true);
    try {
      const res = await fetch("/api/producer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "เกิดข้อผิดพลาด"); return; }
      setModal(null);
      setInfo("✦ สมัครสำเร็จ — กรุณารอการอนุมัติจากแอดมิน (1-2 วันทำการ)");
    } catch (e: any) { setErr(e.message); }
    finally { setLoad(false); }
  }

  async function handleLogin() {
    setErr(""); setLoad(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      });
      if (error) { setErr(error.message); return; }
      router.push("/producer/dashboard");
    } catch (e: any) { setErr(e.message); }
    finally { setLoad(false); }
  }

  function openModal(type: "login"|"register") {
    setModal(type); setStep(1); setErr(""); setInfo("");
    setForm({ email:"", password:"", contact_name:"", company:"", phone:"", website:"", category:"", description:"" });
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <Link href="/" className="nav-logo"><span className="nav-dot"/>พันธมิตร Hub</Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">← กลับ</Link>
          <button className="nav-link" onClick={() => openModal("login")}>เข้าสู่ระบบ</button>
        </div>
        <button className="btn-gold" style={{ padding:"9px 22px", fontSize:"14px" }} onClick={() => openModal("register")}>
          นำสินค้าเข้าแพลตฟอร์ม
        </button>
      </nav>

      {info && <div className="toast">{info}</div>}

      {/* HERO */}
      <section style={{ textAlign:"center", padding:"80px 24px 64px" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:"10px", border:"1px solid var(--border2)", borderRadius:"2px", padding:"6px 20px", marginBottom:"32px" }}>
          <span className="live-dot"/>
          <span className="tag">สำหรับผู้ผลิตและแบรนด์</span>
        </div>

        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(36px,6vw,68px)", fontWeight:300, lineHeight:1.1, marginBottom:"10px" }}>
          ให้<em style={{ fontStyle:"italic", color:"var(--gold)", fontWeight:600 }}>นักการตลาด<br/>หลายพันคน</em> ขายให้คุณ
        </h1>
        <p style={{ fontSize:"16px", color:"var(--muted2)", maxWidth:"480px", margin:"18px auto 48px", lineHeight:1.8, fontWeight:300 }}>
          นำสินค้าเข้าแพลตฟอร์ม Affiliate Hub<br/>
          เครือข่าย Affiliate จะแชร์ให้ถึงลูกค้าทั่วประเทศ<br/>
          คุณจ่าย commission เฉพาะเมื่อมียอดขายจริง
        </p>

        <div style={{ display:"flex", gap:"14px", justifyContent:"center", flexWrap:"wrap" }}>
          <button className="btn-gold" style={{ fontSize:"17px", padding:"14px 44px" }} onClick={() => openModal("register")}>
            ✦ ลงทะเบียนผู้ผลิต
          </button>
          <button className="btn-ghost" onClick={() => openModal("login")}>
            มีบัญชีแล้ว →
          </button>
        </div>
      </section>

      {/* STATS */}
      <section style={{ maxWidth:"600px", margin:"0 auto", padding:"0 24px 64px" }}>
        <div style={{ display:"flex", border:"1px solid var(--border)", borderRadius:"3px", overflow:"hidden" }}>
          {[["4,200+","Affiliate พร้อมขาย"],["35%","Commission จ่ายเมื่อขายได้"],["฿0","ค่าธรรมเนียมตั้งต้น"]].map(([v,l]) => (
            <div key={l} style={{ flex:1, padding:"24px 16px", textAlign:"center", borderRight:"1px solid var(--border)" }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"30px", fontWeight:700, color:"var(--gold)" }}>{v}</div>
              <div className="tag" style={{ marginTop:"6px", display:"block" }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth:"860px", margin:"0 auto", padding:"0 24px 80px" }}>
        <div className="divider"><div className="divider-line"/><div className="divider-label">วิธีการทำงาน</div><div className="divider-line"/></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"16px" }}>
          {[
            ["01","สมัครและรอการอนุมัติ","แอดมินตรวจสอบข้อมูลบริษัทและสินค้าภายใน 1-2 วัน"],
            ["02","ลงสินค้า","เพิ่มรายละเอียดสินค้า ราคา รูปภาพ และ commission rate"],
            ["03","Affiliate แชร์สินค้า","เครือข่าย Affiliate จะเริ่มแชร์ลิงก์ของคุณ"],
            ["04","รับยอดขาย จ่าย Commission","ระบบคิด commission อัตโนมัติ ติดตามได้ real-time"],
          ].map(([n,t,d]) => (
            <div key={n} style={{ padding:"24px 16px", border:"1px solid var(--border)", borderRadius:"3px", background:"var(--surface)" }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:"11px", color:"var(--gold)", letterSpacing:"2px", marginBottom:"12px" }}>{n}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"17px", fontWeight:600, marginBottom:"8px" }}>{t}</div>
              <div style={{ fontSize:"12px", color:"var(--muted2)", lineHeight:1.7 }}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS */}
      <section style={{ maxWidth:"860px", margin:"0 auto", padding:"0 24px 80px" }}>
        <div className="divider"><div className="divider-line"/><div className="divider-label">ทำไมต้องเลือก Affiliate Hub</div><div className="divider-line"/></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:"16px" }}>
          {[
            { icon:"🏭", t:"ไม่มีค่าธรรมเนียมแรกเข้า", d:"เริ่มต้นฟรี จ่ายเฉพาะ commission เมื่อมียอดขายจริง ไม่มีค่าใช้จ่ายซ่อนเร้น" },
            { icon:"📊", t:"Dashboard ติดตามได้ทุกอย่าง", d:"เห็น click ยอดขาย commission รายสินค้า รายวัน แบบ real-time" },
            { icon:"🔗", t:"เครือข่าย Affiliate ครบ", d:"เข้าถึง Affiliate กว่า 4,200+ คนทันที ที่พร้อมแชร์สินค้าของคุณ" },
            { icon:"⚙️", t:"ตั้ง Commission Rate เอง", d:"กำหนด commission rate ต่อสินค้าได้ ยืดหยุ่นสูงสุด" },
            { icon:"✉️", t:"แจ้งเตือนยอดขายทันที", d:"รับแจ้งเตือนทุกครั้งมี commission เข้า ไม่พลาดแม้แต่บาทเดียว" },
            { icon:"🛡️", t:"ระบบตรวจสอบคุณภาพ", d:"ทีมแอดมินตรวจสินค้าก่อนเผยแพร่ ดูแลมาตรฐานแพลตฟอร์ม" },
          ].map(f => (
            <div key={f.t} className="card">
              <div style={{ fontSize:"24px", marginBottom:"12px" }}>{f.icon}</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", fontWeight:600, marginBottom:"8px" }}>{f.t}</div>
              <div style={{ fontSize:"13px", color:"var(--muted2)", lineHeight:1.7, fontWeight:300 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ textAlign:"center", padding:"48px 24px 80px", borderTop:"1px solid var(--border)" }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"32px", fontWeight:300, marginBottom:"20px" }}>
          พร้อมนำสินค้าของคุณสู่<em style={{ fontStyle:"italic", color:"var(--gold)", fontWeight:600 }}>ตลาดใหญ่</em>?
        </div>
        <button className="btn-gold" style={{ fontSize:"17px", padding:"15px 48px" }} onClick={() => openModal("register")}>
          ✦ ลงทะเบียนผู้ผลิต — ฟรี
        </button>
      </section>

      {/* AUTH MODAL */}
      {modal && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(3,4,7,0.9)", backdropFilter:"blur(8px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{ background:"var(--base)", border:"1px solid var(--border2)", borderRadius:"4px", padding:"40px", width:"100%", maxWidth:"480px", position:"relative", animation:"fadeUp 0.3s ease", maxHeight:"90vh", overflowY:"auto" }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <button onClick={() => setModal(null)} style={{ position:"absolute", top:"16px", right:"20px", background:"none", border:"none", color:"var(--muted2)", fontSize:"18px", cursor:"pointer" }}>✕</button>

            {modal === "login" ? (
              <>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"26px", fontWeight:600, marginBottom:"6px" }}>เข้าสู่ระบบ Producer</div>
                <div style={{ fontSize:"13px", color:"var(--muted2)", marginBottom:"32px" }}>ยินดีต้อนรับกลับมา — ดูยอดขายและจัดการสินค้าของคุณ</div>

                <div className="form-group">
                  <label className="form-label">อีเมล</label>
                  <input type="email" placeholder="you@company.com" value={form.email} onChange={e => set("email", e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}/>
                </div>
                <div className="form-group">
                  <label className="form-label">รหัสผ่าน</label>
                  <input type="password" placeholder="รหัสผ่าน" value={form.password} onChange={e => set("password", e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}/>
                </div>

                {err && <div className="form-error" style={{ marginBottom:"14px" }}>{err}</div>}

                <button className="btn-gold btn-full" disabled={loading} onClick={handleLogin}>
                  {loading ? "กำลังเข้าสู่ระบบ..." : "✦ เข้าสู่ระบบ"}
                </button>
                <div style={{ textAlign:"center", marginTop:"20px", fontSize:"13px", color:"var(--muted2)" }}>
                  ยังไม่มีบัญชี?{" "}
                  <button onClick={() => openModal("register")} style={{ background:"none", border:"none", color:"var(--gold)", cursor:"pointer", fontSize:"13px", fontFamily:"'Sarabun',sans-serif" }}>ลงทะเบียน</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"26px", fontWeight:600, marginBottom:"6px" }}>ลงทะเบียนผู้ผลิต</div>
                <div style={{ fontSize:"13px", color:"var(--muted2)", marginBottom:"8px" }}>
                  {step === 1 ? "ขั้นตอน 1/2 — ข้อมูลบัญชี" : "ขั้นตอน 2/2 — ข้อมูลบริษัท"}
                </div>

                {/* Step progress */}
                <div style={{ display:"flex", gap:"8px", marginBottom:"28px" }}>
                  {[1,2].map(s => (
                    <div key={s} style={{ flex:1, height:"3px", borderRadius:"2px", background: s <= step ? "var(--gold)" : "var(--border2)" }}/>
                  ))}
                </div>

                {step === 1 && (
                  <>
                    <div className="form-group">
                      <label className="form-label">อีเมลบริษัท</label>
                      <input type="email" placeholder="contact@company.com" value={form.email} onChange={e => set("email", e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">รหัสผ่าน</label>
                      <input type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={form.password} onChange={e => set("password", e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ชื่อผู้ติดต่อ</label>
                      <input placeholder="สมชาย ใจดี" value={form.contact_name} onChange={e => set("contact_name", e.target.value)}/>
                    </div>

                    {err && <div className="form-error" style={{ marginBottom:"14px" }}>{err}</div>}

                    <button className="btn-gold btn-full"
                      onClick={() => {
                        if (!form.email || !form.password || !form.contact_name) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
                        setErr(""); setStep(2);
                      }}>
                      ถัดไป →
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="form-group">
                      <label className="form-label">ชื่อบริษัท / แบรนด์</label>
                      <input placeholder="บริษัท XYZ จำกัด" value={form.company} onChange={e => set("company", e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">เบอร์โทรศัพท์</label>
                      <input type="tel" placeholder="0812345678" value={form.phone} onChange={e => set("phone", e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">เว็บไซต์ (ถ้ามี)</label>
                      <input type="url" placeholder="https://yourcompany.com" value={form.website} onChange={e => set("website", e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">หมวดหมู่สินค้าหลัก</label>
                      <select value={form.category} onChange={e => set("category", e.target.value)}
                        style={{ width:"100%", background:"var(--input)", border:"1px solid var(--border2)", borderRadius:"2px", padding:"10px 14px", color:"var(--text)", fontSize:"14px" }}>
                        <option value="">-- เลือกหมวดหมู่ --</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">แนะนำสินค้า / แบรนด์ (ไม่บังคับ)</label>
                      <textarea placeholder="เล่าให้เราฟังเกี่ยวกับสินค้าและแบรนด์ของคุณ..."
                        value={form.description} onChange={e => set("description", e.target.value)}
                        style={{ width:"100%", minHeight:"80px", background:"var(--input)", border:"1px solid var(--border2)", borderRadius:"2px", padding:"10px 14px", color:"var(--text)", fontSize:"14px", resize:"vertical", fontFamily:"'Sarabun',sans-serif" }}/>
                    </div>

                    {err && <div className="form-error" style={{ marginBottom:"14px" }}>{err}</div>}

                    <div style={{ display:"flex", gap:"10px" }}>
                      <button className="btn-ghost" style={{ flex:1 }} onClick={() => { setErr(""); setStep(1); }}>← ย้อนกลับ</button>
                      <button className="btn-gold" style={{ flex:2 }} disabled={loading} onClick={handleRegister}>
                        {loading ? "กำลังส่งข้อมูล..." : "✦ ส่งคำขอลงทะเบียน"}
                      </button>
                    </div>
                  </>
                )}

                <div style={{ textAlign:"center", marginTop:"20px", fontSize:"13px", color:"var(--muted2)" }}>
                  มีบัญชีแล้ว?{" "}
                  <button onClick={() => openModal("login")} style={{ background:"none", border:"none", color:"var(--gold)", cursor:"pointer", fontSize:"13px", fontFamily:"'Sarabun',sans-serif" }}>เข้าสู่ระบบ</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function ProducerPage() {
  return (
    <Suspense fallback={null}>
      <ProducerContent />
    </Suspense>
  );
}
