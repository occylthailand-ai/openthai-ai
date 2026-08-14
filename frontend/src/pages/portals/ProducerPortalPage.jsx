import React, { useState, useEffect } from 'react';
import { consentLabel } from './consentLabel';
import { benefitsTitle } from './sectionTitle';
import { backLabel, backAria } from './backLabel';
import { useNavigate } from 'react-router-dom';
import { submitLead, leadError } from './submitLead';
import { PORTAL_CATEGORIES as CATEGORIES, producerCategoryLabel } from '../../data/portalCategories';
import SeasonalAnglesPanel from './SeasonalAnglesPanel';

const T = {
  th: { title:'ทางเข้าผู้ผลิต', sub:'เชื่อมต่อสินค้าของคุณกับตลาด AI ไทยและทั่วโลก', benefits:['ขายสินค้าผ่าน AI-powered store','เข้าถึงผู้ซื้อทั่วโลก','ระบบ inventory อัตโนมัติ','รายงานยอดขายแบบ real-time'], form:{ name:'ชื่อบริษัท/ผู้ผลิต', country:'ประเทศ', product:'ประเภทสินค้า/บริการ', category:'หมวดสินค้า', email:'อีเมลติดต่อ', phone:'เบอร์โทร', submit:'ลงทะเบียนผู้ผลิต', ok:'ส่งคำขอเรียบร้อย! ทีมงานจะติดต่อกลับภายใน 24 ชม.', dashboard:'📊 ดูสถานะและออเดอร์ในแดชบอร์ดของฉัน →' } },
  en: { title:'Producer Portal', sub:'Connect your products to the Thai AI market and beyond', benefits:['Sell via AI-powered store','Reach global buyers','Automated inventory system','Real-time sales reports'], form:{ name:'Company / Producer Name', country:'Country', product:'Product / Service Type', category:'Product Category', email:'Contact Email', phone:'Phone Number', submit:'Register as Producer', ok:'Request received! Our team will contact you within 24 hours.', dashboard:'📊 View my status & orders in the dashboard →' } },
  zh: { title:'生产商门户', sub:'将您的产品连接到泰国AI市场及全球', benefits:['通过AI驱动的商店销售','接触全球买家','自动库存系统','实时销售报告'], form:{ name:'公司/生产商名称', country:'国家', product:'产品/服务类型', category:'产品类别', email:'联系邮箱', phone:'电话号码', submit:'注册为生产商', ok:'申请已收到！我们的团队将在24小时内与您联系。', dashboard:'📊 在我的仪表板中查看状态和订单 →' } },
};


export default function ProducerPortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ name:'', country:'', product:'', category:'OTOP', email:'', phone:'' });
  const [sent, setSent] = useState(false);
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];
  useEffect(() => { document.title = t.title + ' — Openthai.ai'; document.documentElement.lang = lang; }, [t.title, lang]);

  const submit = async e => {
    e.preventDefault();
    setErr(''); setBusy(true);
    const r = await submitLead({ ...form, type:'producer', lang, consent });
    setBusy(false);
    if (!r.ok) { setErr(leadError(r, lang)); return; }
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }} aria-label={backAria(lang)}>{backLabel(lang)}</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en','zh'].map(l => <button key={l} onClick={() => setLang(l)} type="button" aria-pressed={lang===l} style={{ background:lang===l?'#5e61f1':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🏭</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#6366f1', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        <SeasonalAnglesPanel group="producer" lang={lang} />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#6366f1', marginBottom:20 }}>{benefitsTitle(lang)}</h3>
            {t.benefits.map((b,i) => <div key={i} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#6366f1', fontSize:20 }}>✓</span><span style={{ color:'#ddd' }}>{b}</span></div>)}
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #6366f133' }}>
            {sent ? <div role="status" style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p><button type="button" onClick={() => navigate('/producer/dashboard?email=' + encodeURIComponent(form.email))} style={{ marginTop:20, background:'#6366f1', color:'#fff', border:'none', padding:'12px 22px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}>{t.form.dashboard}</button></div> :
            <form onSubmit={submit}>
              {[['name',t.form.name],['country',t.form.country],['product',t.form.product]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <label htmlFor={k} style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input id={k} type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} inputMode={k === 'phone' ? 'tel' : undefined} autoComplete={k === 'email' ? 'email' : k === 'phone' ? 'tel' : k === 'country' ? 'country-name' : undefined} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label htmlFor="category" style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.category}</label>
                <select id="category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{producerCategoryLabel(c, lang)}</option>)}
                </select>
              </div>
              {[['email',t.form.email],['phone',t.form.phone]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <label htmlFor={k} style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input id={k} type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} inputMode={k === 'phone' ? 'tel' : undefined} autoComplete={k === 'email' ? 'email' : k === 'phone' ? 'tel' : k === 'country' ? 'country-name' : undefined} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <label style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:16, fontSize:12, color:'#aaa', lineHeight:1.5, cursor:'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} style={{ marginTop:2 }} />
                <span>{consentLabel(lang, '#a5b4fc')}</span>
              </label>
              {err && <div role="alert" style={{ background:'#3a1618', border:'1px solid #ef4444', color:'#fca5a5', padding:'10px 14px', borderRadius:8, fontSize:13, marginBottom:12 }}>⚠️ {err}</div>}
              <button type="submit" disabled={!consent || busy} style={{ width:'100%', background:'#6366f1', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor: (consent && !busy) ? 'pointer' : 'not-allowed', opacity: (consent && !busy) ? 1 : 0.5, marginTop:8 }}>{busy ? '...' : t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
