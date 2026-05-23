"use client";
// app/page.tsx — Landing + Auth Modal
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp } from "@/lib/auth";

export default function LandingPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const [modal, setModal]   = useState<"login"|"register"|null>(
    params.get("auth") === "login" ? "login" : null
  );
  const [form,  setForm]    = useState({ name:"", email:"", password:"" });
  const [err,   setErr]     = useState("");
  const [info,  setInfo]    = useState("");
  const [loading,setLoading]= useState(false);

  const set = (k: string, v: string) => setForm(f => ({...f,[k]:v}));

  async function handleRegister() {
    setErr(""); setLoading(true);
    try {
      await signUp(form.name, form.email, form.password);
      setModal(null);
      setInfo("✦ สมัครสำเร็จ — กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
    } catch(e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  async function handleLogin() {
    setErr(""); setLoading(true);
    try {
      await signIn(form.email, form.password);
      router.push("/dashboard");
    } catch(e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function openModal(type: "login"|"register") {
    setModal(type); setErr(""); setInfo(""); setForm({name:"",email:"",password:""});
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <span className="nav-logo"><span className="nav-dot"/>Affiliate Hub</span>
        <div className="nav-links">
          <button className="nav-link" onClick={()=>openModal("login")}>Login</button>
        </div>
        <button className="btn-gold" style={{padding:"9px 22px",fontSize:"14px"}} onClick={()=>openModal("register")}>
          เริ่มต้นฟรี
        </button>
      </nav>

      {/* INFO TOAST */}
      {info && <div className="toast">{info}</div>}

      {/* HERO */}
      <section style={{textAlign:"center",padding:"80px 24px 64px"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"10px",border:"1px solid var(--border2)",borderRadius:"2px",padding:"6px 20px",marginBottom:"32px"}}>
          <span className="live-dot"/>
          <span className="tag">Live · {Math.floor(Math.random()*50+200)} คนออนไลน์</span>
        </div>

        <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(40px,7vw,72px)",fontWeight:300,lineHeight:1.1,marginBottom:"10px"}}>
          รายได้ที่<em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>ทำงาน<br/>แทนคุณ</em> ตลอด 24 ชม.
        </h1>
        <p style={{fontSize:"16px",color:"var(--muted2)",maxWidth:"460px",margin:"18px auto 48px",lineHeight:1.8,fontWeight:300}}>
          แชร์ลิงก์ครั้งเดียว รับ commission 35%<br/>
          ทุกครั้งที่มีคนซื้อ — โอน PromptPay อัตโนมัติ
        </p>

        <div style={{display:"flex",gap:"14px",justifyContent:"center",flexWrap:"wrap"}}>
          <button className="btn-gold" style={{fontSize:"17px",padding:"14px 44px"}} onClick={()=>openModal("register")}>
            ✦ สมัครฟรี — เริ่มทำเงิน
          </button>
          <button className="btn-ghost" onClick={()=>openModal("login")}>
            มีบัญชีแล้ว →
          </button>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{maxWidth:"600px",margin:"0 auto",padding:"0 24px 64px"}}>
        <div style={{display:"flex",border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
          {[["฿2.4M+","จ่าย commission แล้ว"],["4,200+","Affiliate ทั่วประเทศ"],["35%","Commission Rate"]].map(([v,l])=>(
            <div key={l} style={{flex:1,padding:"24px 16px",textAlign:"center",borderRight:"1px solid var(--border)"}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"30px",fontWeight:700,color:"var(--gold)"}}>{v}</div>
              <div className="tag" style={{marginTop:"6px",display:"block"}}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{maxWidth:"860px",margin:"0 auto",padding:"0 24px 80px"}}>
        <div className="divider"><div className="divider-line"/><div className="divider-label">ทำไมต้อง Affiliate Hub</div><div className="divider-line"/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:"16px"}}>
          {[
            {icon:"🔗",t:"ลิงก์ส่วนตัว",d:"ลิงก์ unique เฉพาะคุณ ติดตาม click และยอดขายได้ real-time"},
            {icon:"💰",t:"Commission 35%",d:"รับสูงสุด 35% ทุกยอดขาย ไม่จำกัดจำนวน ไม่มีวันหมดอายุ"},
            {icon:"📱",t:"PromptPay อัตโนมัติ",d:"ถอนเงินเข้า PromptPay หรือโอนธนาคาร ภายใน 24 ชั่วโมง"},
            {icon:"📊",t:"Dashboard Real-time",d:"เห็นทุก click ทุก commission ทุกยอดรวม — อัปเดตทันที"},
            {icon:"📧",t:"แจ้งเตือนทันที",d:"รับอีเมลทุกครั้งที่มี commission เข้า ไม่พลาดแม้แต่บาทเดียว"},
            {icon:"🏆",t:"ระบบ Level",d:"ยิ่งทำมาก ยิ่งขึ้น Level Silver → Gold → Platinum"},
          ].map(f=>(
            <div key={f.t} className="card">
              <div style={{fontSize:"24px",marginBottom:"12px"}}>{f.icon}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:600,marginBottom:"8px"}}>{f.t}</div>
              <div style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.7,fontWeight:300}}>{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{maxWidth:"700px",margin:"0 auto",padding:"0 24px 80px",textAlign:"center"}}>
        <div className="divider"><div className="divider-line"/><div className="divider-label">วิธีทำเงิน</div><div className="divider-line"/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",marginTop:"8px"}}>
          {[["01","สมัครฟรี","กรอกชื่อ อีเมล รหัสผ่าน ยืนยันอีเมล ได้ลิงก์ทันที"],
            ["02","แชร์ลิงก์","โพสต์ใน TikTok, Facebook, Line — ที่ไหนก็ได้"],
            ["03","รับเงิน","มีคนคลิกและซื้อ = commission เข้าอัตโนมัติ"],
          ].map(([n,t,d])=>(
            <div key={n} style={{padding:"24px 16px",border:"1px solid var(--border)",borderRadius:"3px",background:"var(--surface)"}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"var(--gold)",letterSpacing:"2px",marginBottom:"12px"}}>{n}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",fontWeight:600,marginBottom:"8px"}}>{t}</div>
              <div style={{fontSize:"12px",color:"var(--muted2)",lineHeight:1.7}}>{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section style={{textAlign:"center",padding:"48px 24px 80px",borderTop:"1px solid var(--border)"}}>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:300,marginBottom:"20px"}}>
          พร้อมเริ่มทำเงิน<em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>วันนี้</em>?
        </div>
        <button className="btn-gold" style={{fontSize:"17px",padding:"15px 48px"}} onClick={()=>openModal("register")}>
          ✦ สมัครฟรี ใช้เวลา 60 วินาที
        </button>
      </section>

      {/* AUTH MODAL */}
      {modal && (
        <div style={{position:"fixed",inset:0,background:"rgba(3,4,7,0.9)",backdropFilter:"blur(8px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
             onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div style={{background:"var(--base)",border:"1px solid var(--border2)",borderRadius:"4px",padding:"40px",width:"100%",maxWidth:"420px",position:"relative",animation:"fadeUp 0.3s ease"}}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

            <button onClick={()=>setModal(null)} style={{position:"absolute",top:"16px",right:"20px",background:"none",border:"none",color:"var(--muted2)",fontSize:"18px",cursor:"pointer",lineHeight:1}}>✕</button>

            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"26px",fontWeight:600,marginBottom:"6px"}}>
              {modal==="register" ? "สร้างบัญชี" : "เข้าสู่ระบบ"}
            </div>
            <div style={{fontSize:"13px",color:"var(--muted2)",marginBottom:"32px",lineHeight:1.6}}>
              {modal==="register" ? "เริ่มรับ commission ได้ทันที — ฟรีตลอดชีพ" : "ยินดีต้อนรับกลับมา — รายได้ของคุณรอคุณอยู่"}
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

            <button className="btn-gold btn-full" disabled={loading}
              onClick={modal==="register"?handleRegister:handleLogin}>
              {loading ? "กำลังดำเนินการ..." : modal==="register" ? "✦ สมัครและเริ่มทำเงิน" : "✦ เข้าสู่ระบบ"}
            </button>

            <div style={{textAlign:"center",marginTop:"20px",fontSize:"13px",color:"var(--muted2)"}}>
              {modal==="register" ? <>มีบัญชีแล้ว? <button onClick={()=>openModal("login")} style={{background:"none",border:"none",color:"var(--gold)",cursor:"pointer",fontSize:"13px",fontFamily:"'Sarabun',sans-serif"}}>เข้าสู่ระบบ</button></> : <>ยังไม่มีบัญชี? <button onClick={()=>openModal("register")} style={{background:"none",border:"none",color:"var(--gold)",cursor:"pointer",fontSize:"13px",fontFamily:"'Sarabun',sans-serif"}}>สมัครฟรี</button></>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
