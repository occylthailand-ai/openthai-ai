import { useState } from 'react';

const ADB_STEPS = [
  {
    id: 1,
    title: 'เปิด Developer Options บน vivo',
    icon: '📱',
    steps: [
      'ไปที่ Settings → About Phone',
      'แตะ "Build Number" (หมายเลขบิลด์) 7 ครั้งติดต่อกัน',
      'ใส่ PIN/รหัสผ่านหากถูกขอ',
      'ตอนนี้ "Developer Options" ปรากฏใน Settings แล้ว',
    ],
  },
  {
    id: 2,
    title: 'เปิด USB Debugging',
    icon: '🔧',
    steps: [
      'ไปที่ Settings → Additional Settings → Developer Options',
      'เปิด "USB debugging" (สีเขียว)',
      'กด OK เมื่อมี popup เตือน',
    ],
  },
  {
    id: 3,
    title: 'เชื่อมต่อ USB กับ PC',
    icon: '🔌',
    steps: [
      'เสียบสาย USB จากโทรศัพท์ไปที่ PC',
      'บนโทรศัพท์ เลือก "File Transfer / MTP" (ไม่ใช่ Charging only)',
      'กด "Allow" บน popup "Allow USB debugging"',
      'ติ๊ก "Always allow from this computer" เพื่อไม่ต้องกดทุกครั้ง',
    ],
  },
  {
    id: 4,
    title: 'ติดตั้ง ADB (ครั้งแรกเท่านั้น)',
    icon: '💻',
    steps: [
      'ดาวน์โหลด Android Platform Tools',
      'แตกไฟล์ไปที่ C:\\adb\\',
      'เพิ่ม C:\\adb\\ เข้า PATH (Environment Variables)',
      'เปิด Command Prompt พิมพ์: adb version',
    ],
    link: 'https://developer.android.com/studio/releases/platform-tools',
    linkText: 'ดาวน์โหลด Platform Tools',
  },
];

const ADB_COMMANDS = [
  {
    category: 'ตรวจสอบอุปกรณ์',
    color: '#10b981',
    items: [
      { cmd: 'adb devices -l', desc: 'แสดงรายการอุปกรณ์ที่เชื่อมต่อ' },
      { cmd: 'adb shell getprop ro.product.model', desc: 'ดูรุ่นโทรศัพท์' },
      { cmd: 'adb shell getprop ro.build.version.release', desc: 'ดูเวอร์ชัน Android' },
      { cmd: 'adb shell df -h', desc: 'ดูพื้นที่จัดเก็บ' },
      { cmd: 'adb shell dumpsys battery', desc: 'ดูสถานะแบตเตอรี่' },
    ],
  },
  {
    category: 'Download จากโทรศัพท์ → PC',
    color: '#6366f1',
    items: [
      { cmd: 'adb pull /sdcard/DCIM C:\\Users\\%USERNAME%\\Pictures\\Phone', desc: 'ดาวน์โหลดรูปภาพ DCIM ทั้งหมด' },
      { cmd: 'adb pull /sdcard/Pictures C:\\Users\\%USERNAME%\\Pictures\\PhonePictures', desc: 'ดาวน์โหลดโฟลเดอร์ Pictures' },
      { cmd: 'adb pull /sdcard/Download C:\\Users\\%USERNAME%\\Downloads\\PhoneDownload', desc: 'ดาวน์โหลดไฟล์ที่เคย Download' },
      { cmd: 'adb pull /sdcard/Documents C:\\Users\\%USERNAME%\\Documents\\Phone', desc: 'ดาวน์โหลดเอกสาร' },
      { cmd: 'adb pull /sdcard/WhatsApp/Media C:\\Users\\%USERNAME%\\Downloads\\WhatsApp', desc: 'ดาวน์โหลด WhatsApp Media' },
    ],
  },
  {
    category: 'Upload จาก PC → โทรศัพท์',
    color: '#f59e0b',
    items: [
      { cmd: 'adb push C:\\Photos\\myphoto.jpg /sdcard/Pictures/', desc: 'อัปโหลดรูปเดียวไปโทรศัพท์' },
      { cmd: 'adb push C:\\Videos /sdcard/Movies/FromPC', desc: 'อัปโหลดโฟลเดอร์วิดีโอ' },
      { cmd: 'adb push C:\\Documents\\report.pdf /sdcard/Documents/', desc: 'อัปโหลดเอกสาร PDF' },
    ],
  },
  {
    category: 'จัดการไฟล์บนโทรศัพท์',
    color: '#fe2c55',
    items: [
      { cmd: 'adb shell ls /sdcard/', desc: 'ดูไฟล์ใน Internal Storage' },
      { cmd: 'adb shell ls /sdcard/DCIM/', desc: 'ดูไฟล์ใน DCIM' },
      { cmd: 'adb shell mkdir /sdcard/MyFolder', desc: 'สร้างโฟลเดอร์ใหม่' },
      { cmd: 'adb shell rm /sdcard/Download/oldfile.zip', desc: 'ลบไฟล์ (ระวัง!)' },
    ],
  },
];

const SCRIPTS = [
  {
    file: 'check-device.bat',
    title: 'ตรวจสอบอุปกรณ์',
    desc: 'ตรวจสอบการเชื่อมต่อและข้อมูลโทรศัพท์',
    icon: '🔍',
    color: '#10b981',
  },
  {
    file: 'sync-download.bat',
    title: 'Sync: โทรศัพท์ → PC',
    desc: 'ดาวน์โหลดไฟล์จากโทรศัพท์มายัง PC แบบ interactive',
    icon: '⬇️',
    color: '#6366f1',
  },
  {
    file: 'sync-upload.bat',
    title: 'Sync: PC → โทรศัพท์',
    desc: 'อัปโหลดไฟล์จาก PC ไปโทรศัพท์',
    icon: '⬆️',
    color: '#f59e0b',
  },
  {
    file: 'diagnose-vivo.bat',
    title: 'Diagnostic Report',
    desc: 'สร้างรายงานวินิจฉัยโทรศัพท์ vivo ครบถ้วน',
    icon: '🩺',
    color: '#fe2c55',
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      style={{
        background: copied ? '#10b981' : 'rgba(255,255,255,0.1)',
        border: 'none',
        borderRadius: 6,
        color: '#fff',
        cursor: 'pointer',
        fontSize: 11,
        padding: '3px 8px',
        transition: 'background 0.2s',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✅ Copied' : '📋 Copy'}
    </button>
  );
}

export default function MobileSyncPage() {
  const [tab, setTab] = useState('setup');

  const tabs = [
    { id: 'setup', label: '📱 Setup ADB' },
    { id: 'commands', label: '⌨️ ADB Commands' },
    { id: 'scripts', label: '🪟 Windows Scripts' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#f8fafc', fontFamily: 'Arial,sans-serif', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📲</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px', background: 'linear-gradient(135deg,#6366f1,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Mobile Sync Tool
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 15 }}>
            Sync ไฟล์ระหว่าง PC ↔ Android (vivo, Samsung, Xiaomi ฯลฯ) ผ่าน ADB — ง่าย รวดเร็ว ไม่ต้องใช้ WiFi
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 6 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                background: tab === t.id ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent',
                color: tab === t.id ? '#fff' : '#64748b',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {tab === 'setup' && (
          <div>
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#a5b4fc' }}>
                ℹ️ ADB (Android Debug Bridge) คือเครื่องมือจาก Google ที่ช่วยให้ PC สื่อสารกับโทรศัพท์ Android ได้โดยตรงผ่าน USB — ปลอดภัย ไม่ต้องติดตั้ง App เพิ่ม
              </p>
            </div>

            {ADB_STEPS.map(step => (
              <div key={step.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>ขั้นตอนที่ {step.id}</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{step.title}</div>
                  </div>
                </div>
                <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {step.steps.map((s, i) => (
                    <li key={i} style={{ color: '#cbd5e1', fontSize: 14 }}>{s}</li>
                  ))}
                </ol>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 12, color: '#6366f1', fontSize: 13, textDecoration: 'underline' }}
                  >
                    🔗 {step.linkText}
                  </a>
                )}
              </div>
            ))}

            {/* Quick verify */}
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: '#10b981' }}>✅ ทดสอบว่า Setup ถูกต้อง</div>
              <div style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>adb devices</span>
                <CopyButton text="adb devices" />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
                ถ้าเห็น "List of devices attached" และมีชื่ออุปกรณ์ — แสดงว่า Setup สำเร็จ!
              </p>
            </div>
          </div>
        )}

        {/* Commands Tab */}
        {tab === 'commands' && (
          <div>
            {ADB_COMMANDS.map(group => (
              <div key={group.category} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 4, height: 20, background: group.color, borderRadius: 2 }} />
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{group.category}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map((item, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: 13, color: group.color, marginBottom: 4 }}>{item.cmd}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{item.desc}</div>
                        </div>
                        <CopyButton text={item.cmd} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scripts Tab */}
        {tab === 'scripts' && (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>📂 วิธีใช้ Windows Scripts</div>
              <ol style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <li>ดาวน์โหลด project <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>openthai-ai</code> มาไว้ที่ PC</li>
                <li>เปิดโฟลเดอร์ <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>tools/mobile-sync/</code></li>
                <li>ดับเบิลคลิก <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4' }}>.bat</code> ที่ต้องการรัน</li>
                <li>ทำตามขั้นตอนใน Command Prompt</li>
              </ol>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {SCRIPTS.map(s => (
                <div key={s.file} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${s.color}33`, borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{s.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{s.desc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: 6, fontSize: 11, color: s.color }}>
                      tools/mobile-sync/{s.file}
                    </code>
                    <CopyButton text={`tools\\mobile-sync\\${s.file}`} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 8 }}>⚠️ หมายเหตุความปลอดภัย</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#cbd5e1', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>ปิด USB Debugging หลังใช้งานเสร็จ เพื่อความปลอดภัย</li>
                <li>ใช้ ADB กับ PC ที่ไว้ใจเท่านั้น</li>
                <li>คำสั่ง <code>adb shell rm</code> ลบไฟล์ถาวร — ระวังก่อนรัน</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
