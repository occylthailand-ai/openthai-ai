import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS  = ['TikTok','Facebook','Instagram Reels','YouTube Shorts','LINE'];
const CATEGORIES = ['OTOP','อาหาร','ความงาม','สิ่งทอ','เครื่องดื่ม','สมุนไพร','เครื่องประดับ','ทั่วไป'];
const STYLES     = [{id:'sales',label:'💰 Sales'},{id:'educational',label:'🎓 Educational'},{id:'entertainment',label:'🎭 Entertainment'}];
const SCHEDULES  = [{id:'daily',label:'📅 ทุกวัน'},{id:'weekly',label:'📆 ทุกสัปดาห์'},{id:'manual',label:'🖱️ Manual'}];
const DAYS       = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'];
const HOURS      = Array.from({length:24},(_,i)=>i);
const TABS       = [
  {id:'agents',  icon:'🤖', label:'AI Agents'},
  {id:'skills',  icon:'🧠', label:'Skills Gap'},
  {id:'monitor', icon:'📊', label:'System Monitor'},
  {id:'logs',    icon:'📋', label:'Event Log'},
];

// ─── Shared styles ────────────────────────────────────────────────────────────
const glass   = {background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:20};
const inputSt = {width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 13px',color:'#f8fafc',fontSize:13,fontFamily:"'Inter','Sarabun',sans-serif",boxSizing:'border-box',outline:'none'};
const labelSt = {display:'block',fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:5,textTransform:'uppercase',letterSpacing:0.5};

const EMPTY_FORM = {name:'',product:'',category:'OTOP',platform:'TikTok',style:'sales',lang:'ภาษาไทย',audience:'ทั่วไป',price:'',schedule:'daily',hour:18,weekDay:1,lineEnabled:false,lineUserId:''};

// ─── Helper ───────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('th-TH',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
}

function ScoreBar({value, max=100, color='#6366f1', height=6}) {
  return (
    <div style={{background:'rgba(255,255,255,0.06)',borderRadius:99,height,overflow:'hidden',flex:1}}>
      <div style={{height:'100%',width:`${(value/max)*100}%`,background:color,borderRadius:99,transition:'width .6s ease'}} />
    </div>
  );
}

function PulseDot({active, color='#10b981'}) {
  return (
    <div style={{position:'relative',width:10,height:10,flexShrink:0}}>
      <div style={{width:10,height:10,borderRadius:'50%',background:active?color:'#475569'}} />
      {active && <div style={{position:'absolute',inset:-3,borderRadius:'50%',border:`2px solid ${color}`,animation:'ping 1.5s ease-in-out infinite',opacity:0.5}} />}
    </div>
  );
}

// ─── Tab: Agents ──────────────────────────────────────────────────────────────
function TabAgents({ agents, lineStatus, loading, onRefresh, toast }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [running, setRunning]   = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const set  = k => e => setForm(f=>({...f,[k]:e.target.value}));
  const setB = k => v => setForm(f=>({...f,[k]:v}));

  const handleCreate = async () => {
    if (!form.name||!form.product){toast.error('กรุณาใส่ชื่อ Agent และสินค้า');return;}
    const res = await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    const d = await res.json();
    if(d.success){toast.success(`🤖 สร้าง Agent "${form.name}" แล้ว`);setShowForm(false);setForm(EMPTY_FORM);onRefresh();}
    else toast.error(d.message||'สร้างไม่สำเร็จ');
  };
  const handleRun = async (id,name) => {
    setRunning(id);toast.info(`⚡ กำลังรัน Agent "${name}"...`);
    const res = await fetch(`/api/agent/${id}/run`,{method:'POST'});
    const d = await res.json();
    setRunning('');
    if(d.success){toast.success(`✅ Agent "${name}" — Score: ${d.data?.criticScore}`);onRefresh();}
    else toast.error('Agent ทำงานไม่สำเร็จ');
  };
  const handleToggle = async (id,active) => {
    await fetch(`/api/agent/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!active})});
    onRefresh();toast.info(!active?'▶️ เปิด Agent แล้ว':'⏸ หยุด Agent แล้ว');
  };
  const handleDelete = async (id,name) => {
    if(!confirm(`ลบ Agent "${name}" ใช่ไหม?`))return;
    await fetch(`/api/agent/${id}`,{method:'DELETE'});
    toast.warn(`🗑 ลบ Agent "${name}" แล้ว`);onRefresh();
  };

  return (
    <div>
      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:24}}>
        {[
          {icon:'🤖',label:'Agent ทั้งหมด',val:agents.length,color:'#6366f1'},
          {icon:'✅',label:'Active',val:agents.filter(a=>a.active).length,color:'#10b981'},
          {icon:'⚡',label:'รันแล้ว',val:agents.reduce((s,a)=>s+(a.results?.length||0),0),color:'#f59e0b'},
          {icon:'⭐',label:'Avg Score',val:()=>{const sc=agents.flatMap(a=>(a.results||[]).map(r=>parseFloat(r.criticScore)||0)).filter(Boolean);return sc.length?(sc.reduce((s,x)=>s+x,0)/sc.length).toFixed(1):'-';},color:'#fe2c55'},
        ].map((s,i)=>(
          <div key={i} style={{...glass,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:22}}>{s.icon}</div>
            <div>
              <div style={{fontSize:18,fontWeight:900,color:s.color}}>{typeof s.val==='function'?s.val():s.val}</div>
              <div style={{fontSize:11,color:'#64748b'}}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:13,fontWeight:700,color:'#94a3b8'}}>
          {lineStatus?.connected && <span style={{color:'#4ade80',marginRight:12}}>💚 LINE ✅</span>}
          {agents.length} Agent{agents.length!==1?'s':''} ทั้งหมด
        </div>
        <button onClick={()=>setShowForm(true)}
          style={{background:'linear-gradient(135deg,#fe2c55,#6366f1)',border:'none',borderRadius:8,padding:'8px 18px',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700}}>
          + สร้าง Agent
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'#64748b'}}>⏳ กำลังโหลด...</div>
      ) : agents.length === 0 ? (
        <div style={{...glass,textAlign:'center',padding:'48px 20px'}}>
          <div style={{fontSize:48,marginBottom:12}}>🤖</div>
          <div style={{fontWeight:700,marginBottom:8}}>ยังไม่มี Agent</div>
          <div style={{color:'#64748b',fontSize:13,marginBottom:20}}>สร้าง Agent ตัวแรกเพื่อให้ AI สร้างคอนเทนต์แทนคุณทุกวัน</div>
          <button onClick={()=>setShowForm(true)}
            style={{background:'linear-gradient(135deg,#fe2c55,#6366f1)',border:'none',borderRadius:50,padding:'12px 28px',color:'#fff',fontWeight:700,cursor:'pointer',fontSize:14}}>
            + สร้าง Agent ตัวแรก
          </button>
        </div>
      ) : (
        <div style={{display:'grid',gap:12}}>
          {agents.map(agent=>(
            <div key={agent.id} style={{...glass,border:`1px solid ${agent.active?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.06)'}`}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <PulseDot active={agent.active} />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:14}}>{agent.name}</div>
                  <div style={{fontSize:12,color:'#64748b',marginTop:2}}>
                    📦 {agent.product} · {agent.platform} · {STYLES.find(s=>s.id===agent.style)?.label}
                  </div>
                </div>
                <div style={{padding:'4px 10px',background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:20,fontSize:11,color:'#a5b4fc',whiteSpace:'nowrap'}}>
                  {agent.schedule==='daily'?`📅 ทุกวัน ${agent.hour}:00`:agent.schedule==='weekly'?`📆 ${DAYS[agent.weekDay||1]} ${agent.hour}:00`:'🖱️ Manual'}
                </div>
                {agent.lineEnabled&&<div style={{fontSize:11,padding:'4px 8px',background:'rgba(6,197,85,0.12)',border:'1px solid rgba(6,197,85,0.3)',borderRadius:20,color:'#4ade80'}}>💚 LINE</div>}
                <div style={{display:'flex',gap:7,flexShrink:0}}>
                  <button onClick={()=>handleRun(agent.id,agent.name)} disabled={running===agent.id}
                    style={{background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,padding:'6px 12px',color:'#a5b4fc',cursor:'pointer',fontSize:12,fontWeight:700,opacity:running===agent.id?.6:1}}>
                    {running===agent.id?'⏳':'▶️'} รัน
                  </button>
                  <button onClick={()=>handleToggle(agent.id,agent.active)}
                    style={{background:agent.active?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)',border:`1px solid ${agent.active?'rgba(245,158,11,0.3)':'rgba(16,185,129,0.3)'}`,borderRadius:8,padding:'6px 10px',color:agent.active?'#fcd34d':'#34d399',cursor:'pointer',fontSize:12}}>
                    {agent.active?'⏸':'▶️'}
                  </button>
                  <button onClick={()=>handleDelete(agent.id,agent.name)}
                    style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:8,padding:'6px 10px',color:'#f87171',cursor:'pointer',fontSize:12}}>
                    🗑
                  </button>
                </div>
              </div>
              {agent.lastRun&&<div style={{marginTop:8,fontSize:11,color:'#475569'}}>รันล่าสุด: {fmtTime(agent.lastRun)}</div>}
              {agent.results?.length>0&&(
                <div style={{marginTop:10}}>
                  <button onClick={()=>setExpandedId(expandedId===agent.id?null:agent.id)}
                    style={{background:'none',border:'none',color:'#6366f1',cursor:'pointer',fontSize:12,padding:0}}>
                    {expandedId===agent.id?'▲':'▼'} ผลลัพธ์ล่าสุด ({agent.results.length} รายการ)
                  </button>
                  {expandedId===agent.id&&agent.results.slice(0,3).map((r,i)=>(
                    <div key={i} style={{marginTop:8,background:'rgba(255,255,255,0.02)',borderRadius:10,padding:'10px 12px',fontSize:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                        <span style={{color:'#64748b'}}>{fmtTime(r.ts)}</span>
                        <span style={{color:'#10b981',fontWeight:700}}>⭐ {r.criticScore}/10</span>
                      </div>
                      <div style={{color:'#cbd5e1',lineHeight:1.6}}>🎣 {r.hook}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showForm&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:16,overflowY:'auto'}} onClick={()=>setShowForm(false)}>
          <div style={{background:'#0f0f1a',border:'1px solid rgba(255,255,255,0.12)',borderRadius:20,padding:'28px',maxWidth:560,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:16,fontWeight:900,marginBottom:20}}>🤖 สร้าง AI Agent ใหม่</div>
            <div style={{display:'grid',gap:13}}>
              <div><label style={labelSt}>ชื่อ Agent *</label><input style={inputSt} placeholder="เช่น ผ้าไหมรายวัน" value={form.name} onChange={set('name')} /></div>
              <div><label style={labelSt}>สินค้า / หัวข้อ *</label><input style={inputSt} placeholder="เช่น ผ้าไหมมัดหมี่อุบล" value={form.product} onChange={set('product')} /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={labelSt}>หมวดหมู่</label>
                  <select style={{...inputSt,cursor:'pointer'}} value={form.category} onChange={set('category')}>
                    {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelSt}>ราคา</label><input style={inputSt} placeholder="฿590" value={form.price} onChange={set('price')} /></div>
              </div>
              <div><label style={labelSt}>กลุ่มเป้าหมาย</label><input style={inputSt} placeholder="เช่น แม่บ้าน คนรักสุขภาพ" value={form.audience} onChange={set('audience')} /></div>
              <div><label style={labelSt}>แพลตฟอร์ม</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {PLATFORMS.map(p=><button key={p} onClick={setB('platform')(p)} style={{borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${form.platform===p?'#6366f1':'rgba(255,255,255,0.1)'}`,background:form.platform===p?'rgba(99,102,241,0.2)':'transparent',color:form.platform===p?'#a5b4fc':'#64748b'}}>{p}</button>)}
                </div>
              </div>
              <div><label style={labelSt}>สไตล์</label>
                <div style={{display:'flex',gap:6}}>
                  {STYLES.map(s=><button key={s.id} onClick={setB('style')(s.id)} style={{borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${form.style===s.id?'#6366f1':'rgba(255,255,255,0.1)'}`,background:form.style===s.id?'rgba(99,102,241,0.2)':'transparent',color:form.style===s.id?'#a5b4fc':'#64748b'}}>{s.label}</button>)}
                </div>
              </div>
              <div><label style={labelSt}>Schedule</label>
                <div style={{display:'flex',gap:6}}>
                  {SCHEDULES.map(s=><button key={s.id} onClick={setB('schedule')(s.id)} style={{borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${form.schedule===s.id?'#10b981':'rgba(255,255,255,0.1)'}`,background:form.schedule===s.id?'rgba(16,185,129,0.15)':'transparent',color:form.schedule===s.id?'#6ee7b7':'#64748b'}}>{s.label}</button>)}
                </div>
              </div>
              {form.schedule!=='manual'&&(
                <div style={{display:'grid',gridTemplateColumns:form.schedule==='weekly'?'1fr 1fr':'1fr',gap:12}}>
                  <div><label style={labelSt}>เวลา (ชั่วโมง)</label>
                    <select style={{...inputSt,cursor:'pointer'}} value={form.hour} onChange={set('hour')}>
                      {HOURS.map(h=><option key={h} value={h}>{String(h).padStart(2,'0')}:00 น.</option>)}
                    </select>
                  </div>
                  {form.schedule==='weekly'&&(
                    <div><label style={labelSt}>วันในสัปดาห์</label>
                      <select style={{...inputSt,cursor:'pointer'}} value={form.weekDay} onChange={set('weekDay')}>
                        {DAYS.map((d,i)=><option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div style={{background:'rgba(6,197,85,0.06)',border:'1px solid rgba(6,197,85,0.2)',borderRadius:12,padding:'14px 16px'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:form.lineEnabled?12:0,cursor:'pointer'}} onClick={()=>setForm(f=>({...f,lineEnabled:!f.lineEnabled}))}>
                  <div style={{width:32,height:18,background:form.lineEnabled?'#06c755':'rgba(255,255,255,0.1)',borderRadius:9,position:'relative',transition:'background .2s',flexShrink:0}}>
                    <div style={{width:14,height:14,background:'#fff',borderRadius:'50%',position:'absolute',top:2,left:form.lineEnabled?16:2,transition:'left .2s'}} />
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:form.lineEnabled?'#4ade80':'#94a3b8'}}>💚 ส่งผลลัพธ์เข้า LINE อัตโนมัติ</div>
                </div>
                {form.lineEnabled&&(
                  <div>
                    <label style={labelSt}>LINE User ID / Group ID</label>
                    <input style={inputSt} placeholder="U1234567890abcdef..." value={form.lineUserId} onChange={set('lineUserId')} />
                    <div style={{fontSize:11,color:'#475569',marginTop:6}}>ต้องตั้งค่า LINE_CHANNEL_TOKEN ใน .env ก่อน</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={handleCreate} style={{flex:1,background:'linear-gradient(135deg,#fe2c55,#6366f1)',border:'none',borderRadius:10,padding:'13px',fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer'}}>
                🤖 สร้าง Agent
              </button>
              <button onClick={()=>setShowForm(false)} style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'13px 20px',color:'#94a3b8',cursor:'pointer',fontSize:14}}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Skills Gap ──────────────────────────────────────────────────────────
function TabSkills({ toast }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/system/skills-gap')
      .then(r=>r.json())
      .then(d=>{setData(d);setLoading(false);})
      .catch(()=>setLoading(false));
  }, []);

  if (loading) return <div style={{textAlign:'center',padding:'60px 0',color:'#64748b'}}>⏳ กำลังโหลด...</div>;
  if (!data)   return <div style={{textAlign:'center',padding:'60px 0',color:'#f87171'}}>โหลดข้อมูลไม่สำเร็จ</div>;

  return (
    <div style={{display:'grid',gap:20}}>

      {/* Overall score */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
        {[
          {label:'Overall Score',val:`${data.overall_score}/100`,color:'#6366f1',icon:'🏆'},
          {label:'Industry Avg',val:`${data.industry_average}/100`,color:'#64748b',icon:'📊'},
          {label:'AI Engine',val:data.ts?'Active':'—',color:'#10b981',icon:'🤖'},
          {label:'Thai Advantage',val:'TOP',color:'#f59e0b',icon:'🇹🇭'},
        ].map((s,i)=>(
          <div key={i} style={{...glass,padding:'14px 16px',textAlign:'center'}}>
            <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.val}</div>
            <div style={{fontSize:11,color:'#64748b'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{...glass,padding:'14px 16px',background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
        <span style={{color:'#a5b4fc',fontSize:13,fontWeight:700}}>🇹🇭 Thai Advantage: </span>
        <span style={{color:'#cbd5e1',fontSize:13}}>{data.thai_advantage}</span>
      </div>

      {/* Our 9 Skills */}
      <div style={glass}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:16}}>🧠 9-Skills ของ OpenThai AI</div>
        <div style={{display:'grid',gap:10}}>
          {data.our_skills.map(s=>(
            <div key={s.id}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:5}}>
                <span style={{fontSize:11,color:'#64748b',width:26}}>{s.id}</span>
                <span style={{fontSize:13,fontWeight:600,flex:1}}>{s.name}</span>
                <span style={{fontSize:13}}>{s.status}</span>
                <span style={{fontSize:13,fontWeight:700,color:s.color,width:38,textAlign:'right'}}>{s.pct}%</span>
              </div>
              <ScoreBar value={s.pct} color={s.color} />
            </div>
          ))}
        </div>
      </div>

      {/* vs Industry benchmark */}
      <div style={glass}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:16}}>📊 เทียบกับ Industry Benchmark</div>
        <div style={{display:'grid',gap:8}}>
          {data.benchmark.map((b,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',borderRadius:10,padding:'10px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7,flexWrap:'wrap',gap:6}}>
                <span style={{fontSize:13,fontWeight:600}}>{b.name}</span>
                <span style={{fontSize:11,padding:'3px 8px',background:b.ours>=b.industry?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.1)',border:`1px solid ${b.ours>=b.industry?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.25)'}`,borderRadius:20,color:b.ours>=b.industry?'#34d399':'#f87171'}}>
                  {b.leader}
                </span>
              </div>
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <span style={{fontSize:11,color:'#a5b4fc',width:58}}>เรา: {b.ours}%</span>
                <div style={{flex:1,position:'relative',height:6,background:'rgba(255,255,255,0.06)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{position:'absolute',height:'100%',width:`${b.industry}%`,background:'rgba(100,116,139,0.4)',borderRadius:99}} />
                  <div style={{position:'absolute',height:'100%',width:`${b.ours}%`,background:b.ours>=b.industry?'#6366f1':'#fe2c55',borderRadius:99,transition:'width .6s ease'}} />
                </div>
                <span style={{fontSize:11,color:'#64748b',width:58,textAlign:'right'}}>Industry: {b.industry}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing skills */}
      <div style={glass}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:16}}>🔴 Skills ที่ยังขาด — Roadmap</div>
        <div style={{display:'grid',gap:10}}>
          {data.missing_skills.map((s,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.02)',borderRadius:12,padding:'13px 16px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexWrap:'wrap',gap:6}}>
                <span style={{fontWeight:700,fontSize:13}}>{s.name}</span>
                <span style={{fontSize:11,color:'#f8fafc'}}>{s.priority}</span>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:11,color:'#64748b',marginBottom:8}}>
                <span>⏱ {s.effort}</span>
                <span style={{color:'#10b981'}}>📈 {s.impact}</span>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:11,color:'#64748b',flexShrink:0}}>Progress:</span>
                <ScoreBar value={s.progress} color='#f59e0b' height={5} />
                <span style={{fontSize:11,color:'#f59e0b',width:30,textAlign:'right'}}>{s.progress}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab: System Monitor ──────────────────────────────────────────────────────
function TabMonitor({ toast }) {
  const [metrics, setMetrics]     = useState(null);
  const [watchdog, setWatchdog]   = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [healing, setHealing]     = useState(false);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [m, w] = await Promise.all([
        fetch('/api/system/metrics').then(r=>r.json()),
        fetch('/api/system/watchdog').then(r=>r.json()),
      ]);
      setMetrics(m); setWatchdog(w);
    } catch (_) {}
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15000); // รีเฟรชทุก 15 วินาที
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const handleDiagnose = async () => {
    setDiagLoading(true);
    toast.info('🔬 AI กำลังวิเคราะห์ระบบ...');
    try {
      const d = await fetch('/api/system/diagnose',{method:'POST'}).then(r=>r.json());
      setDiagnosis(d);
      toast.success(`✅ วิเคราะห์เสร็จ: ${d.status} (${d.health_score}/100)`);
    } catch(e){ toast.error('วิเคราะห์ไม่สำเร็จ'); }
    setDiagLoading(false);
  };

  const handleHeal = async () => {
    setHealing(true);
    toast.info('🔧 กำลัง Auto-Heal...');
    try {
      const d = await fetch('/api/system/auto-heal',{method:'POST'}).then(r=>r.json());
      if(d.success){ toast.success(`✅ Auto-Heal สำเร็จ! Healed: ${d.stats?.healed||0} agents`); load(); }
      else toast.error('Auto-Heal ไม่สำเร็จ');
    } catch(e){ toast.error('เกิดข้อผิดพลาด'); }
    setHealing(false);
  };

  const statusColor = s => ({ healthy:'#10b981', warning:'#f59e0b', critical:'#ef4444' }[s] || '#64748b');

  return (
    <div style={{display:'grid',gap:20}}>

      {/* Metrics grid */}
      {metrics && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10}}>
          {[
            {icon:'⏱',label:'Uptime',val:metrics.uptime_human,color:'#6366f1'},
            {icon:'🤖',label:'AI Engine',val:metrics.ai_engine,color:'#10b981'},
            {icon:'🧠',label:'Memory',val:`${metrics.memory_mb} MB`,color:'#f59e0b'},
            {icon:'⚡',label:'Active Agents',val:`${metrics.active_agents}/${metrics.total_agents}`,color:'#06b6d4'},
            {icon:'📝',label:'Total Runs',val:metrics.total_runs,color:'#8b5cf6'},
            {icon:'⭐',label:'Avg Score',val:metrics.avg_score,color:'#fe2c55'},
            {icon:'🔴',label:'Errors',val:metrics.error_count,color:metrics.error_count>0?'#ef4444':'#10b981'},
            {icon:'⚠️',label:'Warnings',val:metrics.warn_count,color:metrics.warn_count>5?'#f59e0b':'#64748b'},
          ].map((s,i)=>(
            <div key={i} style={{...glass,padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.val}</div>
                <div style={{fontSize:10,color:'#64748b'}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Services status */}
      <div style={glass}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:14}}>🌐 Services Status</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8}}>
          {[
            {name:'AI Content Gen',    ok:true,  detail:'Claude/Gemini/Mock'},
            {name:'Agent Scheduler',   ok:true,  detail:'Cron every hour'},
            {name:'Watchdog (30 min)', ok:true,  detail:`Healed: ${watchdog?.healed||0}`},
            {name:'News RAG',          ok:true,  detail:'RSS + AI fallback'},
            {name:'Competitor AI',     ok:true,  detail:'On-demand'},
            {name:'LINE OA',           ok:!!watchdog,  detail:watchdog?'Ready':'No token'},
            {name:'ElevenLabs TTS',    ok:false, detail:'API key needed'},
            {name:'Auto-Heal',         ok:true,  detail:'Active 24/7'},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.02)',padding:'10px 12px',borderRadius:10}}>
              <PulseDot active={s.ok} color={s.ok?'#10b981':'#475569'} />
              <div>
                <div style={{fontSize:12,fontWeight:600}}>{s.name}</div>
                <div style={{fontSize:10,color:'#475569'}}>{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Watchdog status */}
      {watchdog && (
        <div style={{...glass,border:'1px solid rgba(16,185,129,0.2)',background:'rgba(16,185,129,0.04)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
            <div>
              <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>🛡 Auto-Heal Watchdog</div>
              <div style={{fontSize:12,color:'#64748b'}}>ตรวจและแก้ไข Agent ที่ stuck อัตโนมัติทุก 30 นาที</div>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              <div style={{textAlign:'center',padding:'8px 16px',background:'rgba(16,185,129,0.1)',borderRadius:10}}>
                <div style={{fontSize:18,fontWeight:900,color:'#10b981'}}>{watchdog.healed||0}</div>
                <div style={{fontSize:10,color:'#64748b'}}>Auto-healed</div>
              </div>
              <div style={{textAlign:'center',padding:'8px 16px',background:'rgba(99,102,241,0.1)',borderRadius:10}}>
                <div style={{fontSize:18,fontWeight:900,color:'#a5b4fc'}}>{watchdog.checked||0}</div>
                <div style={{fontSize:10,color:'#64748b'}}>Checked</div>
              </div>
            </div>
          </div>
          <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
            <div style={{fontSize:11,color:'#64748b'}}>Status: <span style={{color:watchdog.status==='running'?'#f59e0b':'#10b981',fontWeight:700}}>{watchdog.status}</span></div>
            {watchdog.lastRun&&<div style={{fontSize:11,color:'#64748b'}}>Last: {fmtTime(watchdog.lastRun)}</div>}
            {watchdog.nextRun&&<div style={{fontSize:11,color:'#64748b'}}>Next: {fmtTime(watchdog.nextRun)}</div>}
          </div>
          <div style={{marginTop:12}}>
            <button onClick={handleHeal} disabled={healing}
              style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,padding:'8px 18px',color:'#34d399',cursor:'pointer',fontSize:13,fontWeight:700,opacity:healing?.6:1}}>
              {healing?'⏳ กำลัง Heal...':'🔧 Trigger Auto-Heal ทันที'}
            </button>
          </div>
        </div>
      )}

      {/* AI Self-Diagnosis */}
      <div style={glass}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:14}}>
          <div>
            <div style={{fontWeight:800,fontSize:14}}>🔬 AI Self-Diagnosis</div>
            <div style={{fontSize:12,color:'#64748b',marginTop:2}}>ให้ Claude วิเคราะห์ปัญหาระบบและแนะนำการแก้ไข</div>
          </div>
          <button onClick={handleDiagnose} disabled={diagLoading}
            style={{background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:8,padding:'9px 18px',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:700,opacity:diagLoading?.6:1}}>
            {diagLoading?'⏳ วิเคราะห์...':'🔬 วิเคราะห์ระบบ'}
          </button>
        </div>

        {diagnosis && (
          <div style={{background:'rgba(255,255,255,0.02)',borderRadius:12,padding:'16px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:12,height:12,borderRadius:'50%',background:statusColor(diagnosis.status)}} />
              <span style={{fontWeight:700,color:statusColor(diagnosis.status),textTransform:'capitalize'}}>{diagnosis.status}</span>
              <span style={{fontSize:22,fontWeight:900,color:statusColor(diagnosis.status),marginLeft:'auto'}}>{diagnosis.health_score}/100</span>
            </div>
            {diagnosis.issues?.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:6}}>⚠️ ISSUES</div>
                {diagnosis.issues.map((issue,i)=>(
                  <div key={i} style={{fontSize:12,color:'#fcd34d',padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>• {issue}</div>
                ))}
              </div>
            )}
            {diagnosis.recommendations?.length>0&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:6}}>💡 RECOMMENDATIONS</div>
                {diagnosis.recommendations.map((r,i)=>(
                  <div key={i} style={{fontSize:12,color:'#6ee7b7',padding:'4px 0'}}>✅ {r}</div>
                ))}
              </div>
            )}
            {diagnosis.auto_fixed?.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'#94a3b8',marginBottom:6}}>🔧 AUTO-FIXED</div>
                {diagnosis.auto_fixed.map((f,i)=>(
                  <div key={i} style={{fontSize:12,color:'#a5b4fc',padding:'4px 0'}}>⚡ {f}</div>
                ))}
              </div>
            )}
            <div style={{fontSize:10,color:'#475569',marginTop:10}}>Source: {diagnosis.source} · {fmtTime(diagnosis.ts)}</div>
          </div>
        )}
      </div>

      <div style={{...glass,background:'rgba(99,102,241,0.04)',border:'1px solid rgba(99,102,241,0.15)'}}>
        <div style={{fontSize:12,color:'#a5b4fc',lineHeight:1.8}}>
          🤖 <strong>Auto-Update 24/7:</strong> ระบบ Watchdog รันทุก 30 นาที ตรวจ Agent ที่ค้าง และ Heal อัตโนมัติ<br/>
          🛡 <strong>Data Protection:</strong> ทุก Agent run บันทึกลงไฟล์ JSON ทันที ข้อมูลไม่สูญหายแม้ server restart<br/>
          📝 <strong>Event Log:</strong> ทุก action บันทึกใน system_log.json ดูได้ที่ Tab "Event Log"
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Event Log ───────────────────────────────────────────────────────────
function TabLogs({ toast }) {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all'); // all | error | warn | info
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const url = `/api/system/logs?limit=200${filter!=='all'?`&level=${filter}`:''}`;
      const d = await fetch(url).then(r=>r.json());
      setLogs(d.data||[]); setTotal(d.total||0);
    } catch (_) {}
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true); load();
    intervalRef.current = setInterval(load, 10000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const levelColor = l => ({ error:'#ef4444', warn:'#f59e0b', info:'#10b981' }[l] || '#64748b');
  const levelBg    = l => ({ error:'rgba(239,68,68,0.1)', warn:'rgba(245,158,11,0.1)', info:'rgba(16,185,129,0.08)' }[l] || 'rgba(255,255,255,0.02)');
  const levelEmoji = l => ({ error:'🔴', warn:'⚠️', info:'✅' }[l] || '•');

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:13,color:'#64748b'}}>{total} events ทั้งหมด · รีเฟรชทุก 10 วินาที</div>
        <div style={{display:'flex',gap:6}}>
          {['all','error','warn','info'].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              style={{borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,cursor:'pointer',border:`1.5px solid ${filter===f?levelColor(f==='all'?'info':f):'rgba(255,255,255,0.1)'}`,background:filter===f?`${levelBg(f==='all'?'info':f)}`:'transparent',color:filter===f?levelColor(f==='all'?'info':f):'#64748b'}}>
              {f==='all'?'ทั้งหมด':f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'40px 0',color:'#64748b'}}>⏳</div>
      ) : logs.length === 0 ? (
        <div style={{...glass,textAlign:'center',padding:'40px',color:'#64748b'}}>ยังไม่มี log</div>
      ) : (
        <div style={{display:'grid',gap:4}}>
          {logs.map((log,i)=>(
            <div key={i} style={{background:levelBg(log.level),borderRadius:8,padding:'9px 12px',border:`1px solid ${levelColor(log.level)}22`,display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{levelEmoji(log.level)}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:700,color:levelColor(log.level),textTransform:'uppercase'}}>{log.level}</span>
                  <span style={{fontSize:11,color:'#6366f1',background:'rgba(99,102,241,0.12)',padding:'1px 6px',borderRadius:4}}>{log.source}</span>
                  <span style={{fontSize:10,color:'#475569',marginLeft:'auto',whiteSpace:'nowrap'}}>{fmtTime(log.ts)}</span>
                </div>
                <div style={{fontSize:12,color:'#cbd5e1',lineHeight:1.5,wordBreak:'break-word'}}>{log.message}</div>
                {log.detail&&<div style={{fontSize:11,color:'#64748b',marginTop:3,wordBreak:'break-all'}}>{typeof log.detail==='string'?log.detail:JSON.stringify(log.detail)}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AgentPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const [tab, setTab]         = useState('agents');
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [lineStatus, setLine] = useState(null);

  useEffect(() => {
    document.title = 'AI Agent — OpenThai AI';
    loadAgents();
    fetch('/api/line/status').then(r=>r.json()).then(setLine).catch(()=>{});
  }, []);

  const loadAgents = () =>
    fetch('/api/agent').then(r=>r.json())
      .then(d=>{setAgents(d.data||[]);setLoading(false);})
      .catch(()=>setLoading(false));

  return (
    <div style={{minHeight:'100vh',background:'#080812',color:'#f8fafc',fontFamily:"'Inter','Sarabun',sans-serif",paddingBottom:80}}>

      {/* CSS animation */}
      <style>{`
        @keyframes ping{0%{transform:scale(1);opacity:.5}70%{transform:scale(1.8);opacity:0}100%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .tab-content{animation:fadeIn .25s ease}
      `}</style>

      {/* Sticky Header */}
      <header style={{background:'rgba(8,8,18,0.96)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'12px 5%',display:'flex',alignItems:'center',gap:14,position:'sticky',top:0,zIndex:100,flexWrap:'wrap'}}>
        <button onClick={()=>navigate('/dashboard')} style={{background:'none',border:'1px solid rgba(255,255,255,0.14)',borderRadius:8,padding:'6px 14px',color:'#94a3b8',cursor:'pointer',fontSize:13}}>← Dashboard</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:900}}>🤖 AI Agent Control Center</div>
          <div style={{fontSize:11,color:'#475569'}}>Auto-content · Self-healing · 24/7 monitoring · Skill gap analysis</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          {lineStatus?.connected&&<div style={{fontSize:11,padding:'3px 9px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,color:'#6ee7b7'}}>💚 LINE</div>}
          <div style={{fontSize:11,padding:'3px 9px',background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,color:'#6ee7b7'}}>
            <PulseDot active={true} /> <span style={{marginLeft:4}}>System Online</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{background:'rgba(8,8,18,0.9)',backdropFilter:'blur(10px)',borderBottom:'1px solid rgba(255,255,255,0.06)',padding:'0 5%',display:'flex',gap:4,overflowX:'auto'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:'12px 16px',background:'none',border:'none',borderBottom:`2px solid ${tab===t.id?'#6366f1':'transparent'}`,color:tab===t.id?'#a5b4fc':'#475569',cursor:'pointer',fontSize:13,fontWeight:tab===t.id?700:400,whiteSpace:'nowrap',transition:'all .2s'}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{maxWidth:960,margin:'0 auto',padding:'28px 5% 0'}}>
        <div className="tab-content">
          {tab==='agents'  && <TabAgents agents={agents} lineStatus={lineStatus} loading={loading} onRefresh={loadAgents} toast={toast} />}
          {tab==='skills'  && <TabSkills toast={toast} />}
          {tab==='monitor' && <TabMonitor toast={toast} />}
          {tab==='logs'    && <TabLogs toast={toast} />}
        </div>
      </div>
    </div>
  );
}
