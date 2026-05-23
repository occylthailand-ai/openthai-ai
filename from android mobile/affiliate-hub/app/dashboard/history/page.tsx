"use client";
// app/dashboard/history/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { getCommissions, getStats } from "@/lib/auth";
import type { Commission, UserStats } from "@/lib/supabase";

type Filter = "all" | "approved" | "pending" | "paid";

export default function HistoryPage() {
  const [items,  setItems]  = useState<Commission[]>([]);
  const [stats,  setStats]  = useState<UserStats | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    Promise.all([getCommissions(100), getStats()]).then(([c, s]) => {
      setItems(c); setStats(s); setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);
  const totalFiltered = filtered.reduce((sum, i) => sum + i.commission, 0);

  const statusLabel: Record<string, string> = {
    approved: "สำเร็จ", pending: "รอดำเนินการ", paid: "จ่ายแล้ว",
  };
  const statusBadge: Record<string, string> = {
    approved: "badge-green", pending: "badge-gold", paid: "badge-muted",
  };

  return (
    <>
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo"><span className="nav-dot"/>Affiliate Hub</Link>
        <div className="nav-links">
          <Link href="/dashboard"         className="nav-link">Dashboard</Link>
          <Link href="/dashboard/history" className="nav-link active">History</Link>
          <Link href="/dashboard/withdraw"className="nav-link">Withdraw</Link>
        </div>
        <div className="nav-balance">Balance <strong>฿{(stats?.balance ?? 0).toLocaleString()}</strong></div>
      </nav>

      <main style={{padding:"40px 0 60px"}}>
        <div className="wrap">

          {/* HEADER */}
          <div style={{marginBottom:"36px"}}>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"32px",fontWeight:300,marginBottom:"6px"}}>Commission History</h1>
            <div style={{fontSize:"13px",color:"var(--muted2)"}}>ประวัติคอมมิชชั่นทั้งหมดของคุณ</div>
          </div>

          {/* SUMMARY */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"var(--border)",border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden",marginBottom:"24px"}}>
            {[
              {l:"รายได้รวม",  v:`฿${(stats?.total_earned ?? 0).toLocaleString()}`,  c:"gold"},
              {l:"ยังไม่ถอน",  v:`฿${(stats?.balance ?? 0).toLocaleString()}`,        c:"gr"},
              {l:"รายการทั้งหมด", v:`${items.length}`,                              c:"w"},
              {l:"Conversion",  v:`${items.length > 0 ? Math.round((stats?.total_referrals ?? 0) / Math.max(stats?.total_clicks ?? 1, 1) * 100) : 0}%`, c:"w"},
            ].map(s=>(
              <div key={s.l} style={{background:"var(--surface)",padding:"20px 18px"}}>
                <div className="tag" style={{display:"block",marginBottom:"8px"}}>{s.l}</div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"26px",fontWeight:700,color:s.c==="gold"?"var(--gold)":s.c==="gr"?"var(--green)":"var(--text)"}}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* FILTER */}
          <div style={{display:"flex",gap:"8px",marginBottom:"20px",alignItems:"center"}}>
            <span className="tag" style={{marginRight:"8px"}}>Filter:</span>
            {(["all","approved","pending","paid"] as Filter[]).map(f=>(
              <button key={f}
                onClick={()=>setFilter(f)}
                style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",letterSpacing:"1.5px",textTransform:"uppercase",padding:"6px 14px",borderRadius:"2px",cursor:"pointer",transition:"all 0.2s",border:`1px solid ${filter===f?"var(--border2)":"var(--border)"}`,background:filter===f?"var(--gold-dim)":"transparent",color:filter===f?"var(--gold)":"var(--muted2)"}}>
                {f === "all" ? "ทั้งหมด" : statusLabel[f]}
              </button>
            ))}
            {filter !== "all" && (
              <span style={{marginLeft:"auto",fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:"var(--green)"}}>
                ฿{totalFiltered.toLocaleString()}
              </span>
            )}
          </div>

          {/* TABLE */}
          {loading ? (
            <div style={{textAlign:"center",padding:"60px",color:"var(--muted2)"}}>กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:"center",padding:"60px",border:"1px solid var(--border)",borderRadius:"3px",color:"var(--muted2)"}}>
              <div style={{fontSize:"32px",marginBottom:"12px"}}>◇</div>
              <div>ยังไม่มีรายการ</div>
            </div>
          ) : (
            <div style={{border:"1px solid var(--border)",borderRadius:"3px",overflow:"hidden"}}>
              {/* Head */}
              <div style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr",background:"var(--card)",borderBottom:"1px solid var(--border)"}}>
                {["ผู้ซื้อ","สินค้า","ยอดขาย","Commission","สถานะ"].map(h=>(
                  <div key={h} className="tag" style={{display:"block",padding:"11px 16px"}}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              {filtered.map((item, i) => (
                <div key={item.id ?? i}
                  style={{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr",borderBottom:`1px solid ${i<filtered.length-1?"var(--border)":"transparent"}`,transition:"background 0.15s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background="rgba(240,180,41,0.025)")}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>

                  <div style={{padding:"14px 16px"}}>
                    <div style={{fontSize:"13px"}}>{item.buyer_name ?? "—"}</div>
                    <div className="tag" style={{display:"block",marginTop:"2px"}}>{new Date(item.created_at).toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"})}</div>
                  </div>
                  <div style={{padding:"14px 16px",fontSize:"13px",color:"var(--muted2)",display:"flex",alignItems:"center"}}>{item.product}</div>
                  <div style={{padding:"14px 16px",fontSize:"13px",display:"flex",alignItems:"center"}}>฿{item.order_amount.toLocaleString()}</div>
                  <div style={{padding:"14px 16px",fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:"var(--green)",display:"flex",alignItems:"center"}}>
                    ฿{item.commission.toLocaleString()}
                  </div>
                  <div style={{padding:"14px 16px",display:"flex",alignItems:"center"}}>
                    <span className={`badge ${statusBadge[item.status]}`}>{statusLabel[item.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Export */}
          {filtered.length > 0 && (
            <div style={{marginTop:"16px",textAlign:"right"}}>
              <button className="btn-ghost" style={{fontSize:"10px"}}
                onClick={()=>{
                  const csv = ["ผู้ซื้อ,สินค้า,ยอดขาย,Commission,สถานะ,วันที่",
                    ...filtered.map(i=>`${i.buyer_name??""},${i.product},${i.order_amount},${i.commission},${i.status},${i.created_at}`)
                  ].join("\n");
                  const a = document.createElement("a");
                  a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
                  a.download = "commissions.csv";
                  a.click();
                }}>
                Export CSV ↓
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
