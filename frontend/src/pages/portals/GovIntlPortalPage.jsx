import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const T = {
  en: { title:'Foreign Government Agency Portal', sub:'AI collaboration for governments worldwide — no country restrictions', services:['Bilateral AI cooperation agreements','Government-to-Government (G2G) programs','AI policy consultation','Secure data exchange systems','Multilingual AI services'], form:{ agency:'Agency / Ministry Name', country:'Country', name:'Contact Person', position:'Title / Position', email:'Official Email', phone:'Phone / WhatsApp', need:'Cooperation Area of Interest', submit:'Submit G2G Request', ok:'Thank you! Our International Relations team will contact you within 48 hours.' } },
  th: { title:'ทางเข้าหน่วยงานรัฐต่างประเทศ', sub:'ความร่วมมือ AI สำหรับรัฐบาลทั่วโลก ไม่จำกัดประเทศ', services:['ข้อตกลงความร่วมมือ AI ทวิภาคี','โปรแกรม G2G','ที่ปรึกษานโยบาย AI','ระบบแลกเปลี่ยนข้อมูลที่ปลอดภัย','บริการ AI หลายภาษา'], form:{ agency:'ชื่อหน่วยงาน/กระทรวง', country:'ประเทศ', name:'ผู้ติดต่อ', position:'ตำแหน่ง', email:'อีเมลราชการ', phone:'โทรศัพท์/WhatsApp', need:'ด้านที่สนใจร่วมมือ', submit:'ส่งคำขอความร่วมมือ G2G', ok:'ขอบคุณ! ทีม International Relations จะติดต่อกลับภายใน 48 ชม.' } },
  zh: { title:'外国政府机构门户', sub:'面向全球政府的AI合作，无国家限制', services:['双边AI合作协议','政府间（G2G）项目','AI政策咨询','安全数据交换系统','多语言AI服务'], form:{ agency:'机构/部门名称', country:'国家', name:'联系人', position:'职务/职位', email:'官方邮箱', phone:'电话/WhatsApp', need:'感兴趣的合作领域', submit:'提交G2G申请', ok:'谢谢！我们的国际关系团队将在48小时内与您联系。' } },
};

export default function GovIntlPortalPage() {
  const [lang, setLang] = useState('en');
  const [form, setForm] = useState({ agency:'', country:'', name:'', position:'', email:'', phone:'', need:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'gov-intl', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← Back</button>
        <div style={{ display:'flex', gap:8 }}>
          {['en','th','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#3b82f6':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🌐</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#3b82f6', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#3b82f6', marginBottom:20 }}>Services</h3>
            {t.services.map((s,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#3b82f6' }}>▸</span><span style={{ color:'#ddd' }}>{s}</span></div>)}
            <div style={{ background:'#3b82f611', border:'1px solid #3b82f633', borderRadius:12, padding:20, marginTop:24 }}>
              <p style={{ color:'#3b82f6', fontWeight:700, margin:'0 0 8px' }}>🔒 Secure & Confidential</p>
              <p style={{ color:'#aaa', fontSize:13, margin:0 }}>All communications are encrypted. NDA available upon request.</p>
            </div>
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #3b82f633' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['agency',t.form.agency],['country',t.form.country],['name',t.form.name],['position',t.form.position],['email',t.form.email],['phone',t.form.phone]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.need}</label>
                <textarea rows={3} value={form.need} onChange={e=>setForm({...form,need:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
              </div>
              <button type="submit" style={{ width:'100%', background:'#3b82f6', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer' }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
