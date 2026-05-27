"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/auth";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://openthai-ai.vercel.app";

type CopyItem = {
  id:       string;
  channel:  string;
  emoji:    string;
  label:    string;
  color:    string;
  getText:  (link: string) => string;
};

const TEMPLATES: CopyItem[] = [
  {
    id: "tiktok",
    channel: "TikTok",
    emoji: "🎵",
    label: "TikTok Caption",
    color: "#010101",
    getText: (link) =>
`AI สร้างสคริปต์ TikTok 30 วินาทีให้ฉันในพริบตา🔥

ลองใช้ Openthai.ai ฟรีได้เลยตอนนี้
👇 ลิงก์ด้านล่าง

${link}

#Openthai #AI #TikTokTips #ContentCreator #ไทย`,
  },
  {
    id: "line",
    channel: "LINE",
    emoji: "💬",
    label: "LINE Message",
    color: "#06C755",
    getText: (link) =>
`สวัสดีครับ/ค่ะ 👋

แนะนำเครื่องมือ AI ที่ใช้แล้วประหยัดเวลามากครับ
📱 Openthai.ai — สร้างสคริปต์ TikTok ภาษาไทยใน 30 วิ

✅ ฟรี 3 คอนเทนต์/วัน
✅ ครอบคลุม 300+ สินค้าไทยและโกลบอล
✅ AI Critic ให้คะแนนให้อัตโนมัติ

ลองใช้ได้ที่นี่เลย: ${link}`,
  },
  {
    id: "facebook",
    channel: "Facebook",
    emoji: "👤",
    label: "Facebook Post",
    color: "#1877F2",
    getText: (link) =>
`ถ้าคุณทำคอนเทนต์ TikTok อยู่ — ต้องลองตัวนี้เลยครับ 👇

Openthai.ai ใช้ AI สร้างสคริปต์ TikTok 30 วิสำหรับสินค้าไทยและสินค้าทั่วโลก
ไม่ต้องนั่งคิดนาน — กดปุ๊บได้ปั๊บ พร้อมแฮชแท็กและแคปชั่นด้วย

ลองใช้ฟรีได้ที่: ${link}

#AI #TikTok #ContentMarketing #Openthai`,
  },
  {
    id: "instagram",
    channel: "Instagram",
    emoji: "📸",
    label: "Instagram Bio / Story",
    color: "#E1306C",
    getText: (link) =>
`สร้างสคริปต์ TikTok ด้วย AI ภาษาไทย 🇹🇭
ฟรี 3 คอนเทนต์/วัน → ${link}`,
  },
  {
    id: "review",
    channel: "รีวิว",
    emoji: "⭐",
    label: "Review Copy (ยาว)",
    color: "#F0B429",
    getText: (link) =>
`รีวิว Openthai.ai — เครื่องมือ AI สร้างคอนเทนต์ TikTok สำหรับสินค้าไทย

ใช้มาได้สักพักแล้วบอกเลยว่าประหยัดเวลามากจริงๆ ปกติเขียนสคริปต์ TikTok ต้องใช้เวลาเป็นชั่วโมง แต่พอใช้ AI ตัวนี้ใช้เวลาแค่ไม่ถึงนาที

สิ่งที่ชอบ:
• สคริปต์ 30 วิ แบ่ง Hook 3 วิ + Story 20 วิ + CTA 7 วิ ครบ
• มีสินค้าไทย OTOP + สินค้าจีน + สินค้า Global มากกว่า 300 รายการ
• AI ให้คะแนนสคริปต์อัตโนมัติ (ต้องได้ ≥ 7/10)
• มาพร้อม 10 แฮชแท็กและแคปชั่นพร้อมโพสต์

ราคา: ฟรี 3 คอนเทนต์/วัน หรือ Pro ฿149/เดือน

สมัครและลองฟรีได้เลย: ${link}`,
  },
];

export default function MediaKit() {
  const router  = useRouter();
  const [ref,     setRef]     = useState("");
  const [loading, setLoading] = useState(true);
  const [copied,  setCopied]  = useState<string | null>(null);
  const [toast,   setToast]   = useState("");

  const load = useCallback(async () => {
    const p = await getProfile();
    if (!p) { router.push("/"); return; }
    setRef(p.ref_code);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const affLink = (ch: string) =>
    `${APP}/api/track?ref=${ref}&ch=${ch}&redirect=${APP}`;

  const demoLink = `${APP}/api/track?ref=${ref}&ch=demo&redirect=${APP}/?demo=1`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setToast("Copied — แปะได้เลย!");
    setTimeout(() => { setCopied(null); setToast(""); }, 2500);
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:"12px",letterSpacing:"3px",color:"var(--muted2)"}}>LOADING...</div>
    </div>
  );

  return (
    <>
      <nav className="nav">
        <Link href="/dashboard" className="nav-logo"><span className="nav-dot"/>Affiliate Hub</Link>
        <div className="nav-links">
          <Link href="/dashboard"   className="nav-link">Dashboard</Link>
          <Link href="/leaderboard" className="nav-link">Leaderboard</Link>
          <Link href="/media-kit"   className="nav-link active">Media Kit</Link>
        </div>
        <div className="nav-balance">Ref: <strong>{ref}</strong></div>
      </nav>

      <main style={{padding:"48px 0 80px"}}>
        <div className="wrap">

          {/* Header */}
          <div style={{textAlign:"center",marginBottom:"48px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",marginBottom:"16px"}}>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
              <span className="tag">Promo Assets</span>
              <div style={{height:"1px",width:"32px",background:"var(--border)"}}/>
            </div>
            <h1 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:"clamp(30px,5vw,50px)",fontWeight:300,marginBottom:"8px"}}>
              <em style={{fontStyle:"italic",color:"var(--gold)",fontWeight:600}}>Media Kit</em> — สื่อพร้อมใช้
            </h1>
            <p style={{fontSize:"14px",color:"var(--muted2)",maxWidth:"420px",margin:"12px auto 0",lineHeight:1.8}}>
              Copy ข้อความ → แปะ → โพสต์ได้เลย
              ลิงก์ affiliate ของคุณฝังอยู่ทุกชิ้นแล้ว
            </p>
          </div>

          {/* AI Demo Link — สำคัญมาก */}
          <div style={{border:"1px solid var(--border2)",borderRadius:"3px",padding:"28px",marginBottom:"28px",background:"rgba(240,180,41,0.04)"}}>
            <div className="card-head">AI Demo Link — ให้คนลองก่อนซื้อ</div>
            <p style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.8,marginBottom:"20px"}}>
              แชร์ลิงก์นี้เพื่อให้คนลองใช้ Openthai.ai ฟรีก่อน —
              conversion สูงกว่าลิงก์ทั่วไปเพราะลูกค้าเห็นของก่อนจ่ายเงิน
            </p>
            <div style={{background:"var(--card)",border:"1px solid var(--border)",borderRadius:"2px",padding:"14px 16px",marginBottom:"14px"}}>
              <div className="tag" style={{display:"block",marginBottom:"6px"}}>Demo Link (ref ของคุณฝังอยู่แล้ว)</div>
              <div className="mono" style={{color:"var(--gold-l)",wordBreak:"break-all",fontSize:"11px",lineHeight:1.6}}>
                {demoLink}
              </div>
            </div>
            <button
              onClick={() => handleCopy(demoLink, "demo")}
              className={`btn-gold${copied==="demo"?" copied":""}`}
              style={{padding:"10px 24px",fontSize:"13px",color:copied==="demo"?"var(--green)":"",borderColor:copied==="demo"?"var(--green)":""}}>
              {copied==="demo" ? "Copied ✓" : "Copy Demo Link"}
            </button>
          </div>

          {/* Copy Templates */}
          <div className="divider"><div className="divider-line"/><div className="divider-label">Copy Templates — คลิก Copy แปะได้เลย</div><div className="divider-line"/></div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))",gap:"16px"}}>
            {TEMPLATES.map(t => {
              const text = t.getText(affLink(t.id));
              const isCopied = copied === t.id;
              return (
                <div key={t.id} className="card">
                  <div className="card-head">
                    <span style={{fontSize:"16px"}}>{t.emoji}</span>
                    {t.label}
                    <span className="badge badge-muted" style={{marginLeft:"auto",marginRight:0}}>{t.channel}</span>
                  </div>

                  <pre style={{
                    background:"var(--card)",border:"1px solid var(--border)",borderRadius:"2px",
                    padding:"14px 16px",fontSize:"12px",lineHeight:1.8,
                    color:"var(--text)",whiteSpace:"pre-wrap",wordBreak:"break-word",
                    fontFamily:"'Sarabun',sans-serif",marginBottom:"14px",
                    maxHeight:"200px",overflowY:"auto",
                  }}>
                    {text}
                  </pre>

                  <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                    <button
                      onClick={() => handleCopy(text, t.id)}
                      className="btn-gold"
                      style={{
                        flex:1,justifyContent:"center",fontSize:"13px",padding:"10px 16px",
                        color:isCopied?"var(--green)":"",
                        borderColor:isCopied?"var(--green)":"",
                      }}>
                      {isCopied ? "Copied ✓" : `Copy ${t.channel} Copy`}
                    </button>
                    <button
                      onClick={() => handleCopy(affLink(t.id), t.id + "_link")}
                      className="btn-ghost"
                      style={{padding:"10px 14px",fontSize:"10px"}}
                      title="Copy ลิงก์อย่างเดียว">
                      🔗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Channel Tracking Note */}
          <div style={{marginTop:"28px",padding:"20px 24px",border:"1px solid var(--border)",borderRadius:"3px",background:"var(--surface)"}}>
            <div className="card-head">Channel Tracking — ติดตามอัตโนมัติ</div>
            <p style={{fontSize:"13px",color:"var(--muted2)",lineHeight:1.8}}>
              ลิงก์แต่ละช่องทางมีการบันทึก <span style={{color:"var(--gold-l)",fontFamily:"'DM Mono',monospace",fontSize:"11px"}}>ch=tiktok</span> / <span style={{color:"var(--gold-l)",fontFamily:"'DM Mono',monospace",fontSize:"11px"}}>ch=line</span> / <span style={{color:"var(--gold-l)",fontFamily:"'DM Mono',monospace",fontSize:"11px"}}>ch=facebook</span> อัตโนมัติ
              — ในอนาคตจะเห็นใน Dashboard ว่าช่องไหนให้ conversion ดีที่สุด
            </p>
          </div>

        </div>
      </main>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
