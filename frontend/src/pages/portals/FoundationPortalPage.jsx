import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const T = {
  th: {
    title: 'ทางเข้ามูลนิธิเพื่อสังคม',
    sub: 'OpenThai.ai แบ่งปันกำไรให้มูลนิธิช่วยเหลือผู้ยากไร้เมื่อกำไรรวมเกิน 10 ล้านบาท',
    badge: '⚡ เปิดใช้งานอัตโนมัติเมื่อกำไร > 10,000,000 ฿',
    how: ['OpenThai.ai สร้างกำไรรวมเกิน 10 ล้านบาท','ระบบโอนเงินอัตโนมัติ 5% ของกำไรส่วนเกินไปยังกองทุนมูลนิธิ','มูลนิธิที่ลงทะเบียนไว้จะได้รับการจัดสรรตามสัดส่วน','โปร่งใส ตรวจสอบได้ผ่าน Dashboard'],
    benefits: ['รับเงินสนับสนุนอัตโนมัติ','เข้าถึง AI tools ฟรีสำหรับงานสังคม','ร่วมโครงการ AI เพื่อผู้ยากไร้','รายงานโปร่งใสทุกไตรมาส'],
    form: { name:'ชื่อมูลนิธิ', reg:'เลขทะเบียนมูลนิธิ', country:'ประเทศ', focus:'กลุ่มเป้าหมายที่ช่วยเหลือ', contact:'ชื่อผู้ติดต่อ', email:'อีเมล', submit:'ลงทะเบียนมูลนิธิ', ok:'ลงทะเบียนเรียบร้อย! จะได้รับการแจ้งเตือนเมื่อกองทุนเปิดใช้งาน' },
  },
  en: {
    title: 'Foundation & NGO Portal',
    sub: 'OpenThai.ai shares profits with poverty-relief foundations when cumulative profit exceeds 10M THB',
    badge: '⚡ Auto-activated when profit > 10,000,000 THB',
    how: ['OpenThai.ai cumulative profit exceeds 10M THB','System auto-transfers 5% of excess profit to foundation fund','Registered foundations receive proportional allocation','Fully transparent — auditable via Dashboard'],
    benefits: ['Automatic financial support','Free AI tools for social work','Participation in AI-for-poverty programs','Quarterly transparent reports'],
    form: { name:'Foundation Name', reg:'Registration Number', country:'Country', focus:'Target Beneficiaries', contact:'Contact Person', email:'Email', submit:'Register Foundation', ok:'Registered! You will be notified when the fund activates.' },
  },
  zh: {
    title: '基金会/NGO门户',
    sub: '当OpenThai.ai累计利润超过1000万泰铢时，将向扶贫基金会分享利润',
    badge: '⚡ 利润超过10,000,000泰铢时自动激活',
    how: ['OpenThai.ai累计利润超过1000万泰铢','系统自动将超额利润的5%转入基金会基金','注册的基金会按比例获得分配','完全透明 — 可通过Dashboard审计'],
    benefits: ['自动财务支持','免费AI工具用于社会工作','参与扶贫AI项目','季度透明报告'],
    form: { name:'基金会名称', reg:'注册编号', country:'国家', focus:'受益群体', contact:'联系人', email:'邮箱', submit:'注册基金会', ok:'注册成功！基金激活时将通知您。' },
  },
};

export default function FoundationPortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ name:'', reg:'', country:'', focus:'', contact:'', email:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'foundation', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← กลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#059669':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>💚</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#059669', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18, maxWidth:640, margin:'0 auto 20px' }}>{t.sub}</p>
          <span style={{ background:'#05966922', border:'1px solid #05966966', color:'#34d399', padding:'8px 20px', borderRadius:20, fontSize:14, fontWeight:600 }}>{t.badge}</span>
        </div>
        {/* How it works */}
        <div style={{ background:'#111', border:'1px solid #05966933', borderRadius:16, padding:28, marginBottom:32 }}>
          <h3 style={{ color:'#059669', margin:'0 0 20px' }}>วิธีการทำงาน / How It Works</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
            {t.how.map((h,i) => (
              <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:16 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#059669', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, marginBottom:12 }}>{i+1}</div>
                <p style={{ color:'#aaa', fontSize:13, margin:0, lineHeight:1.6 }}>{h}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.3fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#059669', marginBottom:20 }}>สิทธิประโยชน์</h3>
            {t.benefits.map((b,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#059669' }}>💚</span><span style={{ color:'#ddd' }}>{b}</span></div>)}
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #05966933' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['name',t.form.name],['reg',t.form.reg],['country',t.form.country],['focus',t.form.focus],['contact',t.form.contact],['email',t.form.email]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <button type="submit" style={{ width:'100%', background:'#059669', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer' }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
