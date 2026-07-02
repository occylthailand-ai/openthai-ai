import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../apiBase';

const BUSINESS_TYPES = ['ตัวแทนจำหน่าย (Distributor)', 'ผู้ค้าส่ง (Wholesaler)', 'นายหน้า (Broker)', 'ตัวแทนขายต่อ (Reseller)', 'อื่นๆ'];

const T = {
  th: { title:'ทางเข้าคนกลาง / ตัวแทนจำหน่าย', sub:'ตัวแทนจำหน่าย ผู้ค้าส่ง นายหน้า และคนกลางทุกประเภท เข้าร่วมเครือข่ายกระจายสินค้า OpenThaiAi', benefits:['ราคาส่งพิเศษจากผู้ผลิตที่ผ่านการรับรอง','สิทธิ์ดูแลพื้นที่/ช่องทางจำหน่าย','การสนับสนุนด้านการตลาดและคอนเทนต์','เชื่อมต่อกับผู้ผลิตโดยตรง ไม่ผ่านคนกลางซ้ำซ้อน'], form:{ name:'ชื่อ/ชื่อบริษัท', country:'ประเทศ', business_type:'ประเภทธุรกิจ', region:'พื้นที่/ช่องทางที่ดูแล', email:'อีเมล', phone:'เบอร์โทร/WhatsApp', submit:'สมัครเป็นคนกลาง', ok:'ขอบคุณ! ทีมงานจะติดต่อกลับเพื่อยืนยันการเข้าร่วมเครือข่าย' } },
  en: { title:'Distributor / Intermediary Portal', sub:'Distributors, wholesalers, brokers, and resellers of every kind — join the OpenThaiAi distribution network', benefits:['Special wholesale pricing from verified producers','Territory/channel rights','Marketing and content support','Direct connection to producers, no redundant middlemen'], form:{ name:'Name / Company Name', country:'Country', business_type:'Business Type', region:'Territory / Channel Covered', email:'Email', phone:'Phone / WhatsApp', submit:'Join as Distributor', ok:'Thank you! Our team will contact you to confirm your place in the network.' } },
  zh: { title:'经销商/中间商门户', sub:'经销商、批发商、经纪人及各类中间商 — 加入OpenThaiAi分销网络', benefits:['来自认证生产商的特殊批发价','区域/渠道权益','营销与内容支持','直接对接生产商，减少中间环节'], form:{ name:'姓名/公司名称', country:'国家', business_type:'业务类型', region:'负责区域/渠道', email:'邮箱', phone:'电话/WhatsApp', submit:'注册为经销商', ok:'谢谢！我们的团队将与您联系以确认加入网络。' } },
};

export default function MiddlemanPortalPage() {
  const [lang, setLang] = useState('th');
  const [form, setForm] = useState({ name:'', country:'', business_type:BUSINESS_TYPES[0], region:'', email:'', phone:'' });
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const t = T[lang];

  const submit = async e => {
    e.preventDefault();
    try { await fetch(apiUrl('/api/leads/submit'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form, type:'middleman', lang}) }); } catch {}
    setSent(true);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0f', color:'#fff', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid #1e1e2e' }}>
        <button onClick={() => navigate('/portals')} style={{ background:'none', border:'1px solid #333', color:'#aaa', padding:'8px 16px', borderRadius:8, cursor:'pointer' }}>← กลับ</button>
        <div style={{ display:'flex', gap:8 }}>
          {['th','en','zh'].map(l => <button key={l} onClick={() => setLang(l)} style={{ background:lang===l?'#f97316':'none', border:'1px solid #333', color:'#fff', padding:'6px 12px', borderRadius:6, cursor:'pointer', fontSize:13 }}>{l==='th'?'ไทย':l==='en'?'English':'中文'}</button>)}
        </div>
      </div>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'48px 32px' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🔗</div>
          <h1 style={{ fontSize:36, fontWeight:800, color:'#f97316', margin:'0 0 12px' }}>{t.title}</h1>
          <p style={{ color:'#aaa', fontSize:18 }}>{t.sub}</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:32 }}>
          <div>
            <h3 style={{ color:'#f97316', marginBottom:20 }}>สิทธิประโยชน์</h3>
            {t.benefits.map((b,i) => <div key={i} style={{ display:'flex', gap:12, marginBottom:14, background:'#111', padding:'14px 18px', borderRadius:10 }}><span style={{ color:'#f97316' }}>✓</span><span style={{ color:'#ddd' }}>{b}</span></div>)}
          </div>
          <div style={{ background:'#111', borderRadius:16, padding:28, border:'1px solid #f9731633' }}>
            {sent ? <div style={{ textAlign:'center', padding:32 }}><div style={{ fontSize:48 }}>✅</div><p style={{ color:'#10b981', marginTop:16 }}>{t.form.ok}</p></div> :
            <form onSubmit={submit}>
              {[['name',t.form.name],['country',t.form.country],['region',t.form.region],['email',t.form.email],['phone',t.form.phone]].map(([k,label]) => (
                <div key={k} style={{ marginBottom:14 }}>
                  <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{label}</label>
                  <input required value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14, boxSizing:'border-box' }} />
                </div>
              ))}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:'block', color:'#aaa', fontSize:13, marginBottom:6 }}>{t.form.business_type}</label>
                <select value={form.business_type} onChange={e=>setForm({...form,business_type:e.target.value})} style={{ width:'100%', background:'#1a1a2e', border:'1px solid #333', color:'#fff', padding:'10px 14px', borderRadius:8, fontSize:14 }}>
                  {BUSINESS_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <button type="submit" style={{ width:'100%', background:'#f97316', color:'#fff', border:'none', padding:'14px', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer', marginTop:8 }}>{t.form.submit}</button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}
