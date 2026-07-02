import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const CATEGORIES = ['OTOP', 'อาหาร', 'ความงาม', 'สิ่งทอ', 'เครื่องดื่ม', 'สมุนไพร', 'เครื่องประดับ', 'เฟอร์นิเจอร์', 'เกษตร', 'อื่นๆ'];

const T = {
  th: { title:'ทางเข้าผู้บริโภค', sub:'สมัครรับสิทธิพิเศษ ส่วนลด และสินค้าใหม่จากผู้ผลิตไทยก่อนใคร', benefits:['ส่วนลดพิเศษเฉพาะสมาชิก','แจ้งเตือนสินค้าใหม่ก่อนใคร','คำแนะนำสินค้าตรงใจด้วย AI','เข้าถึงร้านค้า/ผู้ผลิตที่ผ่านการรับรอง'], form:{ name:'ชื่อ', country:'ประเทศ', category:'หมวดสินค้าที่สนใจ', email:'อีเมล', submit:'สมัครเป็นผู้บริโภค', ok:'ยินดีต้อนรับ! เราจะแจ้งสินค้าและโปรโมชั่นที่ตรงใจให้ทางอีเมล' } },
  en: { title:'Consumer Portal', sub:'Sign up for exclusive deals, discounts, and early access to new Thai products', benefits:['Member-only discounts','Early access to new products','AI-personalized recommendations','Access to verified producers'], form:{ name:'Name', country:'Country', category:'Category of Interest', email:'Email', submit:'Join as Consumer', ok:'Welcome! We\'ll email you deals and products matched to your interests.' } },
  zh: { title:'消费者门户', sub:'注册获取专属优惠、折扣及泰国新产品优先体验', benefits:['会员专属折扣','新产品优先体验','AI个性化推荐','接触认证生产商'], form:{ name:'姓名', country:'国家', category:'感兴趣的类别', email:'邮箱', submit:'注册为消费者', ok:'欢迎！我们将通过邮件发送符合您兴趣的产品和优惠。' } },
};

export default function ConsumerPortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ name:'', country:'', category:'OTOP', email:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'consumer', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← กลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#06b6d4':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🛍️</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#06b6d4', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#06b6d4', marginBottom:20 }}>สิทธิประโยชน์</h3>
            {t.benefits.map((b,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#06b6d4' }}>✓</span><span style={{ color:'#ddd' }}>{b}</span></div>)}
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #06b6d433' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['name',t.form.name,'text'],['country',t.form.country,'text'],['email',t.form.email,'email']].map(([k,label,type]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input type={type} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.category}</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14 }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button type="submit" style={{ width:'100%', background:'#06b6d4', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer', marginTop:8 }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
