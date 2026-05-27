"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const LEVEL_COLOR: Record<string, string> = {
  Platinum: "var(--green)",
  Gold:     "var(--gold)",
  Silver:   "var(--muted2)",
};

const RANK_ICON = ["🥇", "🥈", "🥉"];

type Row = {
  rank: number;
  name: string;
  level: string;
  total_earned: number;
  total_referrals: number;
};

export default function Leaderboard() {
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState("");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(r => r.json())
      .then(d => {
        setRows(d.leaderboard ?? []);
        setUpdated(new Date().toLocaleTimeString("th-TH"));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav-logo"><span className="nav-dot"/>พันธมิตร Hub</Link>
        <div className="nav-links">
          <Link href="/dashboard"   className="nav-link">Dashboard</Link>
          <Link href="/leaderboard" className="nav-link active">Leaderboard</Link>
          <Link href="/media-kit"   className="nav-link">Media Kit</Link>
        </div>
        <Link href="/dashboard" className="btn-ghost" style={{padding:"8px 18px",fontSize:"10px"}}>
          Dashboard →
        </Link>
      </nav>

      <main style={{padding:"48px 0 80px"}}>
        <div className="wrap-sm">

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:"48px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"16px"}}>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
              <span className="tag">Live Rankings</span>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
            </div>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(32px,5vw,54px)",fontWeight:300,marginBottom:"8px"}}>
              Top <em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>Affiliates</em>
            </h1>
            <p style={{fontSize:"13px",color:"var(--muted2)"}}>
              อัปเดตทุก 10 นาที · อันดับที่ 1–10 ของเดือนนี้
            </p>
            {updated && (
              <div className="tag" style={{marginTop:"10px",display:"block",color:"var(--muted)"}}>
                ข้อมูล ณ {updated}
              </div>
            )}
          </div>

          {/* Podium — top 3 */}
          {!loading && rows.length >= 3 && (
            <div style={{display:"flex",gap:"12px",justifyContent:"center",alignItems:"flex-end",marginBottom:"32px"}}>
              {[rows[1], rows[0], rows[2]].map((r, idx) => {
                const heights = ["80px","110px","72px"];
                const isFirst = idx === 1;
                return (
                  <div key={r.rank} style={{flex:1,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
                    <div style={{fontSize:isFirst?"28px":"22px"}}>{RANK_ICON[r.rank - 1]}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isFirst?"16px":"14px",fontWeight:700,color:LEVEL_COLOR[r.level]???"var(--text)"}}>{r.name}</div>
                    <div className="badge badge-gold" style={{color:LEVEL_COLOR[r.level],borderColor:LEVEL_COLOR[r.level]+"44",background:LEVEL_COLOR[r.level]+"11"}}>{r.level}</div>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:isFirst?"22px":"18px",fontWeight:700,color:"var(--gold)"}}>
                      ฿{r.total_earned.toLocaleString()}
                    </div>
                    <div style={{
                      width:"100%",background:"var(--surface)",border:"1px solid var(--border)",
                      borderRadius:"3px 3px 0 0",height:heights[idx],
                      borderBottom:"none",
                      boxShadow: isFirst ? "0 0 24px rgba(240,180,41,0.12)" : "none",
                    }}/>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table */}
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"18px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span className="card-head" style={{margin:0,borderBottom:"none"}}>อันดับ</span>
              <span className="card-head" style={{margin:0,borderBottom:"none"}}>ชื่อ</span>
              <span className="card-head" style={{margin:0,borderBottom:"none"}}>Level</span>
              <span className="card-head" style={{margin:0,borderBottom:"none"}}>รายได้รวม</span>
              <span className="card-head" style={{margin:0,borderBottom:"none"}}>Referrals</span>
            </div>

            {loading ? (
              <div style={{textAlign:"center",padding:"48px",color:"var(--muted2)",fontFamily:"'DM Mono',monospace",fontSize:"11px",letterSpacing:"2px"}}>
                LOADING...
              </div>
            ) : rows.length === 0 ? (
              <div style={{textAlign:"center",padding:"48px",color:"var(--muted2)",fontSize:"13px"}}>
                ยังไม่มีข้อมูล — เป็นคนแรกในอันดับ!
              </div>
            ) : (
              rows.map((r, i) => (
                <div key={r.rank} style={{
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"16px 24px",
                  borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
                  background: r.rank <= 3 ? "rgba(240,180,41,0.025)" : "transparent",
                  transition:"background 0.2s",
                }}>
                  <div style={{fontFamily:"'DM Mono',monospace",fontSize:"13px",width:"40px",textAlign:"center"}}>
                    {r.rank <= 3 ? RANK_ICON[r.rank - 1] : <span style={{color:"var(--muted2)"}}>{r.rank}</span>}
                  </div>
                  <div style={{flex:1,paddingLeft:"16px",fontFamily:"'Cormorant Garamond',serif",fontSize:"17px",fontWeight:600}}>{r.name}</div>
                  <div style={{width:"90px",textAlign:"center"}}>
                    <span className="badge" style={{color:LEVEL_COLOR[r.level]??"var(--muted2)",borderColor:(LEVEL_COLOR[r.level]??"var(--muted)")+"44",background:(LEVEL_COLOR[r.level]??"var(--muted)")+"11"}}>
                      {r.level}
                    </span>
                  </div>
                  <div style={{width:"110px",textAlign:"right",fontFamily:"'Cormorant Garamond',serif",fontSize:"18px",fontWeight:700,color:"var(--gold)"}}>
                    ฿{r.total_earned.toLocaleString()}
                  </div>
                  <div style={{width:"90px",textAlign:"right",color:"var(--muted2)",fontSize:"13px"}}>
                    {r.total_referrals} คน
                  </div>
                </div>
              ))
            )}
          </div>

          {/* CTA */}
          <div style={{textAlign:"center",marginTop:"40px",padding:"32px",border:"1px solid var(--border)",borderRadius:"3px",background:"var(--surface)"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"24px",fontWeight:300,marginBottom:"12px"}}>
              ชื่อของคุณควรอยู่<em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>บนนี้</em>
            </div>
            <p style={{fontSize:"13px",color:"var(--muted2)",marginBottom:"24px"}}>
              แชร์ลิงก์วันนี้ — ขึ้น Leaderboard ได้ทันที
            </p>
            <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
              <Link href="/dashboard" className="btn-gold" style={{fontSize:"14px",padding:"11px 28px"}}>
                ✦ ไปที่ Dashboard
              </Link>
              <Link href="/media-kit" className="btn-ghost">
                ดู Media Kit →
              </Link>
            </div>
          </div>

        </div>
      </main>
    </>
  );
}
