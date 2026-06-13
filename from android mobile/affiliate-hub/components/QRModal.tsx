// components/QRModal.tsx
"use client";
import { useEffect, useState } from "react";
import { generatePromptPayQR } from "@/lib/promptpay";

export default function QRModal({ refCode, link, onClose }: { refCode: string; link: string; onClose: () => void }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    generatePromptPayQR(refCode, 0).then(setQr).catch(() => {});
  }, [refCode]);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(3,4,7,0.92)",backdropFilter:"blur(8px)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
         onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:"var(--base)",border:"1px solid var(--border2)",borderRadius:"4px",padding:"36px",textAlign:"center",maxWidth:"320px",width:"100%",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:"14px",right:"18px",background:"none",border:"none",color:"var(--muted2)",fontSize:"18px",cursor:"pointer"}}>✕</button>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",letterSpacing:"3px",textTransform:"uppercase",color:"var(--muted2)",marginBottom:"20px"}}>Affiliate QR Code</div>
        <div style={{background:"white",borderRadius:"8px",padding:"12px",marginBottom:"16px",display:"inline-block"}}>
          {qr ? <img src={qr} alt="QR" style={{width:"200px",display:"block"}}/> : <div style={{width:"200px",height:"200px",background:"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:"#999"}}>Loading...</div>}
        </div>
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:"10px",color:"var(--muted2)",marginBottom:"16px",wordBreak:"break-all",lineHeight:1.5}}>{refCode}</div>
        <button className="btn-ghost btn-full" onClick={()=>{navigator.clipboard.writeText(link);}}>คัดลอกลิงก์</button>
      </div>
    </div>
  );
}
