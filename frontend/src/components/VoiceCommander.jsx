import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiUrl } from '../apiBase';

// ── Waveform bars ─────────────────────────────────────────────────────────────
function Waveform({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 32 }}>
      {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((h, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2,
          background: active ? '#fe2c55' : 'rgba(255,255,255,0.2)',
          height: active ? h * 6 : 4,
          transition: 'all 0.15s ease',
          animation: active ? `wave ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
        }} />
      ))}
      <style>{`@keyframes wave { from{transform:scaleY(0.4)} to{transform:scaleY(1.6)} }`}</style>
    </div>
  );
}

// ── Action icon map ───────────────────────────────────────────────────────────
const ACTION_ICON = {
  generate_content:    '✍️',
  get_trending:        '🔥',
  get_news:            '📰',
  system_health:       '💚',
  competitor_analyze:  '🔍',
  list_agents:         '🤖',
  run_agent:           '▶️',
  memory_search:       '🧠',
  help:                '💡',
  unknown:             '❓',
};

// ── ResultCard ────────────────────────────────────────────────────────────────
function ResultCard({ data }) {
  if (!data) return null;
  const { action, result, speak_text, display_text, confidence } = data;

  if (action === 'generate_content' && result?.hook) {
    return (
      <div style={styles.resultCard}>
        <div style={styles.resultHeader}>
          <span>{ACTION_ICON[action]} คอนเทนต์สำเร็จ</span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>★ {result.criticScore}/10</span>
        </div>
        <p style={{ color: '#fe2c55', fontWeight: 600, margin: '8px 0 4px' }}>Hook:</p>
        <p style={{ color: '#f1f5f9', fontSize: 14, margin: 0 }}>{result.hook}</p>
        {result.caption && (
          <>
            <p style={{ color: '#6366f1', fontWeight: 600, margin: '10px 0 4px' }}>Caption:</p>
            <p style={{ color: '#cbd5e1', fontSize: 13, margin: 0, whiteSpace: 'pre-line' }}>{result.caption}</p>
          </>
        )}
        {result.hashtags?.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.hashtags.slice(0, 6).map((h, i) => (
              <span key={i} style={styles.tag}>{h}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === 'get_trending' && result?.hashtags) {
    return (
      <div style={styles.resultCard}>
        <p style={styles.resultHeader}>{ACTION_ICON[action]} เทรนด์วันนี้</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {result.hashtags.map((h, i) => (
            <span key={i} style={{ ...styles.tag, background: 'rgba(254,44,85,0.15)', color: '#fe2c55' }}>{h}</span>
          ))}
        </div>
        {result.topics?.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {result.topics.map((t, i) => (
              <div key={i} style={{ color: '#94a3b8', fontSize: 13, padding: '2px 0' }}>📌 {t}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === 'help' && result?.commands) {
    return (
      <div style={styles.resultCard}>
        <p style={styles.resultHeader}>💡 คำสั่งที่ใช้ได้</p>
        {result.commands.map((c, i) => (
          <div key={i} style={{ color: '#cbd5e1', fontSize: 13, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            🎙️ &ldquo;{c}&rdquo;
          </div>
        ))}
      </div>
    );
  }

  // Generic result
  return (
    <div style={styles.resultCard}>
      <p style={styles.resultHeader}>{ACTION_ICON[action] || '✅'} {display_text || speak_text}</p>
      {result && (
        <pre style={{ color: '#94a3b8', fontSize: 12, overflow: 'auto', margin: 0, maxHeight: 120 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ── Main VoiceCommander component ─────────────────────────────────────────────
export default function VoiceCommander({ mode = 'widget' }) {
  const [expanded, setExpanded]       = useState(mode === 'page');
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [interim, setInterim]         = useState('');
  const [processing, setProcessing]   = useState(false);
  const [history, setHistory]         = useState([]);   // [{transcript, response}]
  const [error, setError]             = useState('');
  const [lang, setLang]               = useState('th-TH');
  const [supported, setSupported]     = useState(true);

  const recognitionRef = useRef(null);
  const historyEndRef  = useRef(null);

  // ── Check browser support ──────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) setSupported(false);
  }, []);

  // ── Auto-scroll history ────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'page') historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, mode]);

  // ── TTS speak ─────────────────────────────────────────────────────────────
  const speak = useCallback(async (text) => {
    if (!text) return;
    try {
      // Try ElevenLabs first
      const res = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok && res.headers.get('content-type')?.startsWith('audio/')) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }
    } catch (_) {}
    // Fallback: Web Speech Synthesis (free, built-in)
    try {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 0.95;
      window.speechSynthesis.speak(utt);
    } catch (_) {}
  }, [lang]);

  // ── Send to backend ────────────────────────────────────────────────────────
  const sendCommand = useCallback(async (text) => {
    if (!text.trim()) return;
    setProcessing(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/voice/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, lang }),
      });
      const data = await res.json();
      if (data.success) {
        const entry = { transcript: text, response: data, ts: new Date() };
        setHistory(h => [...h.slice(-19), entry]);
        speak(data.speak_text);
      } else {
        setError(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      setError('ไม่สามารถเชื่อมต่อ server ได้');
    } finally {
      setProcessing(false);
      setTranscript('');
      setInterim('');
    }
  }, [lang, speak]);

  // ── Start/stop recognition ─────────────────────────────────────────────────
  const toggleListen = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setError('Browser นี้ไม่รองรับ Voice Input'); return; }

    const rec = new SpeechRecognition();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart  = () => { setListening(true); setError(''); setInterim(''); };
    rec.onend    = () => { setListening(false); };
    rec.onerror  = (e) => { setListening(false); setError(`Speech error: ${e.error}`); };

    rec.onresult = (e) => {
      let final = '', inter = '';
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript;
        else inter += r[0].transcript;
      }
      setInterim(inter);
      if (final) {
        setTranscript(final);
        setInterim('');
        sendCommand(final);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [listening, lang, sendCommand]);

  // ── Keyboard shortcut: Space to toggle ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'page') return;
    const handler = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleListen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, toggleListen]);

  // ── Manual text input ──────────────────────────────────────────────────────
  const [manualText, setManualText] = useState('');
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualText.trim()) { sendCommand(manualText); setManualText(''); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  RENDER — WIDGET MODE (floating button)
  // ────────────────────────────────────────────────────────────────────────────
  if (mode === 'widget') {
    return (
      <div style={styles.widgetWrap}>
        {/* Expanded panel */}
        {expanded && (
          <div style={styles.widgetPanel}>
            <div style={styles.panelHeader}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>🎙️ Voice Commander</span>
              <button onClick={() => setExpanded(false)} style={styles.closeBtn}>✕</button>
            </div>

            {/* History — last 3 */}
            <div style={{ padding: '8px 12px', maxHeight: 280, overflowY: 'auto' }}>
              {history.length === 0 && !listening && !processing && (
                <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', margin: '16px 0' }}>
                  กดปุ่มไมค์แล้วพูดคำสั่ง
                </p>
              )}
              {history.slice(-3).map((h, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 4px' }}>🗣 {h.transcript}</p>
                  <ResultCard data={h.response} />
                </div>
              ))}
              {(listening || processing) && (
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Waveform active={listening} />
                  <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
                    {listening ? (interim || 'กำลังฟัง...') : '⚙️ กำลังประมวลผล...'}
                  </p>
                </div>
              )}
              {error && <p style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>{error}</p>}
            </div>

            {/* Lang toggle */}
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[['th-TH','🇹🇭 ไทย'],['zh-CN','🇨🇳 中文'],['en-US','🇺🇸 EN']].map(([l, label]) => (
                <button key={l} onClick={() => setLang(l)} style={{ ...styles.langBtn, background: lang === l ? 'rgba(99,102,241,0.3)' : 'transparent', color: lang === l ? '#a5b4fc' : '#475569' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Mic button */}
            <div style={{ padding: '10px 12px 12px', display: 'flex', gap: 8 }}>
              {supported ? (
                <button onClick={toggleListen} disabled={processing} style={{ ...styles.micBtn, background: listening ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#fe2c55,#6366f1)', flex: 1 }}>
                  {listening ? '⏹ หยุดฟัง' : processing ? '⚙️ กำลังประมวลผล' : '🎙️ พูดคำสั่ง'}
                </button>
              ) : (
                <p style={{ color: '#ef4444', fontSize: 12 }}>Browser ไม่รองรับ Voice</p>
              )}
            </div>
          </div>
        )}

        {/* Floating mic button */}
        <button
          onClick={() => { setExpanded(e => !e); if (!expanded) setError(''); }}
          style={{
            ...styles.fab,
            background: listening ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#fe2c55,#6366f1)',
            boxShadow: listening ? '0 0 0 8px rgba(239,68,68,0.2)' : '0 4px 24px rgba(254,44,85,0.4)',
            animation: listening ? 'fabPulse 1s ease-in-out infinite' : 'none',
          }}
          title="Voice Commander (Alt+V)"
        >
          {listening ? '🔴' : '🎙️'}
          <style>{`@keyframes fabPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }`}</style>
        </button>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  RENDER — PAGE MODE (full screen /voice)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>🎙️ Voice Commander</h1>
        <p style={styles.pageSubtitle}>พูดคำสั่งเพื่อควบคุม OpenThaiAi · กด Space เพื่อเริ่ม/หยุดฟัง</p>

        {/* Lang selector */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
          {[['th-TH','🇹🇭 ภาษาไทย'],['zh-CN','🇨🇳 中文'],['en-US','🇺🇸 English']].map(([l, label]) => (
            <button key={l} onClick={() => setLang(l)} style={{ ...styles.langBtn, padding: '6px 16px', background: lang === l ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)', color: lang === l ? '#a5b4fc' : '#64748b', border: `1px solid ${lang === l ? '#6366f1' : 'rgba(255,255,255,0.1)'}` }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mic area */}
      <div style={styles.micArea}>
        <button
          onClick={toggleListen}
          disabled={processing || !supported}
          style={{
            ...styles.pageMicBtn,
            background: listening
              ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : processing
                ? 'rgba(255,255,255,0.1)'
                : 'linear-gradient(135deg,#fe2c55,#6366f1)',
            boxShadow: listening ? '0 0 0 20px rgba(239,68,68,0.15), 0 0 0 40px rgba(239,68,68,0.07)' : '0 8px 40px rgba(254,44,85,0.4)',
          }}
        >
          <span style={{ fontSize: 40 }}>{listening ? '⏹' : processing ? '⚙️' : '🎙️'}</span>
        </button>

        <div style={{ marginTop: 20, minHeight: 60, textAlign: 'center' }}>
          {listening && <Waveform active />}
          <p style={{ color: listening ? '#fe2c55' : '#475569', fontSize: 16, fontWeight: 600, marginTop: 8 }}>
            {listening ? (interim || 'กำลังฟัง...') : processing ? 'กำลังประมวลผล...' : supported ? 'กด Space หรือคลิกเพื่อเริ่มพูด' : 'Browser ไม่รองรับ Voice Input'}
          </p>
          {transcript && !listening && (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>ได้ยิน: &ldquo;{transcript}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Quick commands — ปรับตามภาษาที่เลือก */}
      <div style={styles.quickCmds}>
        {(lang === 'zh-CN'
          ? ['为泰国辣酱创建内容', '查看今日趋势', '检查系统健康', '帮助']
          : lang === 'en-US'
            ? ['Create content for Thai chili', 'Show trending hashtags', 'Check system health', 'Help']
            : ['สร้างคอนเทนต์น้ำพริก', 'ดูเทรนด์วันนี้', 'ตรวจสุขภาพระบบ', 'ช่วยอะไรได้บ้าง']
        ).map((cmd, i) => (
          <button key={i} onClick={() => sendCommand(cmd)} style={styles.quickBtn}>
            {cmd}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 16px', margin: '0 auto 16px', maxWidth: 600, color: '#ef4444', fontSize: 14, textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Conversation history */}
      <div style={styles.historyArea}>
        {history.length === 0 && (
          <div style={{ textAlign: 'center', color: '#334155', padding: '40px 0' }}>
            <p style={{ fontSize: 32 }}>🎙️</p>
            <p>ยังไม่มีประวัติการสั่งงาน</p>
          </div>
        )}
        {history.map((h, i) => (
          <div key={i} style={styles.historyEntry}>
            {/* User bubble */}
            <div style={styles.userBubble}>
              <span style={{ fontSize: 18 }}>🗣</span>
              <p style={{ margin: 0, fontSize: 15 }}>{h.transcript}</p>
            </div>
            {/* AI response */}
            <div style={styles.aiBubble}>
              <span style={{ fontSize: 18 }}>{ACTION_ICON[h.response.action] || '🤖'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8' }}>{h.response.speak_text}</p>
                <ResultCard data={h.response} />
              </div>
            </div>
            <p style={{ textAlign: 'right', fontSize: 11, color: '#334155', margin: '4px 0 0' }}>
              {new Date(h.ts).toLocaleTimeString('th-TH')}
            </p>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Manual text input */}
      <form onSubmit={handleManualSubmit} style={styles.manualForm}>
        <input
          type="text"
          placeholder={lang === 'zh-CN' ? '输入命令或说话...' : lang === 'en-US' ? 'Type a command or speak...' : 'พิมพ์คำสั่งหรือพูด...'}
          value={manualText}
          onChange={e => setManualText(e.target.value)}
          style={styles.manualInput}
        />
        <button type="submit" disabled={!manualText.trim() || processing} style={styles.sendBtn}>
          ส่ง
        </button>
      </form>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  // Widget
  widgetWrap:  { position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 },
  widgetPanel: { width: 320, background: '#0f0f1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(99,102,241,0.08)' },
  closeBtn:    { background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16 },
  micBtn:      { border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 14, padding: '10px', cursor: 'pointer', transition: 'opacity 0.2s' },
  fab:         { width: 56, height: 56, borderRadius: '50%', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  langBtn:     { border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '4px 10px' },
  // Page
  page:        { minHeight: '100vh', background: '#0f0f1a', color: '#f1f5f9', padding: '24px 16px 100px', maxWidth: 720, margin: '0 auto' },
  pageHeader:  { textAlign: 'center', marginBottom: 32 },
  pageTitle:   { fontSize: 28, fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg,#fe2c55,#6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  pageSubtitle:{ color: '#475569', fontSize: 14, margin: 0 },
  micArea:     { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 },
  pageMicBtn:  { width: 120, height: 120, borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  quickCmds:   { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 24 },
  quickBtn:    { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, color: '#94a3b8', fontSize: 13, padding: '6px 14px', cursor: 'pointer', transition: 'all 0.2s' },
  historyArea: { maxHeight: 500, overflowY: 'auto', marginBottom: 16 },
  historyEntry:{ marginBottom: 20, padding: '0 4px' },
  userBubble:  { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, justifyContent: 'flex-end' },
  aiBubble:    { display: 'flex', gap: 10, alignItems: 'flex-start' },
  manualForm:  { position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 720, display: 'flex', gap: 8, padding: '12px 16px', background: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(255,255,255,0.08)' },
  manualInput: { flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#f1f5f9', fontSize: 14, padding: '10px 14px', outline: 'none' },
  sendBtn:     { background: 'linear-gradient(135deg,#fe2c55,#6366f1)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, padding: '10px 20px', cursor: 'pointer' },
  // Result card
  resultCard:  { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13 },
  resultHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 6px', fontWeight: 700, color: '#e2e8f0', fontSize: 14 },
  tag:         { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderRadius: 20, padding: '2px 10px', fontSize: 12 },
};
