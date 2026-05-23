"use client";
// app/admin/page.tsx — Admin Dashboard
// เข้าถึงได้เฉพาะ user ที่มี is_admin=true ใน DB
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

type Tab = "overview"|"affiliates"|"commissions"|"withdrawals";

export default function AdminPage() {
  const [tab,    setTab]    = useState<Tab>("overview");
  const [data,   setData]   = useState<any>({});
  const [loading,setLoading]= useState(true);
  const [toast,  setToast]  = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  useEffect(() => { loadData(); }, [tab]);

  async function loadData() {
    setLoading(true);
    const res = await fetch(`/api/admin?tab=${tab}`, { credentials: "include" });
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  async function approveCommission(id: string) {
    await fetch("/api/admin/commission", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status:"approved" }) });
    showToast("✦ Approved commission"); loadData();
  }

  async function processWithdrawal(id: string) {
    await fetch("/api/admin/withdraw", { method:"PATCH", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ id, status:"processing" }) });
    showToast("✦ Processing withdrawal"); loadData();
  }

  const NAV_TABS: {k:Tab,l:string}[] = [
    {k:"overview",l:"Overview"},{k:"affiliates",l:"Affiliates"},
    {k:"commissions",l:"Commissions"},{k:"withdrawals",l:"Withdrawals"},
  ];

  return (
    <>
      <nav className="nav">
        <Link href="/admin" className="nav-logo"><span className="nav-dot"/>Admin</Link>
        <div className="nav-links">
          {NAV_TABS.map(t=>(
            <button key={t.k} className={`nav-link ${tab===t.k?"active":""}`} onClick={()=>setTab(t.k)}>{t.l}</button>
          ))}
        </div>
        <Link href="/dashboard" className="btn-ghost" style={{fontSize:"10px",padding:"7px 14px",textDecoration:"none",display:"inline-block"}}>User View</Link>
      </nav>

      <main style={{padding:"36px 0 60px"}}>
        <div className="wrap">

          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:300,marginBottom:"32px"}}>Platform Overview</h1>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"var(--border)",border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden",marginBottom:"28px"}}>
                {[
                  {l:"Total Affiliates",  v:data.total_users ?? "—",    c:"w"},
                  {l:"Total Commissions", v:data.total_comm ? `฿${Number(data.total_comm).toLocaleString()}` : "—", c:"gold"},
                  {l:"Pending Withdraw",  v:data.pending_wd ? `฿${Number(data.pending_wd).toLocaleString()}` : "—", c:"red"},
                  {l:"Paid Out",          v:data.total_paid ? `฿${Number(data.total_paid).toLocaleString()}` : "—", c:"gr"},
                ].map(s=>(
                  <div key={s.l} style={{background:"var(--surface)",padding:"24px 20px"}}>
                    <div className="tag" style={{display:"block",marginBottom:"10px"}}>{s.l}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:700,color:s.c==="gold"?"var(--gold)":s.c==="gr"?"var(--green)":s.c==="red"?"var(--red)":"var(--text)"}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Pending Actions */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"}}>
                <div className="card">
                  <div className="card-head">Commission รออนุมัติ</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"36px",fontWeight:700,color:"var(--gold)"}}>{data.pending_commissions ?? 0}</div>
                  <button className="btn-ghost btn-full" style={{marginTop:"16px"}} onClick={()=>setTab("commissions")}>ดูและอนุมัติ →</button>
                </div>
                <div className="card">
                  <div className="card-head">การถอนเงินรอดำเนินการ</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"36px",fontWeight:700,color:"var(--red)"}}>{data.pending_withdrawals ?? 0}</div>
                  <button className="btn-ghost btn-full" style={{marginTop:"16px"}} onClick={()=>setTab("withdrawals")}>ดูและดำเนินการ →</button>
                </div>
              </div>
            </>
          )}

          {/* AFFILIATES */}
          {tab === "affiliates" && (
            <>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:300,marginBottom:"32px"}}>All Affiliates</h1>
              <div style={{border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",background:"var(--card)",borderBottom:"1px solid var(--border)"}}>
                  {["ชื่อ / อีเมล","Ref Code","Level","รายได้รวม","สถานะ"].map(h=>(
                    <div key={h} className="tag" style={{display:"block",padding:"11px 16px"}}>{h}</div>
                  ))}
                </div>
                {loading ? (
                  <div style={{padding:"40px",textAlign:"center",color:"var(--muted2)"}}>Loading...</div>
                ) : (data.users ?? []).map((u: any) => (
                  <div key={u.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",borderBottom:"1px solid var(--border)"}}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(240,180,41,0.025)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <div style={{padding:"14px 16px"}}>
                      <div style={{fontSize:"13px"}}>{u.name}</div>
                      <div className="tag" style={{display:"block",marginTop:"2px"}}>{u.email}</div>
                    </div>
                    <div style={{padding:"14px 16px",fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"var(--gold)",display:"flex",alignItems:"center"}}>{u.ref_code}</div>
                    <div style={{padding:"14px 16px",display:"flex",alignItems:"center"}}>
                      <span className={`badge ${u.level==="Platinum"?"badge-green":u.level==="Gold"?"badge-gold":"badge-muted"}`}>{u.level}</span>
                    </div>
                    <div style={{padding:"14px 16px",fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:"var(--green)",display:"flex",alignItems:"center"}}>
                      ฿{(u.total_earned ?? 0).toLocaleString()}
                    </div>
                    <div style={{padding:"14px 16px",display:"flex",alignItems:"center"}}>
                      <span className={`badge ${u.email_verified?"badge-green":"badge-red"}`}>
                        {u.email_verified?"ยืนยันแล้ว":"รอยืนยัน"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* COMMISSIONS */}
          {tab === "commissions" && (
            <>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:300,marginBottom:"32px"}}>Commission Management</h1>
              <div style={{border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 1fr 1fr 1fr",background:"var(--card)",borderBottom:"1px solid var(--border)"}}>
                  {["Affiliate","สินค้า","ยอดขาย","Commission","สถานะ","Action"].map(h=>(
                    <div key={h} className="tag" style={{display:"block",padding:"11px 16px"}}>{h}</div>
                  ))}
                </div>
                {(data.commissions ?? []).map((c: any) => (
                  <div key={c.id} style={{display:"grid",gridTemplateColumns:"1.5fr 1.5fr 1fr 1fr 1fr 1fr",borderBottom:"1px solid var(--border)"}}>
                    <div style={{padding:"12px 16px"}}>
                      <div style={{fontSize:"13px"}}>{c.ref_code}</div>
                      <div className="tag" style={{display:"block",marginTop:"2px"}}>{c.buyer_name}</div>
                    </div>
                    <div style={{padding:"12px 16px",fontSize:"12px",color:"var(--muted2)",display:"flex",alignItems:"center"}}>{c.product}</div>
                    <div style={{padding:"12px 16px",fontSize:"13px",display:"flex",alignItems:"center"}}>฿{c.order_amount.toLocaleString()}</div>
                    <div style={{padding:"12px 16px",fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:"var(--green)",display:"flex",alignItems:"center"}}>฿{c.commission.toLocaleString()}</div>
                    <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                      <span className={`badge ${c.status==="approved"?"badge-green":c.status==="paid"?"badge-muted":"badge-gold"}`}>
                        {c.status}
                      </span>
                    </div>
                    <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                      {c.status === "pending" && (
                        <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px"}} onClick={()=>approveCommission(c.id)}>
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* WITHDRAWALS */}
          {tab === "withdrawals" && (
            <>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:300,marginBottom:"32px"}}>Withdrawal Requests</h1>
              <div style={{border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 1fr",background:"var(--card)",borderBottom:"1px solid var(--border)"}}>
                  {["Affiliate","จำนวน","ช่องทาง","ปลายทาง","สถานะ","Action"].map(h=>(
                    <div key={h} className="tag" style={{display:"block",padding:"11px 16px"}}>{h}</div>
                  ))}
                </div>
                {(data.withdrawals ?? []).map((w: any) => (
                  <div key={w.id} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr 1fr",borderBottom:"1px solid var(--border)"}}>
                    <div style={{padding:"12px 16px"}}>
                      <div style={{fontSize:"13px"}}>{w.user_id?.slice(0,8)}</div>
                      <div className="tag" style={{display:"block",marginTop:"2px"}}>{new Date(w.requested_at).toLocaleDateString("th-TH")}</div>
                    </div>
                    <div style={{padding:"12px 16px",fontFamily:"'Cormorant Garamond',serif",fontSize:"20px",fontWeight:700,color:"var(--gold)",display:"flex",alignItems:"center"}}>฿{w.amount.toLocaleString()}</div>
                    <div style={{padding:"12px 16px",fontSize:"13px",display:"flex",alignItems:"center"}}>{w.method==="promptpay"?"PromptPay":"ธนาคาร"}</div>
                    <div style={{padding:"12px 16px",fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"var(--muted2)",display:"flex",alignItems:"center"}}>{w.destination}</div>
                    <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                      <span className={`badge ${w.status==="completed"?"badge-green":w.status==="failed"?"badge-red":w.status==="processing"?"badge-gold":"badge-muted"}`}>{w.status}</span>
                    </div>
                    <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                      {w.status === "requested" && (
                        <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px"}} onClick={()=>processWithdrawal(w.id)}>
                          Process
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
