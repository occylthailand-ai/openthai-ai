import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { driveStatus, driveConnect, driveBackup, driveRestore, driveDisconnect, pullSync } from '../cloudSync';

// ── ศูนย์ซิงค์ข้อมูล — คอม + มือถือ + เมมโมรี่ + คลาวด์ + Google Drive + OneDrive ──
export default function SyncPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [providers, setProviders] = useState(null);
  const [cloudOk, setCloudOk] = useState(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setProviders(await driveStatus());
    const cloud = await pullSync();
    setCloudOk(cloud !== null);
  }, []);

  useEffect(() => { load(); }, [load]);

  // อ่านผล redirect กลับจาก OAuth (?drive=google&status=connected)
  useEffect(() => {
    const drive = params.get('drive'); const status = params.get('status');
    if (!drive || !status) return;
    const name = drive === 'google' ? 'Google Drive' : 'OneDrive';
    setMsg(status === 'connected' ? `✅ เชื่อม ${name} สำเร็จ`
      : status === 'cancelled' ? `⚠️ ยกเลิกการเชื่อม ${name}`
      : `❌ เชื่อม ${name} ไม่สำเร็จ`);
    params.delete('drive'); params.delete('status'); setParams(params, { replace: true });
    load();
  }, [params, setParams, load]);

  const run = async (provider, action, fn) => {
    setBusy(`${provider}:${action}`); setMsg('');
    try {
      const d = await fn(provider);
      const name = provider === 'google' ? 'Google Drive' : 'OneDrive';
      if (action === 'backup') setMsg(`✅ สำรองขึ้น ${name} แล้ว`);
      else if (action === 'restore') setMsg(d.restored ? `✅ กู้คืนจาก ${name} แล้ว` : `ℹ️ ยังไม่มี backup บน ${name}`);
      else if (action === 'disconnect') setMsg(`ถอน ${name} แล้ว`);
      await load();
    } catch (e) { setMsg(`❌ ${e.message}`); }
    finally { setBusy(''); }
  };

  const bg = 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1628 100%)';
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px' };
  const btn = (c) => ({ background: c, border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 });
  const fmt = (ts) => ts ? new Date(ts).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  // เป้าหมายซิงค์ที่ทำงานอัตโนมัติอยู่แล้ว (memory + cloud ข้ามอุปกรณ์)
  const localTargets = [
    { icon: '💻', name: 'คอมพิวเตอร์', desc: 'เบราว์เซอร์เครื่องนี้ · ซิงค์อัตโนมัติ', ok: true },
    { icon: '📱', name: 'มือถือ', desc: 'ล็อกอินบัญชีเดียวกัน → ข้อมูลตรงกันทันที', ok: true },
    { icon: '🧠', name: 'เมมโมรี่ (เครื่อง)', desc: 'localStorage · cache เร็ว/ใช้ออฟไลน์ได้', ok: true },
    { icon: '☁️', name: 'คลาวด์ (บัญชี)', desc: cloudOk == null ? 'กำลังตรวจสอบ…' : cloudOk ? 'เชื่อมต่อแล้ว · เก็บถาวรข้ามอุปกรณ์' : 'ต้องล็อกอินก่อน', ok: cloudOk },
  ];

  const driveMeta = {
    google:   { icon: '🟢', name: 'Google Drive', color: '#34a853' },
    onedrive: { icon: '🔵', name: 'OneDrive',     color: '#0078d4' },
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={btn('rgba(255,255,255,0.1)')}>← กลับ</button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>🔄 ศูนย์ซิงค์ข้อมูล</h1>
        <button onClick={load} style={{ ...btn('rgba(255,255,255,0.1)'), marginLeft: 'auto' }}>🔄</button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px 20px', display: 'grid', gap: '16px' }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          ข้อมูลของคุณซิงค์ตรงกันทุกที่ — คอม · มือถือ · เมมโมรี่ · คลาวด์ และสำรองขึ้น Google Drive / OneDrive ได้
        </p>

        {msg && <div style={{ ...card, padding: '12px 16px', fontSize: '14px' }}>{msg}</div>}

        {/* เป้าหมายอัตโนมัติ */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px' }}>⚡ ซิงค์อัตโนมัติ</div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {localTargets.map((t) => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                <span style={{ fontSize: '20px' }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{t.desc}</div>
                </div>
                <span style={{ fontSize: '12px' }}>{t.ok == null ? '⏳' : t.ok ? '🟢' : '🔴'}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Drive backup */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '12px' }}>💾 สำรองขึ้นคลาวด์ไดรฟ์</div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {DRIVE_LIST.map((p) => {
              const meta = driveMeta[p];
              const st = providers?.[p];
              const isBusy = busy.startsWith(`${p}:`);
              return (
                <div key={p} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: `1px solid ${st?.connected ? meta.color + '55' : 'rgba(255,255,255,0.08)'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>{meta.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '14px' }}>{meta.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {!st ? 'กำลังโหลด…'
                          : !st.configured ? '⚙️ ผู้ดูแลยังไม่ได้ตั้งค่า API'
                          : st.connected ? `เชื่อมแล้ว${st.email ? ' · ' + st.email : ''}`
                          : 'ยังไม่ได้เชื่อม'}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px' }}>{st?.connected ? '🟢' : st?.configured ? '⚪' : '🚫'}</span>
                  </div>

                  {st?.connected && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                      สำรองล่าสุด: {fmt(st.last_backup_at)} · กู้คืนล่าสุด: {fmt(st.last_restore_at)}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {!st?.connected ? (
                      <button disabled={!st?.configured || isBusy} onClick={() => driveConnect(p).catch((e) => setMsg(`❌ ${e.message}`))}
                        style={{ ...btn(meta.color), opacity: st?.configured ? 1 : 0.4, cursor: st?.configured ? 'pointer' : 'not-allowed' }}>
                        🔗 เชื่อมต่อ
                      </button>
                    ) : (
                      <>
                        <button disabled={isBusy} onClick={() => run(p, 'backup', driveBackup)} style={btn('#10b981')}>
                          {busy === `${p}:backup` ? '⏳…' : '⬆️ สำรองตอนนี้'}
                        </button>
                        <button disabled={isBusy} onClick={() => run(p, 'restore', driveRestore)} style={btn('#3b82f6')}>
                          {busy === `${p}:restore` ? '⏳…' : '⬇️ กู้คืน'}
                        </button>
                        <button disabled={isBusy} onClick={() => run(p, 'disconnect', driveDisconnect)} style={btn('rgba(255,255,255,0.12)')}>
                          ✕ ถอน
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p style={{ margin: 0, color: '#64748b', fontSize: '11px', textAlign: 'center' }}>
          ไฟล์สำรองถูกเก็บใน “โฟลเดอร์แอป” เฉพาะของ OpenThai AI บนไดรฟ์ของคุณ — ไม่ปะปนกับไฟล์ส่วนตัว
        </p>
      </div>
    </div>
  );
}

const DRIVE_LIST = ['google', 'onedrive'];
