"use client";
// app/dashboard/page.tsx — Main Dashboard
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, getStats, getCommissions, signOut } from "@/lib/auth";
import type { User, Commission, UserStats } from "@/lib/supabase";
import QRModal from "@/components/QRModal";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "";

export default function Dashboard() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<User | null>(null);
  const [stats,    setStats]    = useState<UserStats | null>(null);
  const [feed,     setFeed]     = useState<Commission[]>([]);
  const [toast,    setToast]    = useState("");
  const [copied,   setCopied]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [showQR,   setShowQR]   = useState(false);

  /* ── Load data ─────────────────────────────────────── */
  const load = useCallback(async () => {
    const [p, s, c] = await Promise.all([getProfile(), getStats(), getCommissions(5)]);
    setProfile(p); setStats(s); setFeed(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime commission subscription ──────────────── */
  useEffect(() => {
    if (!profile) return;
    const sub = supabase
      .channel("commissions")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "commissions",
        filter: `user_id=eq.${profile.id}`,
      }, payload => {
        const c = payload.new as Commission;
        setFeed(f => [c, ...f.slice(0,4)]);
        setStats(s => s ? { ...s, balance: s.balance + c.commission, total_earned: s.total_earned + c.commission, total_referrals: s.total_referrals + 1 } : s);
        showToast(`✦ Commission +฿${c.commission.toLocaleString()} เข้าแล้ว`);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [profile]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const myLink = profile ? `${APP}/api/track?ref=${profile.ref_code}&redirect=${APP}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(myLink);
    setCopied(true); showToast("LINK COPIED — แชร์ได้เลย");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => { await signOut(); router.push("/"); };

  const levelProgress = () => {
    const e = stats?.total_earned ?? 0;
    if (e >= 100000) return 100;
    if (e >= 30000)  return Math.min(100, ((e - 30000) / 70000) * 100);
    return Math.min(100, (e / 30000) * 100);
  };
  const nextLevel = () => {
    const e = stats?.total_earned ?? 0;
    if (e >= 100000) return "Platinum — ถึงแล้ว!";
    if (e >= 30000)  return `Platinum (อีก ฿${(100000-e).toLocaleString()})`;
    return `Gold (อีก ฿${(30000-e).toLocaleString()})`;
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",letterSpacing:"3px",color:"var(--muted2)"}}>LOADING...</div>
    </div>
  );

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo"><span className="nav-dot"/>Affiliate Hub</Link>
        <div className="nav-links">
          <Link href="/dashboard"         className="nav-link active">Dashboard</Link>
          <Link href="/dashboard/history" className="nav-link">History</Link>
          <Link href="/dashboard/withdraw"className="nav-link">Withdraw</Link>
          <Link href="/affiliate"         className="nav-link">My Links</Link>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"16px"}}>
          <div className="nav-balance">Balance <strong>฿{(stats?.balance ?? 0).toLocaleString()}</strong></div>
          <button className="btn-ghost" style={{padding:"7px 14px",fontSize:"10px"}} onClick={handleSignOut}>ออกจากระบบ</button>
        </div>
      </nav>

      <main style={{padding:"40px 0 60px"}}>
        <div className="wrap">

          {/* EMAIL VERIFY BANNER */}
          {profile && !profile.email_verified && (
            <div style={{border:"1px solid rgba(240,180,41,0.3)",background:"rgba(240,180,41,0.06)",borderRadius:"3px",padding:"14px 20px",marginBottom:"28px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px"}}>
              <span style={{fontSize:"13px",color:"var(--gold-l)"}}>⚠ กรุณายืนยันอีเมลก่อนถอนเงิน — ตรวจสอบ inbox ของคุณ</span>
              <button className="btn-ghost" style={{padding:"6px 14px",fontSize:"10px",whiteSpace:"nowrap"}} onClick={()=>showToast("ส่งอีเมลยืนยันอีกครั้งแล้ว")}>ส่งอีกครั้ง</button>
            </div>
          )}

          {/* GREETING */}
          <div style={{textAlign:"center",marginBottom:"48px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"14px"}}>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
              <span className="tag">Dashboard</span>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
            </div>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(26px,4vw,40px)",fontWeight:300,marginBottom:"4px"}}>
              สวัสดี, <em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>{profile?.name}</em>
            </h1>
            <div className="tag" style={{marginTop:"8px",display:"block"}}>
              Ref: <span style={{color:"var(--gold)",letterSpacing:"3px"}}>{profile?.ref_code}</span>
              &nbsp;·&nbsp;
              <span style={{color:"var(--muted2)"}}>{profile?.level}</span>
            </div>
          </div>

          {/* STATS */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1px",background:"var(--border)",border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden",marginBottom:"28px"}}>
            {[
              {label:"Balance",      val:`฿${(stats?.balance ?? 0).toLocaleString()}`,       cls:"gold"},
              {label:"Referrals",    val:`${stats?.total_referrals ?? 0}`,                    cls:"gr"},
              {label:"Total Clicks", val:`${(stats?.total_clicks ?? 0).toLocaleString()}`,   cls:"w"},
            ].map(s=>(
              <div key={s.label} style={{background:"var(--surface)",padding:"24px 22px"}}>
                <div className="tag" style={{marginBottom:"10px",display:"block"}}>{s.label}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:700,color:s.cls==="gold"?"var(--gold)":s.cls==="gr"?"var(--green)":"var(--text)"}}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* MAIN GRID */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>

            {/* MY LINK */}
            <div className="card">
              <div className="card-head">My Affiliate Link</div>

              <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"2px",padding:"14px 16px",marginBottom:"12px"}}>
                <div className="tag" style={{display:"block",marginBottom:"7px"}}>Your URL</div>
                <div className="mono" style={{color:"var(--gold-l)",wordBreak:"break-all",lineHeight:1.5,fontSize:"11px"}}>{myLink || "กำลังโหลด..."}</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"8px",marginBottom:"14px"}}>
                <button className={`btn-gold${copied?" copied":""}`} style={{fontSize:"14px",padding:"11px 18px",justifyContent:"center",borderColor:copied?"var(--green)":"",color:copied?"var(--green)":""}} onClick={handleCopy}>
                  {copied ? "Copied ✓" : "Copy Link"}
                </button>
                <button className="btn-ghost" style={{padding:"11px 14px"}} onClick={()=>setShowQR(true)} title="แสดง QR Code">
                  ⬛
                </button>
              </div>

              {/* Level Progress */}
              <div style={{marginTop:"4px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"7px"}}>
                  <span className="tag">เป้าหมาย {nextLevel()}</span>
                  <span style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:"var(--gold)"}}>{Math.round(levelProgress())}%</span>
                </div>
                <div style={{height:"2px",background:"rgba(255,255,255,0.05)",borderRadius:"1px",overflow:"hidden"}}>
                  <div style={{height:"100%",background:"linear-gradient(90deg,var(--gold),var(--green))",width:`${levelProgress()}%`,transition:"width 1s ease"}}/>
                </div>
              </div>

              <button className="btn-ghost btn-full" style={{marginTop:"18px"}} onClick={()=>router.push("/dashboard/withdraw")}>
                Withdraw Funds →
              </button>
            </div>

            {/* LIVE FEED */}
            <div className="card">
              <div className="card-head">
                <span className="live-dot" style={{marginRight:"4px"}}/>Live Commissions
              </div>
              {feed.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px 0",color:"var(--muted2)",fontSize:"13px"}}>
                  ยังไม่มี commission<br/>
                  <span style={{fontSize:"12px"}}>เริ่มแชร์ลิงก์เพื่อรับเงิน</span>
                </div>
              ) : (
                feed.map((item, i) => (
                  <div key={item.id ?? i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:`1px solid ${i<feed.length-1?"var(--border)":"transparent"}`}}>
                    <div>
                      <div style={{fontSize:"13px"}}>{item.buyer_name ?? "ผู้ซื้อ"}</div>
                      <div className="tag" style={{display:"block",marginTop:"2px"}}>{item.product} · {new Date(item.created_at).toLocaleDateString("th-TH")}</div>
                    </div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:700,color:"var(--green)"}}>
                      +฿{item.commission.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
              {feed.length > 0 && (
                <Link href="/dashboard/history" style={{display:"block",textAlign:"center",marginTop:"16px",fontSize:"12px",color:"var(--muted2)",fontFamily:"'DM Mono',monospace",letterSpacing:"1px",textDecoration:"none"}}>
                  ดูทั้งหมด →
                </Link>
              )}
            </div>
          </div>

          {/* SHARE CHANNELS */}
          <div style={{marginTop:"20px"}}>
            <div className="card">
              <div className="card-head">แชร์ลิงก์ผ่านช่องทาง</div>
              <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
                {[
                  {name:"TikTok",  color:"#010101", emoji:"🎵", url:`https://www.tiktok.com/share?url=${encodeURIComponent(myLink)}`},
                  {name:"Facebook",color:"#1877F2", emoji:"👤", url:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(myLink)}`},
                  {name:"Line",    color:"#06C755", emoji:"💬", url:`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(myLink)}`},
                  {name:"Twitter", color:"#1DA1F2", emoji:"🐦", url:`https://twitter.com/intent/tweet?url=${encodeURIComponent(myLink)}&text=แนะนำเลย!`},
                  {name:"คัดลอก", color:"",         emoji:"📋", url:""},
                ].map(ch=>(
                  <button key={ch.name}
                    onClick={ch.url ? ()=>window.open(ch.url,"_blank") : handleCopy}
                    style={{display:"flex",alignItems:"center",gap:"8px",padding:"9px 16px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:"2px",cursor:"pointer",fontSize:"13px",color:"var(--text)",transition:"border-color 0.2s"}}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor="var(--border2)")}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor="var(--border)")}>
                    <span>{ch.emoji}</span> {ch.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      </main>

      {showQR && profile && <QRModal refCode={profile.ref_code} link={myLink} onClose={()=>setShowQR(false)}/>}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
