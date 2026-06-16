import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const ORGS = ['United Nations (UN)','ASEAN','World Bank','IMF','WHO','UNESCO','UNICEF','ADB','UNDP','WTO','Other'];

const T = {
  en: { title:'International Organization Portal', sub:'Partnering with global institutions to advance AI for humanity', desc:'OpenThai.ai welcomes partnerships with UN agencies, ASEAN bodies, development banks, and all international organizations committed to sustainable development and digital inclusion.', services:['SDG-aligned AI programs','Digital inclusion initiatives','Capacity building workshops','Research & data partnerships','Humanitarian AI applications'], form:{ org:'Organization Name', type:'Organization Type', country:'Headquarters Country', name:'Contact Person', position:'Title', email:'Official Email', focus:'Focus Area / SDG Goal', submit:'Submit Partnership Request', ok:'Thank you! Our Partnerships team will respond within 72 hours.' } },
  th: { title:'ทางเข้าองค์กรระหว่างประเทศ', sub:'ร่วมมือกับองค์กรระหว่างประเทศเพื่อ AI เพื่อมนุษยชาติ', desc:'OpenThai.ai ยินดีต้อนรับความร่วมมือกับองค์กรสหประชาชาติ อาเซียน ธนาคารพัฒนา และองค์กรระหว่างประเทศทุกแห่ง', services:['โปรแกรม AI สอดคล้องกับ SDG','โครงการ Digital Inclusion','การอบรมสร้างศักยภาพ','ความร่วมมือด้านวิจัยและข้อมูล','การประยุกต์ AI เพื่อมนุษยธรรม'], form:{ org:'ชื่อองค์กร', type:'ประเภทองค์กร', country:'ประเทศที่ตั้งสำนักงานใหญ่', name:'ผู้ติดต่อ', position:'ตำแหน่ง', email:'อีเมลทางการ', focus:'ด้านที่ให้ความสำคัญ / เป้าหมาย SDG', submit:'ส่งคำขอความร่วมมือ', ok:'ขอบคุณ! ทีม Partnerships จะตอบกลับภายใน 72 ชม.' } },
  zh: { title:'国际组织门户', sub:'与全球机构合作，推进为人类服务的AI', desc:'OpenThai.ai欢迎与联合国机构、东盟、开发银行及所有致力于可持续发展和数字包容的国际组织建立合作关系。', services:['符合SDG的AI项目','数字包容计划','能力建设研讨会','研究与数据合作','人道主义AI应用'], form:{ org:'组织名称', type:'组织类型', country:'总部所在国', name:'联系人', position:'职务', email:'官方邮箱', focus:'重点领域/SDG目标', submit:'提交合作申请', ok:'谢谢！我们的合作团队将在72小时内回复。' } },
};

export default function IntlOrgPortalPage() {
  const [lang, setLang] = useState('en');
  const [form, setForm] = useState({ org:'', type:'United Nations (UN)', country:'', name:'', position:'', email:'', focus:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'intl-org', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← Back</button>
        <div style={{ display:'flex', gap:8 }}>
          {['en','th','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#8b5cf6':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🏛️</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#8b5cf6', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18, maxWidth:600, margin:'0 auto' }}>{t.sub}</p>
        </div>
        <div style={{ background:'#8b5cf611', border:'1px solid #8b5cf633', borderRadius:12, padding:20, marginBottom:32, textAlign:'center' }}>
          <p style={{ color:'#c4b5fd', margin:0, fontSize:15 }}>{t.desc}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#8b5cf6', marginBottom:20 }}>Partnership Areas</h3>
            {t.services.map((s,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#8b5cf6' }}>▸</span><span style={{ color:'#ddd' }}>{s}</span></div>)}
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #8b5cf633' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.org}</label>
                <input required value={form.org} onChange={e=>setForm({...form,org:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.type}</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14 }}>
                  {ORGS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {[['country',t.form.country],['name',t.form.name],['position',t.form.position],['email',t.form.email]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.focus}</label>
                <textarea rows={2} value={form.focus} onChange={e=>setForm({...form,focus:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box', resize:'vertical' }} />
              </div>
              <button type="submit" style={{ width:'100%', background:'#8b5cf6', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer' }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
