"use client";
// app/admin/page.tsx — Admin Dashboard
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Tab = "overview"|"affiliates"|"commissions"|"withdrawals"|"products"|"producers";

export default function AdminPage() {
  const [tab,    setTab]    = useState<Tab>("overview");
  const [data,   setData]   = useState<any>({});
  const [token,  setToken]  = useState("");
  const [loading,setLoading]= useState(true);
  const [toast,  setToast]  = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(""),3000); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setToken(session.access_token); }
    });
  }, []);

  useEffect(() => { if (token) loadData(); }, [tab, token]);

  async function loadData() {
    setLoading(true);
    if (tab === "products" || tab === "producers") {
      const type = tab === "producers" ? "producers" : "products";
      const res = await fetch(`/api/admin/products?type=${type}`, {
        headers: { "Authorization": `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) setData(await res.json());
    } else {
      const res = await fetch(`/api/admin?tab=${tab}`, { credentials: "include" });
      if (res.ok) setData(await res.json());
    }
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

  async function updateProductStatus(id: string, status: string) {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
      body: JSON.stringify({ id, type:"product", status }),
    });
    if (res.ok) { showToast(`✦ Product ${status}`); loadData(); }
  }

  async function updateProducerStatus(id: string, status: string) {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${token}` },
      body: JSON.stringify({ id, type:"producer", status }),
    });
    if (res.ok) { showToast(`✦ Producer ${status}`); loadData(); }
  }

  const NAV_TABS: {k:Tab,l:string}[] = [
    {k:"overview",l:"Overview"},{k:"affiliates",l:"Affiliates"},
    {k:"commissions",l:"Commissions"},{k:"withdrawals",l:"Withdrawals"},
    {k:"products",l:"สินค้า"},{k:"producers",l:"Producers"},
  ];

  const PROD_STATUS: Record<string,string> = {
    pending:"badge-gold", approved:"badge-green", active:"badge-green",
    rejected:"badge-red", inactive:"badge-muted",
  };
  const PROD_LABEL: Record<string,string> = {
    pending:"รออนุมัติ", approved:"อนุมัติแล้ว", active:"กำลังขาย",
    rejected:"ปฏิเสธ", inactive:"ปิดการขาย",
  };

  return (
    <>
      <nav className="nav">
        <Link href="/admin" className="nav-logo"><span className="nav-dot"/>Admin</Link>
        <div className="nav-links" style={{ flexWrap:"wrap", gap:"2px" }}>
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
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:700,color:s.c==="gold"?"var(--gold)":s.c==="gr"?"var(--green)":s.c==="red"?"var(--red)":"var(--text)"}}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"16px"}}>
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
                <div className="card">
                  <div className="card-head">สินค้ารออนุมัติ</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"36px",fontWeight:700,color:"var(--gold)"}}>—</div>
                  <button className="btn-ghost btn-full" style={{marginTop:"16px"}} onClick={()=>setTab("products")}>จัดการสินค้า →</button>
                </div>
                <div className="card">
                  <div className="card-head">Producer รออนุมัติ</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"36px",fontWeight:700,color:"var(--gold)"}}>—</div>
                  <button className="btn-ghost btn-full" style={{marginTop:"16px"}} onClick={()=>setTab("producers")}>จัดการ Producers →</button>
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
                      <span className={`badge ${c.status==="approved"?"badge-green":c.status==="paid"?"badge-muted":"badge-gold"}`}>{c.status}</span>
                    </div>
                    <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                      {c.status === "pending" && (
                        <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px"}} onClick={()=>approveCommission(c.id)}>Approve</button>
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
                        <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px"}} onClick={()=>processWithdrawal(w.id)}>Process</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* PRODUCTS */}
          {tab === "products" && (
            <>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:300,marginBottom:"32px"}}>จัดการสินค้า</h1>
              {loading ? (
                <div style={{textAlign:"center",padding:"40px",color:"var(--muted2)"}}>Loading...</div>
              ) : (
                <div style={{border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1.5fr",background:"var(--card)",borderBottom:"1px solid var(--border)"}}>
                    {["สินค้า / Producer","ราคา","Commission","หมวดหมู่","สถานะ","Action"].map(h=>(
                      <div key={h} className="tag" style={{display:"block",padding:"11px 16px"}}>{h}</div>
                    ))}
                  </div>
                  {(data.products ?? []).length === 0 && (
                    <div style={{padding:"40px",textAlign:"center",color:"var(--muted2)"}}>ไม่มีสินค้า</div>
                  )}
                  {(data.products ?? []).map((p: any) => (
                    <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1.5fr",borderBottom:"1px solid var(--border)"}}
                      onMouseEnter={e=>(e.currentTarget.style.background="rgba(240,180,41,0.025)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <div style={{padding:"12px 16px"}}>
                        <div style={{fontSize:"13px",fontWeight:500}}>{p.name}</div>
                        <div className="tag" style={{display:"block",marginTop:"2px"}}>{p.aff_producers?.company ?? "—"}</div>
                      </div>
                      <div style={{padding:"12px 16px",fontFamily:"'Cormorant Garamond',serif",fontSize:"16px",fontWeight:600,display:"flex",alignItems:"center"}}>฿{Number(p.price).toLocaleString()}</div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",color:"var(--gold)",fontSize:"13px"}}>{(p.commission_rate*100).toFixed(0)}%</div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}><span className="tag">{p.category ?? "—"}</span></div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                        <span className={`badge ${PROD_STATUS[p.status]??"badge-muted"}`}>{PROD_LABEL[p.status]??p.status}</span>
                      </div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:"6px"}}>
                        {(p.status === "pending" || p.status === "rejected") && (
                          <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px",color:"var(--green)"}} onClick={()=>updateProductStatus(p.id,"approved")}>
                            อนุมัติ
                          </button>
                        )}
                        {p.status === "active" && (
                          <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px"}} onClick={()=>updateProductStatus(p.id,"inactive")}>
                            ปิด
                          </button>
                        )}
                        {(p.status === "pending") && (
                          <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px",color:"var(--red)"}} onClick={()=>updateProductStatus(p.id,"rejected")}>
                            ปฏิเสธ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* PRODUCERS */}
          {tab === "producers" && (
            <>
              <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"28px",fontWeight:300,marginBottom:"32px"}}>จัดการ Producers</h1>
              {loading ? (
                <div style={{textAlign:"center",padding:"40px",color:"var(--muted2)"}}>Loading...</div>
              ) : (
                <div style={{border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 1.5fr",background:"var(--card)",borderBottom:"1px solid var(--border)"}}>
                    {["บริษัท / ผู้ติดต่อ","อีเมล","หมวดหมู่","สถานะ","สมัครเมื่อ","Action"].map(h=>(
                      <div key={h} className="tag" style={{display:"block",padding:"11px 16px"}}>{h}</div>
                    ))}
                  </div>
                  {(data.producers ?? []).length === 0 && (
                    <div style={{padding:"40px",textAlign:"center",color:"var(--muted2)"}}>ไม่มี Producer</div>
                  )}
                  {(data.producers ?? []).map((p: any) => (
                    <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 1.5fr",borderBottom:"1px solid var(--border)"}}
                      onMouseEnter={e=>(e.currentTarget.style.background="rgba(240,180,41,0.025)")}
                      onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                      <div style={{padding:"12px 16px"}}>
                        <div style={{fontSize:"13px",fontWeight:500}}>{p.company}</div>
                        <div className="tag" style={{display:"block",marginTop:"2px"}}>{p.contact_name}</div>
                      </div>
                      <div style={{padding:"12px 16px",fontSize:"12px",color:"var(--muted2)",display:"flex",alignItems:"center"}}>{p.email}</div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}><span className="tag">{p.category ?? "—"}</span></div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center"}}>
                        <span className={`badge ${p.status==="approved"?"badge-green":p.status==="rejected"?"badge-red":p.status==="suspended"?"badge-red":"badge-gold"}`}>
                          {p.status==="approved"?"อนุมัติแล้ว":p.status==="pending"?"รออนุมัติ":p.status==="rejected"?"ปฏิเสธ":"ระงับ"}
                        </span>
                      </div>
                      <div style={{padding:"12px 16px",fontSize:"11px",color:"var(--muted2)",display:"flex",alignItems:"center"}}>
                        {new Date(p.created_at).toLocaleDateString("th-TH")}
                      </div>
                      <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:"6px"}}>
                        {p.status === "pending" && (
                          <>
                            <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px",color:"var(--green)"}} onClick={()=>updateProducerStatus(p.id,"approved")}>
                              อนุมัติ
                            </button>
                            <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px",color:"var(--red)"}} onClick={()=>updateProducerStatus(p.id,"rejected")}>
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                        {p.status === "approved" && (
                          <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px",color:"var(--red)"}} onClick={()=>updateProducerStatus(p.id,"suspended")}>
                            ระงับ
                          </button>
                        )}
                        {(p.status === "rejected" || p.status === "suspended") && (
                          <button className="btn-ghost" style={{padding:"5px 10px",fontSize:"9px",color:"var(--green)"}} onClick={()=>updateProducerStatus(p.id,"approved")}>
                            อนุมัติ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
