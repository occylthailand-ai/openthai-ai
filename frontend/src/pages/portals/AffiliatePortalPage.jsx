import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const T = {
  th: { title:'ทางเข้าผู้ขาย / Affiliate', sub:'ขายสินค้าจาก OpenThai.ai และรับค่าคอมมิชชั่นสูงสุด 30%', benefits:['คอมมิชชั่นสูงสุด 30% ต่อการขาย','Dashboard ติดตาม real-time','ลิงก์ referral เฉพาะของคุณ','รับเงินผ่านระบบอัตโนมัติ'], tiers:[{name:'Starter',rate:'10%',min:'0 ฿'},{name:'Pro',rate:'20%',min:'50,000 ฿'},{name:'Elite',rate:'30%',min:'200,000 ฿'}], form:{ name:'ชื่อ-นามสกุล', country:'ประเทศ', platform:'แพลตฟอร์มที่ใช้โปรโมท', email:'อีเมล', submit:'สมัคร Affiliate', ok:'สมัครเรียบร้อย! ลิงก์ Affiliate จะส่งไปยังอีเมลของท่าน' } },
  en: { title:'Seller / Affiliate Portal', sub:'Sell OpenThai.ai products and earn up to 30% commission', benefits:['Up to 30% commission per sale','Real-time tracking dashboard','Personalized referral link','Automated payouts'], tiers:[{name:'Starter',rate:'10%',min:'0 ฿'},{name:'Pro',rate:'20%',min:'50,000 ฿'},{name:'Elite',rate:'30%',min:'200,000 ฿'}], form:{ name:'Full Name', country:'Country', platform:'Promotion Platform', email:'Email', submit:'Apply as Affiliate', ok:'Application received! Your affiliate link will be sent to your email.' } },
  zh: { title:'卖家/联盟门户', sub:'销售OpenThai.ai产品，赚取高达30%的佣金', benefits:['每次销售最高30%佣金','实时追踪仪表板','专属推荐链接','自动结算'], tiers:[{name:'入门级',rate:'10%',min:'0 ฿'},{name:'专业级',rate:'20%',min:'50,000 ฿'},{name:'精英级',rate:'30%',min:'200,000 ฿'}], form:{ name:'姓名', country:'国家', platform:'推广平台', email:'邮箱', submit:'申请联盟', ok:'申请已收到！您的联盟链接将发送到您的邮箱。' } },
};

export default function AffiliatePortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ name:'', country:'', platform:'', email:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'affiliate', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← กลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#f59e0b':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🤝</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#f59e0b', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        {/* Tiers */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:40 }}>
          {t.tiers.map((tier,i) => (
            <div key={i} style={{ background:'#111', border:`1px solid ${i===2?'#f59e0b':'#333'}`, borderRadius:12, padding:20, textAlign:'center' }}>
              <div style={{ color: i===2?'#f59e0b':'#aaa', fontWeight:700, fontSize:16, marginBottom:8 }}>{tier.name}</div>
              <div style={{ color:'#fff', fontSize:32, fontWeight:800 }}>{tier.rate}</div>
              <div style={{ color:'#666', fontSize:12, marginTop:4 }}>ยอดขาย {tier.min}+</div>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#f59e0b', marginBottom:20 }}>สิทธิประโยชน์</h3>
            {t.benefits.map((b,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#f59e0b' }}>✓</span><span style={{ color:'#ddd' }}>{b}</span></div>)}
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #f59e0b33' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['name',t.form.name],['country',t.form.country],['platform',t.form.platform],['email',t.form.email]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <button type="submit" style={{ width:'100%', background:'#f59e0b', color:'#000', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer', marginTop:8 }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
