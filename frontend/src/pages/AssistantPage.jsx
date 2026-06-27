import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../apiBase';
import { getPref, syncSetPref } from '../cloudSync';

// ─── AI ที่ปรึกษาธุรกิจ — แชทสตรีมสด (SSE) + จำบทสนทนาข้ามอุปกรณ์ (Cloud Sync) ──
const SUGGEST = [
  'จะตั้งราคาสินค้า OTOP ยังไงให้ขายดี?',
  'เขียนแคปชั่น TikTok ขายน้ำพริกให้หน่อย',
  'ลูกค้าต่อราคาเยอะ ควรทำยังไง?',
  'อยากเริ่มไลฟ์ขายของ เริ่มยังไงดี?',
];

export default function AssistantPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState(() => getPref('chat_history', []));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
  // รับบทสนทนาที่ซิงค์จากอุปกรณ์อื่น
  useEffect(() => {
    const onSync = () => setMessages(getPref('chat_history', []));
    window.addEventListener('otai:sync', onSync);
    return () => window.removeEventListener('otai:sync', onSync);
  }, []);

  const persist = (msgs) => { syncSetPref('chat_history', msgs.slice(-30)); };

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || streaming) return;
    setInput('');
    const base = [...messages, { role: 'user', content: q }];
    setMessages([...base, { role: 'assistant', content: '' }]);
    setStreaming(true);
    try {
      const res = await fetch(apiUrl('/api/chat/stream'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: base }),
      });
      if (!res.ok || !res.body) throw new Error('stream failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '', acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const blocks = buf.split('\n\n'); buf = blocks.pop() || '';
        for (const b of blocks) {
          const ev = (b.match(/^event: (.+)$/m) || [])[1];
          const dl = (b.match(/^data: (.+)$/m) || [])[1];
          if (!dl) continue;
          let p; try { p = JSON.parse(dl); } catch { continue; }
          if (ev === 'delta' && p.text) { acc += p.text; setMessages(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: acc }; return c; }); }
        }
      }
      const final = [...base, { role: 'assistant', content: acc || 'ขออภัย ตอบไม่สำเร็จ ลองใหม่อีกครั้งนะคะ' }];
      setMessages(final); persist(final);
    } catch {
      const final = [...base, { role: 'assistant', content: '⚠️ การเชื่อมต่อขัดข้อง ลองใหม่อีกครั้งนะคะ' }];
      setMessages(final); persist(final);
    }
    setStreaming(false);
  };

  const clearChat = () => { setMessages([]); persist([]); };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#1e293b', fontFamily: "'Inter','Sarabun',sans-serif" }}>
      <header style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 14px', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>← Dashboard</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>🤖 AI ที่ปรึกษาธุรกิจ</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>ถามอะไรก็ได้ · ตอบสด · จำบทสนทนาข้ามอุปกรณ์</div>
        </div>
        {messages.length > 0 && <button onClick={clearChat} style={{ background: 'none', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, padding: '6px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>🗑️ ล้าง</button>}
      </header>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 5%' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 14 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#475569', marginBottom: 4 }}>สวัสดีค่ะ! ถามเรื่องธุรกิจได้เลย</div>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>การตลาด · ขายของออนไลน์ · ตั้งราคา · คอนเทนต์ · บริหารร้าน</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {SUGGEST.map((s, i) => (
                  <button key={i} onClick={() => send(s)} style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: '8px 14px', color: '#6366f1', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '85%', background: m.role === 'user' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#fff', color: m.role === 'user' ? '#fff' : '#1e293b', border: m.role === 'user' ? 'none' : '1px solid rgba(0,0,0,0.08)', borderRadius: 16, borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'user' ? 16 : 4, padding: '11px 15px', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {m.role === 'assistant' && !m.content && streaming && i === messages.length - 1
                  ? <span style={{ color: '#94a3b8' }}>กำลังคิด<span style={{ animation: 'blink 1s step-start infinite' }}>...</span></span>
                  : m.content}
                {m.role === 'assistant' && streaming && i === messages.length - 1 && m.content && <span style={{ animation: 'blink 1s step-start infinite' }}>▋</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)', padding: '12px 5%', flexShrink: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="พิมพ์คำถาม..."
            style={{ flex: 1, background: '#f8fafc', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 24, padding: '12px 18px', fontSize: 14, color: '#1e293b', outline: 'none' }} />
          <button onClick={() => send()} disabled={streaming || !input.trim()} style={{ background: streaming || !input.trim() ? '#cbd5e1' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '50%', width: 46, height: 46, color: '#fff', fontSize: 18, cursor: streaming || !input.trim() ? 'default' : 'pointer', flexShrink: 0 }}>➤</button>
        </div>
      </div>
      <style>{'@keyframes blink{50%{opacity:0}}'}</style>
    </div>
  );
}
