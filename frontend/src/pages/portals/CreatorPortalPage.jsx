import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const T = {
  th: { title:'ทางเข้าผู้ร่วมสร้างคอนเทนต์', sub:'ร่วมสร้างคอนเทนต์ AI จากทุกแพลตฟอร์ม ไม่จำกัดประเทศ', platforms:['TikTok','Instagram','YouTube','Facebook','X (Twitter)','LinkedIn','Twitch','Other'], benefits:['AI ช่วยสร้างคอนเทนต์ฟรี','Trending analysis แบบ real-time','ระบบ scheduling อัตโนมัติ','รายได้จาก creator program'], form:{ name:'ชื่อ / Channel Name', country:'ประเทศ', platform:'แพลตฟอร์มหลัก', followers:'จำนวน Followers (โดยประมาณ)', email:'อีเมล', submit:'เข้าร่วม Creator Program', ok:'ยินดีต้อนรับ! ตรวจสอบอีเมลของท่านเพื่อรับ access ครับ' } },
  en: { title:'Content Creator Portal', sub:'Create AI-powered content across all platforms, worldwide', platforms:['TikTok','Instagram','YouTube','Facebook','X (Twitter)','LinkedIn','Twitch','Other'], benefits:['Free AI content creation tools','Real-time trending analysis','Automated scheduling system','Income from creator program'], form:{ name:'Name / Channel Name', country:'Country', platform:'Primary Platform', followers:'Followers Count (approx.)', email:'Email', submit:'Join Creator Program', ok:'Welcome! Check your email for access details.' } },
  zh: { title:'内容创作者门户', sub:'利用AI跨平台创作内容，面向全球', platforms:['TikTok','Instagram','YouTube','Facebook','X (Twitter)','LinkedIn','Twitch','其他'], benefits:['免费AI内容创作工具','实时热点分析','自动排期系统','创作者计划收入'], form:{ name:'姓名/频道名', country:'国家', platform:'主要平台', followers:'粉丝数量（大约）', email:'邮箱', submit:'加入创作者计划', ok:'欢迎！请查看您的邮件获取访问详情。' } },
};

export default function CreatorPortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ name:'', country:'', platform:'TikTok', followers:'', email:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'creator', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← กลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#ec4899':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🎨</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#ec4899', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#ec4899', marginBottom:20 }}>สิทธิประโยชน์</h3>
            {t.benefits.map((b,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#ec4899' }}>✓</span><span style={{ color:'#ddd' }}>{b}</span></div>)}
            <h3 style={{ color:'#ec4899', margin:'28px 0 16px' }}>Platforms</h3>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {t.platforms.map(p => <span key={p} style={{ background:'#1a1a2e', border:'1px solid #ec489933', color:'#ec4899', padding:'6px 14px', borderRadius:20, fontSize:13 }}>{p}</span>)}
            </div>
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #ec489933' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['name',t.form.name,'text'],['country',t.form.country,'text'],['followers',t.form.followers,'number'],['email',t.form.email,'email']].map(([k,label,type]) => (
                <div key={k} style={{ marginBottom:16 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input type={type} required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.platform}</label>
                <select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14 }}>
                  {t.platforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <button type="submit" style={{ width:'100%', background:'#ec4899', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer', marginTop:8 }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
