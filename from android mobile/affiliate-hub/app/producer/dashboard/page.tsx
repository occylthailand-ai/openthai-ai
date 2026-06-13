"use client";
// app/producer/dashboard/page.tsx — Producer Dashboard
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Tab = "overview"|"products";

const STATUS_LABEL: Record<string, string> = {
  pending:  "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  active:   "เปิดขาย",
  rejected: "ถูกปฏิเสธ",
  inactive: "ปิดการขาย",
};

const STATUS_BADGE: Record<string, string> = {
  pending:  "badge-gold",
  approved: "badge-green",
  active:   "badge-green",
  rejected: "badge-red",
  inactive: "badge-muted",
};

export default function ProducerDashboard() {
  const router = useRouter();
  const [tab,       setTab]     = useState<Tab>("overview");
  const [producer,  setProd]    = useState<any>(null);
  const [products,  setProds]   = useState<any[]>([]);
  const [loading,   setLoad]    = useState(true);
  const [toast,     setToast]   = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  useEffect(() => { init(); }, []);

  async function init() {
    setLoad(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/producer?auth=login"); return; }

    const token = session.access_token;

    // Load products
    const res = await fetch("/api/producer/products", {
      headers: { "Authorization": `Bearer ${token}` },
    });
    if (res.status === 401) { router.push("/producer?auth=login"); return; }

    if (res.ok) {
      const json = await res.json();
      setProds(json.products ?? []);
    }

    // Load producer profile from Supabase
    const { data: prod } = await supabase
      .from("aff_producers")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .single();

    setProd(prod);
    setLoad(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/producer");
  }

  const activeProducts  = products.filter(p => p.status === "active").length;
  const pendingProducts = products.filter(p => p.status === "pending").length;

  const NAV_TABS: { k: Tab; l: string }[] = [
    { k:"overview", l:"Overview" },
    { k:"products", l:"สินค้าของฉัน" },
  ];

  return (
    <>
      <nav className="nav">
        <Link href="/producer/dashboard" className="nav-logo"><span className="nav-dot"/>Producer</Link>
        <div className="nav-links">
          {NAV_TABS.map(t => (
            <button key={t.k} className={`nav-link ${tab === t.k ? "active" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          <Link href="/producer/dashboard/products/new" className="btn-gold" style={{ fontSize:"13px", padding:"9px 18px", textDecoration:"none", display:"inline-block" }}>
            + เพิ่มสินค้า
          </Link>
          <button className="btn-ghost" style={{ fontSize:"11px", padding:"7px 12px" }} onClick={signOut}>ออกจากระบบ</button>
        </div>
      </nav>

      {/* Status Banner */}
      {producer && producer.status === "pending" && (
        <div style={{ background:"rgba(240,180,41,0.08)", borderBottom:"1px solid rgba(240,180,41,0.2)", padding:"12px 24px", textAlign:"center", fontSize:"13px", color:"var(--gold)" }}>
          ⏳ บัญชีของคุณกำลังรอการอนุมัติจากแอดมิน กรุณารอ 1-2 วันทำการ
        </div>
      )}
      {producer && producer.status === "rejected" && (
        <div style={{ background:"rgba(239,68,68,0.08)", borderBottom:"1px solid rgba(239,68,68,0.2)", padding:"12px 24px", textAlign:"center", fontSize:"13px", color:"var(--red)" }}>
          ✕ บัญชีของคุณถูกปฏิเสธ {producer.admin_notes ? `— ${producer.admin_notes}` : ""} กรุณาติดต่อแอดมิน
        </div>
      )}

      <main style={{ padding:"36px 0 60px" }}>
        <div className="wrap">

          {loading ? (
            <div style={{ textAlign:"center", padding:"60px", color:"var(--muted2)" }}>กำลังโหลด...</div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === "overview" && (
                <>
                  <div style={{ marginBottom:"28px" }}>
                    <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:300, marginBottom:"4px" }}>
                      สวัสดี, {producer?.contact_name ?? "Producer"}
                    </h1>
                    <div className="tag">{producer?.company ?? ""}</div>
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:"1px", background:"var(--border)", border:"1px solid var(--border)", borderRadius:"3px", overflow:"hidden", marginBottom:"28px" }}>
                    {[
                      { l:"สินค้าทั้งหมด",  v: products.length,    c:"w" },
                      { l:"กำลังขาย",        v: activeProducts,      c:"gr" },
                      { l:"รออนุมัติ",        v: pendingProducts,     c:"gold" },
                      { l:"สถานะบัญชี",       v: producer?.status === "approved" ? "✓ อนุมัติแล้ว" : producer?.status === "pending" ? "⏳ รอตรวจสอบ" : producer?.status ?? "—", c: producer?.status === "approved" ? "gr" : "gold" },
                    ].map(s => (
                      <div key={s.l} style={{ background:"var(--surface)", padding:"24px 20px" }}>
                        <div className="tag" style={{ display:"block", marginBottom:"10px" }}>{s.l}</div>
                        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:700, color: s.c === "gold" ? "var(--gold)" : s.c === "gr" ? "var(--green)" : "var(--text)" }}>
                          {s.v}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"20px" }}>
                    <div className="card">
                      <div className="card-head">เพิ่มสินค้าใหม่</div>
                      <p style={{ fontSize:"13px", color:"var(--muted2)", lineHeight:1.7, marginBottom:"20px" }}>
                        เพิ่มสินค้าของคุณและให้ Affiliate ช่วยแชร์สู่ลูกค้า
                      </p>
                      <Link href="/producer/dashboard/products/new" className="btn-gold" style={{ textDecoration:"none", display:"inline-block", fontSize:"13px", padding:"10px 20px" }}>
                        ✦ เพิ่มสินค้า →
                      </Link>
                    </div>
                    <div className="card">
                      <div className="card-head">สินค้ารออนุมัติ</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"36px", fontWeight:700, color:"var(--gold)" }}>{pendingProducts}</div>
                      <button className="btn-ghost btn-full" style={{ marginTop:"16px" }} onClick={() => setTab("products")}>ดูรายการสินค้า →</button>
                    </div>
                  </div>

                  {/* Company Info */}
                  {producer && (
                    <div className="card" style={{ marginTop:"20px" }}>
                      <div className="card-head">ข้อมูลบริษัท</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", fontSize:"13px" }}>
                        {[
                          ["อีเมล",    producer.email],
                          ["ผู้ติดต่อ", producer.contact_name],
                          ["เบอร์โทร", producer.phone ?? "—"],
                          ["เว็บไซต์", producer.website ?? "—"],
                          ["หมวดหมู่", producer.category ?? "—"],
                          ["Commission Default", `${(producer.commission_default * 100).toFixed(0)}%`],
                        ].map(([l,v]) => (
                          <div key={l}>
                            <div className="tag" style={{ display:"block", marginBottom:"4px" }}>{l}</div>
                            <div style={{ color:"var(--text)" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* PRODUCTS */}
              {tab === "products" && (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"28px" }}>
                    <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:300 }}>สินค้าของฉัน</h1>
                    <Link href="/producer/dashboard/products/new" className="btn-gold" style={{ textDecoration:"none", fontSize:"13px", padding:"10px 20px" }}>
                      + เพิ่มสินค้า
                    </Link>
                  </div>

                  {products.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"60px 24px", border:"1px dashed var(--border2)", borderRadius:"3px" }}>
                      <div style={{ fontSize:"32px", marginBottom:"16px" }}>📦</div>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"20px", marginBottom:"12px" }}>ยังไม่มีสินค้า</div>
                      <div style={{ color:"var(--muted2)", fontSize:"13px", marginBottom:"24px" }}>เริ่มเพิ่มสินค้าแรกของคุณได้เลย</div>
                      <Link href="/producer/dashboard/products/new" className="btn-gold" style={{ textDecoration:"none", fontSize:"13px", padding:"10px 24px" }}>
                        ✦ เพิ่มสินค้าแรก
                      </Link>
                    </div>
                  ) : (
                    <div style={{ border:"1px solid var(--border)", borderRadius:"3px", overflow:"hidden" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"2.5fr 1fr 1fr 1fr 1fr", background:"var(--card)", borderBottom:"1px solid var(--border)" }}>
                        {["ชื่อสินค้า","ราคา","Commission","หมวดหมู่","สถานะ"].map(h => (
                          <div key={h} className="tag" style={{ display:"block", padding:"11px 16px" }}>{h}</div>
                        ))}
                      </div>
                      {products.map(p => (
                        <div key={p.id} style={{ display:"grid", gridTemplateColumns:"2.5fr 1fr 1fr 1fr 1fr", borderBottom:"1px solid var(--border)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(240,180,41,0.025)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ padding:"14px 16px" }}>
                            <div style={{ fontSize:"13px", fontWeight:500 }}>{p.name}</div>
                            {p.short_desc && <div className="tag" style={{ display:"block", marginTop:"2px" }}>{p.short_desc.slice(0,60)}{p.short_desc.length > 60 ? "..." : ""}</div>}
                            {p.admin_notes && p.status === "rejected" && (
                              <div style={{ fontSize:"11px", color:"var(--red)", marginTop:"4px" }}>หมายเหตุ: {p.admin_notes}</div>
                            )}
                          </div>
                          <div style={{ padding:"14px 16px", fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, display:"flex", alignItems:"center" }}>
                            ฿{Number(p.price).toLocaleString()}
                          </div>
                          <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", color:"var(--gold)", fontSize:"13px" }}>
                            {(p.commission_rate * 100).toFixed(0)}%
                          </div>
                          <div style={{ padding:"14px 16px", display:"flex", alignItems:"center" }}>
                            <span className="tag">{p.category ?? "—"}</span>
                          </div>
                          <div style={{ padding:"14px 16px", display:"flex", alignItems:"center" }}>
                            <span className={`badge ${STATUS_BADGE[p.status] ?? "badge-muted"}`}>
                              {STATUS_LABEL[p.status] ?? p.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
