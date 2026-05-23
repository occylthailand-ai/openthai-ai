"use client";
// app/dashboard/withdraw/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { getProfile, getStats, requestWithdraw } from "@/lib/auth";
import { generatePromptPayQR } from "@/lib/promptpay";
import type { User, UserStats } from "@/lib/supabase";
import { BANK_CODES } from "@/lib/promptpay";

type Step = "form" | "confirm" | "success";

const MIN = 100;

const BANKS = Object.entries(BANK_CODES).map(([name, code]) => ({ name, code }));

export default function WithdrawPage() {
  const [profile,  setProfile]  = useState<User | null>(null);
  const [stats,    setStats]    = useState<UserStats | null>(null);
  const [step,     setStep]     = useState<Step>("form");
  const [method,   setMethod]   = useState<"promptpay"|"bank">("promptpay");
  const [dest,     setDest]     = useState("");
  const [bankCode, setBankCode] = useState("KBANK");
  const [amount,   setAmount]   = useState<number | "">("");
  const [qrData,   setQrData]   = useState("");
  const [err,      setErr]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<any>(null);

  useEffect(() => {
    Promise.all([getProfile(), getStats()]).then(([p,s]) => { setProfile(p); setStats(s); });
  }, []);

  const balance = stats?.balance ?? 0;
  const withdrawAmount = amount === "" ? balance : Number(amount);

  async function handleConfirm() {
    setErr("");
    if (!dest) { setErr("กรุณากรอกข้อมูลปลายทาง"); return; }
    if (withdrawAmount < MIN) { setErr(`จำนวนขั้นต่ำ ฿${MIN}`); return; }
    if (withdrawAmount > balance) { setErr("ยอดไม่เพียงพอ"); return; }

    if (method === "promptpay" && dest) {
      try {
        const qr = await generatePromptPayQR(dest, withdrawAmount);
        setQrData(qr);
      } catch {}
    }
    setStep("confirm");
  }

  async function handleSubmit() {
    setLoading(true); setErr("");
    try {
      const res = await requestWithdraw(
        method, dest,
        method === "bank" ? bankCode : undefined,
        withdrawAmount
      );
      setResult(res); setStep("success");
    } catch(e: any) {
      setErr(e.message); setStep("form");
    } finally { setLoading(false); }
  }

  if (!profile?.email_verified) return (
    <>
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo"><span className="nav-dot"/>Affiliate Hub</Link>
      </nav>
      <div style={{textAlign:"center",padding:"80px 24px"}}>
        <div style={{fontSize:"36px",marginBottom:"20px"}}>⚠</div>
        <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",marginBottom:"12px"}}>ยืนยันอีเมลก่อน</div>
        <div style={{color:"var(--muted2)",marginBottom:"28px"}}>กรุณายืนยันอีเมลก่อนถอนเงิน<br/>ตรวจสอบ inbox ของคุณ</div>
        <Link href="/dashboard" className="btn-ghost" style={{display:"inline-block",textDecoration:"none"}}>← กลับ Dashboard</Link>
      </div>
    </>
  );

  return (
    <>
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo"><span className="nav-dot"/>Affiliate Hub</Link>
        <div className="nav-links">
          <Link href="/dashboard"         className="nav-link">Dashboard</Link>
          <Link href="/dashboard/history" className="nav-link">History</Link>
          <Link href="/dashboard/withdraw"className="nav-link active">Withdraw</Link>
        </div>
        <div className="nav-balance">Balance <strong>฿{balance.toLocaleString()}</strong></div>
      </nav>

      <main style={{padding:"40px 0 60px"}}>
        <div className="wrap-sm">

          <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:300,marginBottom:"6px"}}>Withdraw Funds</h1>
          <div style={{fontSize:"13px",color:"var(--muted2)",marginBottom:"36px"}}>ถอนเงินเข้าบัญชีของคุณ</div>

          {/* BALANCE BOX */}
          <div style={{background:"var(--card)",border:"1px solid var(--border2)",borderRadius:"3px",padding:"28px",textAlign:"center",marginBottom:"28px"}}>
            <div className="tag" style={{display:"block",marginBottom:"10px"}}>ยอดที่ถอนได้</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"52px",fontWeight:700,color:"var(--gold)",lineHeight:1}}>฿{balance.toLocaleString()}</div>
            <div style={{fontSize:"12px",color:"var(--muted2)",marginTop:"8px"}}>Commission สะสมที่ยังไม่ได้ถอน</div>
          </div>

          {step === "form" && (
            <>
              {/* METHOD */}
              <div style={{marginBottom:"24px"}}>
                <div className="form-label">ช่องทางการรับเงิน</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  {[{k:"promptpay",icon:"📱",t:"PromptPay"},{k:"bank",icon:"🏦",t:"โอนธนาคาร"}].map(m=>(
                    <div key={m.k}
                      onClick={()=>setMethod(m.k as any)}
                      style={{border:`1px solid ${method===m.k?"var(--border2)":"var(--border)"}`,background:method===m.k?"var(--gold-dim)":"var(--surface)",borderRadius:"2px",padding:"16px",textAlign:"center",cursor:"pointer",transition:"all 0.2s"}}>
                      <div style={{fontSize:"22px",marginBottom:"6px"}}>{m.icon}</div>
                      <div className="tag" style={{color:method===m.k?"var(--gold)":"var(--muted2)"}}>{m.t}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* DESTINATION */}
              {method === "bank" && (
                <div className="form-group">
                  <label className="form-label">ธนาคาร</label>
                  <select value={bankCode} onChange={e=>setBankCode(e.target.value)}
                    style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"2px",padding:"12px 16px",color:"var(--text)",fontFamily:"'Sarabun',sans-serif",fontSize:"14px",outline:"none",marginBottom:"12px"}}>
                    {BANKS.map(b=><option key={b.name} value={b.name}>{b.name}</option>)}
                  </select>
                  <label className="form-label">เลขบัญชี</label>
                  <input placeholder="123-4-56789-0" value={dest} onChange={e=>setDest(e.target.value)}/>
                </div>
              )}

              {method === "promptpay" && (
                <div className="form-group">
                  <label className="form-label">เบอร์โทร / เลขบัตรประชาชน</label>
                  <input placeholder="0812345678 หรือ 1234567890123" value={dest} onChange={e=>setDest(e.target.value)}/>
                </div>
              )}

              {/* AMOUNT */}
              <div className="form-group">
                <label className="form-label">จำนวนเงิน (เว้นว่างเพื่อถอนทั้งหมด)</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",color:"var(--muted2)",fontFamily:"'Sarabun',sans-serif"}}>฿</span>
                  <input
                    type="number" min={MIN} max={balance} step={100}
                    placeholder={`${balance.toLocaleString()} (ทั้งหมด)`}
                    value={amount}
                    onChange={e=>setAmount(e.target.value ? Number(e.target.value) : "")}
                    style={{paddingLeft:"28px"}}
                  />
                </div>
                <div style={{fontSize:"11px",color:"var(--muted2)",marginTop:"6px"}}>ขั้นต่ำ ฿{MIN} · สูงสุด ฿{balance.toLocaleString()}</div>
              </div>

              {err && <div className="form-error" style={{marginBottom:"14px"}}>{err}</div>}

              <button className="btn-gold btn-full" disabled={balance < MIN}
                onClick={handleConfirm} style={{fontSize:"16px",padding:"14px"}}>
                ✦ ยืนยันการถอนเงิน ฿{withdrawAmount.toLocaleString()}
              </button>

              {balance < MIN && (
                <div style={{textAlign:"center",marginTop:"12px",fontSize:"12px",color:"var(--muted2)"}}>
                  ยอดขั้นต่ำในการถอนคือ ฿{MIN.toLocaleString()}
                </div>
              )}
            </>
          )}

          {step === "confirm" && (
            <div style={{border:"1px solid var(--border2)",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{padding:"24px",borderBottom:"1px solid var(--border)"}}>
                <div className="tag" style={{display:"block",marginBottom:"16px"}}>ยืนยันรายละเอียด</div>
                {[
                  ["ช่องทาง", method === "promptpay" ? "PromptPay" : `โอนธนาคาร (${bankCode})`],
                  ["ปลายทาง", dest],
                  ["จำนวน",   `฿${withdrawAmount.toLocaleString()}`],
                  ["ค่าธรรมเนียม", "ฟรี"],
                  ["ระยะเวลา", "ภายใน 24 ชั่วโมง"],
                ].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--border)"}}>
                    <span className="tag">{l}</span>
                    <span style={{fontSize:"14px",color:l==="จำนวน"?"var(--gold)":"var(--text)",fontWeight:l==="จำนวน"?700:400}}>{v}</span>
                  </div>
                ))}
              </div>

              {/* PromptPay QR Preview */}
              {method === "promptpay" && qrData && (
                <div style={{padding:"20px",textAlign:"center",borderBottom:"1px solid var(--border)"}}>
                  <div className="tag" style={{display:"block",marginBottom:"12px"}}>QR Preview (ตัวอย่าง)</div>
                  <img src={qrData} alt="PromptPay QR" style={{width:"160px",borderRadius:"4px"}}/>
                </div>
              )}

              <div style={{padding:"20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                <button className="btn-ghost" onClick={()=>setStep("form")}>← แก้ไข</button>
                <button className="btn-gold" disabled={loading} onClick={handleSubmit} style={{justifyContent:"center"}}>
                  {loading ? "กำลังโอน..." : "✦ ยืนยัน"}
                </button>
              </div>
              {err && <div className="form-error" style={{padding:"0 20px 16px"}}>{err}</div>}
            </div>
          )}

          {step === "success" && (
            <div style={{textAlign:"center",padding:"48px 0"}}>
              <div style={{fontSize:"48px",marginBottom:"20px"}}>✦</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:600,color:"var(--green)",marginBottom:"10px"}}>
                {result?.success ? "โอนสำเร็จ" : "รับคำขอแล้ว"}
              </div>
              <div style={{fontSize:"14px",color:"var(--muted2)",lineHeight:1.8,marginBottom:"32px"}}>
                {result?.success
                  ? `โอน ฿${withdrawAmount.toLocaleString()} เข้า${method==="promptpay"?"PromptPay":"บัญชีธนาคาร"}เรียบร้อยแล้ว`
                  : `ระบบจะดำเนินการโอน ฿${withdrawAmount.toLocaleString()} ภายใน 24 ชั่วโมง`
                }<br/>
                <span style={{fontSize:"11px",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",color:"var(--muted)"}}>
                  REF: {result?.withdrawal_id?.slice(0,8).toUpperCase()}
                </span>
              </div>
              <Link href="/dashboard" className="btn-ghost" style={{display:"inline-block",textDecoration:"none"}}>← กลับ Dashboard</Link>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
