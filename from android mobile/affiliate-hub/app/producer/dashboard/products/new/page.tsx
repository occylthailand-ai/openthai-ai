"use client";
// app/producer/dashboard/products/new/page.tsx — Submit New Product
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "อาหารและเครื่องดื่ม","ความงามและสุขภาพ","แฟชั่นและเสื้อผ้า","อิเล็กทรอนิกส์",
  "บ้านและสวน","กีฬาและฟิตเนส","หนังสือและการศึกษา","ซอฟต์แวร์และดิจิทัล","อื่น ๆ",
];

export default function NewProductPage() {
  const router = useRouter();
  const [token,   setToken]   = useState("");
  const [form,    setForm]    = useState({
    name:"", short_desc:"", description:"", price:"", image_url:"",
    category:"", product_url:"", sku:"",
  });
  const [err,     setErr]     = useState("");
  const [loading, setLoad]    = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/producer?auth=login"); return; }
      setToken(session.access_token);
    });
  }, []);

  async function handleSubmit() {
    setErr("");
    if (!form.name || !form.price) { setErr("กรุณากรอกชื่อสินค้าและราคา"); return; }
    if (isNaN(Number(form.price)) || Number(form.price) <= 0) { setErr("กรุณากรอกราคาที่ถูกต้อง"); return; }

    setLoad(true);
    try {
      const res = await fetch("/api/producer/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const json = await res.json();
      if (!res.ok) { setErr(json.error ?? "เกิดข้อผิดพลาด"); return; }
      setSuccess(true);
    } catch (e: any) { setErr(e.message); }
    finally { setLoad(false); }
  }

  return (
    <>
      <nav className="nav">
        <Link href="/producer/dashboard" className="nav-logo"><span className="nav-dot"/>Producer</Link>
        <div className="nav-links">
          <Link href="/producer/dashboard" className="nav-link">Dashboard</Link>
          <span className="nav-link active">เพิ่มสินค้า</span>
        </div>
      </nav>

      <main style={{ padding:"48px 0 80px" }}>
        <div className="wrap" style={{ maxWidth:"640px" }}>

          {success ? (
            <div style={{ textAlign:"center", padding:"60px 24px" }}>
              <div style={{ fontSize:"48px", marginBottom:"20px" }}>✦</div>
              <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:300, marginBottom:"12px", color:"var(--gold)" }}>
                ส่งสินค้าสำเร็จ
              </h2>
              <p style={{ color:"var(--muted2)", lineHeight:1.7, marginBottom:"32px" }}>
                สินค้าของคุณถูกส่งให้แอดมินตรวจสอบแล้ว<br/>
                จะได้รับการอนุมัติภายใน 1-2 วันทำการ
              </p>
              <div style={{ display:"flex", gap:"12px", justifyContent:"center" }}>
                <button className="btn-gold" onClick={() => { setForm({ name:"", short_desc:"", description:"", price:"", image_url:"", category:"", product_url:"", sku:"" }); setSuccess(false); }}>
                  ✦ เพิ่มสินค้าอีก
                </button>
                <Link href="/producer/dashboard" className="btn-ghost" style={{ textDecoration:"none" }}>
                  กลับ Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom:"32px" }}>
                <Link href="/producer/dashboard" style={{ color:"var(--muted2)", fontSize:"12px", textDecoration:"none", display:"inline-flex", alignItems:"center", gap:"6px", marginBottom:"16px" }}>
                  ← กลับ Dashboard
                </Link>
                <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"28px", fontWeight:300 }}>เพิ่มสินค้าใหม่</h1>
                <div className="tag">กรอกข้อมูลสินค้า — แอดมินจะตรวจสอบก่อนเผยแพร่</div>
              </div>

              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"4px", padding:"32px" }}>

                {/* Basic Info */}
                <div style={{ marginBottom:"24px", paddingBottom:"24px", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, marginBottom:"16px", color:"var(--gold)" }}>ข้อมูลพื้นฐาน</div>

                  <div className="form-group">
                    <label className="form-label">ชื่อสินค้า <span style={{ color:"var(--red)" }}>*</span></label>
                    <input placeholder="ชื่อสินค้าที่ชัดเจน" value={form.name} onChange={e => set("name", e.target.value)}/>
                  </div>

                  <div className="form-group">
                    <label className="form-label">คำอธิบายสั้น</label>
                    <input placeholder="1-2 ประโยค ที่ Affiliate ใช้แนะนำสินค้า" value={form.short_desc} onChange={e => set("short_desc", e.target.value)}/>
                  </div>

                  <div className="form-group">
                    <label className="form-label">รายละเอียดสินค้า</label>
                    <textarea placeholder="รายละเอียดทั้งหมดของสินค้า คุณสมบัติ ประโยชน์ วิธีใช้..."
                      value={form.description} onChange={e => set("description", e.target.value)}
                      style={{ width:"100%", minHeight:"100px", background:"var(--input)", border:"1px solid var(--border2)", borderRadius:"2px", padding:"10px 14px", color:"var(--text)", fontSize:"14px", resize:"vertical", fontFamily:"'Sarabun',sans-serif" }}/>
                  </div>
                </div>

                {/* Pricing */}
                <div style={{ marginBottom:"24px", paddingBottom:"24px", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, marginBottom:"16px", color:"var(--gold)" }}>ราคาและหมวดหมู่</div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                    <div className="form-group">
                      <label className="form-label">ราคาขาย (฿) <span style={{ color:"var(--red)" }}>*</span></label>
                      <input type="number" placeholder="999" min="1" step="1" value={form.price} onChange={e => set("price", e.target.value)}/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">หมวดหมู่</label>
                      <select value={form.category} onChange={e => set("category", e.target.value)}
                        style={{ width:"100%", background:"var(--input)", border:"1px solid var(--border2)", borderRadius:"2px", padding:"10px 14px", color:"var(--text)", fontSize:"14px" }}>
                        <option value="">-- เลือกหมวดหมู่ --</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">SKU / รหัสสินค้า (ถ้ามี)</label>
                    <input placeholder="SKU-001" value={form.sku} onChange={e => set("sku", e.target.value)}/>
                  </div>
                </div>

                {/* Links */}
                <div style={{ marginBottom:"24px" }}>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:600, marginBottom:"16px", color:"var(--gold)" }}>ลิงก์และรูปภาพ</div>

                  <div className="form-group">
                    <label className="form-label">URL รูปภาพสินค้า</label>
                    <input type="url" placeholder="https://example.com/product-image.jpg" value={form.image_url} onChange={e => set("image_url", e.target.value)}/>
                    {form.image_url && (
                      <div style={{ marginTop:"8px" }}>
                        <img src={form.image_url} alt="preview" style={{ maxWidth:"120px", maxHeight:"120px", borderRadius:"3px", border:"1px solid var(--border)" }}
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}/>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">ลิงก์หน้าสินค้า (Affiliate จะถูก redirect)</label>
                    <input type="url" placeholder="https://yourstore.com/product/..." value={form.product_url} onChange={e => set("product_url", e.target.value)}/>
                  </div>
                </div>

                {/* Commission note */}
                <div style={{ background:"rgba(240,180,41,0.06)", border:"1px solid rgba(240,180,41,0.2)", borderRadius:"3px", padding:"14px 16px", marginBottom:"24px", fontSize:"12px", color:"var(--muted2)", lineHeight:1.7 }}>
                  <strong style={{ color:"var(--gold)" }}>Commission Rate:</strong> ใช้อัตราที่ตั้งไว้สำหรับบัญชีของคุณ สามารถแก้ไขได้โดยติดต่อแอดมิน
                </div>

                {err && <div className="form-error" style={{ marginBottom:"16px" }}>{err}</div>}

                <div style={{ display:"flex", gap:"12px" }}>
                  <Link href="/producer/dashboard" className="btn-ghost" style={{ flex:1, textDecoration:"none", textAlign:"center" }}>
                    ยกเลิก
                  </Link>
                  <button className="btn-gold" style={{ flex:2 }} disabled={loading} onClick={handleSubmit}>
                    {loading ? "กำลังส่ง..." : "✦ ส่งสินค้าให้ตรวจสอบ"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
