import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const T = {
  th: { title:'ทางเข้าหน่วยงานรัฐไทย', sub:'บูรณาการ AI เข้าสู่ระบบงานภาครัฐไทย เพื่อประชาชน', services:['ระบบ AI สำหรับบริการประชาชน','วิเคราะห์ข้อมูลขนาดใหญ่','แชทบอท ตอบคำถามอัตโนมัติ','รายงานและ Dashboard ราชการ','ระบบแปลภาษาข้ามพรมแดน'], form:{ agency:'ชื่อหน่วยงาน', ministry:'กระทรวง/กรม', name:'ชื่อผู้ติดต่อ', position:'ตำแหน่ง', email:'อีเมลราชการ', phone:'โทรศัพท์', need:'ความต้องการหลัก', submit:'ส่งคำขอความร่วมมือ', ok:'ขอบคุณ! ทีม Government Relations จะติดต่อกลับภายใน 48 ชม.' } },
  en: { title:'Thai Government Agency Portal', sub:'Integrate AI into Thai public services for citizens', services:['AI systems for public services','Big data analytics','Automated chatbot responses','Government reports & dashboards','Cross-border translation system'], form:{ agency:'Agency Name', ministry:'Ministry / Department', name:'Contact Person', position:'Position / Title', email:'Official Email', phone:'Phone', need:'Primary Need', submit:'Submit Cooperation Request', ok:'Thank you! Our Government Relations team will contact you within 48 hours.' } },
};

export default function GovThaiPortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ agency:'', ministry:'', name:'', position:'', email:'', phone:'', need:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang] || T.th;

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'gov-thai', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← กลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#10b981':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':'English'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🇹🇭</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#10b981', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#10b981', marginBottom:20 }}>บริการสำหรับภาครัฐ</h3>
            {t.services.map((s,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#10b981' }}>▸</span><span style={{ color:'#ddd' }}>{s}</span></div>)}
            <div style={{ background:'#10b98111', border:'1px solid #10b98133', borderRadius:12, padding:20, marginTop:24 }}>
              <p style={{ color:'#10b981', fontWeight:700, margin:'0 0 8px' }}>MOU / บันทึกความเข้าใจ</p>
              <p style={{ color:'#aaa', fontSize:13, margin:0 }}>OpenThai.ai พร้อมลงนาม MOU กับหน่วยงานรัฐทุกระดับ</p>
            </div>
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #10b98133' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['agency',t.form.agency],['ministry',t.form.ministry],['name',t.form.name],['position',t.form.position],['email',t.form.email],['phone',t.form.phone]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.need}</label>
                <textarea rows={3} value={form.need} onChange={e=>setForm({...form,need:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
              </div>
              <button type="submit" style={{ width:'100%', background:'#10b981', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer' }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
