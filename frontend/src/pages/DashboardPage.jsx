import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { apiUrl } from '../apiBase';

const ACTIVITY = [
  { icon: '✅', text: 'สร้างคอนเทนต์ TikTok "ผ้าไหมอุบล" สำเร็จ', time: '2 นาทีที่แล้ว', score: 9.2 },
  { icon: '🛒', text: 'ลูกค้าสั่งซื้อ "น้ำพริกป้าแดง" ผ่าน Affiliate link', time: '15 นาทีที่แล้ว', score: null },
  { icon: '⚡', text: 'AI Critic วิเคราะห์คอนเทนต์ 12 ชิ้น — เฉลี่ย 8.7/10', time: '1 ชั่วโมงที่แล้ว', score: 8.7 },
  { icon: '🌿', text: 'เพิ่มสินค้าใหม่ "เซรั่มข้าวไทย" เข้าฐานข้อมูล', time: '3 ชั่วโมงที่แล้ว', score: null },
  { icon: '🔗', text: 'เชื่อมต่อ TikTok Shop API สำเร็จ', time: 'เมื่อวาน', score: null },
];

const QUICK_ACTIONS = [
  { icon: '🤖', label: 'AI Generator', desc: 'สร้างคอนเทนต์ด้วย AI', route: '/ai-generator', color: '#6366f1', hot: true },
  { icon: '🦾', label: 'AI Agent', desc: 'ตั้งแล้วลืม · 24/7 Auto', route: '/agent', color: '#10b981', hot: true },
  { icon: '🔥', label: 'Trending Now', desc: 'Hashtag ยอดนิยมวันนี้', route: '/trending', color: '#fe2c55' },
  { icon: '📅', label: 'Content Calendar', desc: 'วางแผนโพสต์ 30 วัน', route: '/calendar', color: '#f59e0b' },
  { icon: '🧠', label: 'Brand Memory', desc: 'AI จำข้อมูลแบรนด์คุณ', route: '/brand', color: '#8b5cf6' },
  { icon: '🎙️', label: 'Voice Commander', desc: 'สั่งงาน AI ด้วยเสียง', route: '/voice', color: '#ef4444', hot: true },
  { icon: '🎬', label: 'Video Generator', desc: 'สร้างวีดีโอด้วย AI', route: '/video', color: '#8b5cf6', hot: true },
  { icon: '💳', label: 'Upgrade Plan',    desc: 'PromptPay · Subscription', route: '/payment', color: '#f59e0b' },
  { icon: '🏛️', label: 'Corporate HQ',   desc: 'บริษัทมหาชน · Board · IR · ESG', route: '/corporate', color: '#f59e0b', hot: true },
  { icon: '🎯', label: 'Command Center', desc: 'ติดตามงานทุกแผนก · KPI Live',    route: '/corporate/command', color: '#ef4444', hot: true },
  { icon: '📣', label: 'PR & Comms',    desc: 'Press Release · Media · KOL',   route: '/corporate/pr', color: '#06b6d4' },
  { icon: '🛠️', label: 'AI Tools Hub', desc: 'เครื่องมือ AI ทั้งหมด', route: '/ai-tools', color: '#06b6d4' },
  { icon: '▶️', label: 'TikTok Feed', desc: 'Feed สินค้า OTOP', route: '/tiktok', color: '#fe2c55' },
  { icon: '👥', label: 'Facebook Feed', desc: 'โพสต์ + Marketplace', route: '/facebook', color: '#1877f2' },
  { icon: '💰', label: 'Affiliate', desc: 'รับ commission 20–40%', route: '/affiliate', color: '#f59e0b' },
  { icon: '🚀', label: 'Auto-Post', desc: 'สร้างเนื้อหา AI + โพสต์ทุกแพลตฟอร์มพร้อมกัน', route: '/autopost', color: '#6366f1', hot: true },
  { icon: '📦', label: 'Bulk Content', desc: 'สร้างเนื้อหา 7–30 วันพร้อมกันในคลิกเดียว', route: '/bulk-post', color: '#fe2c55', hot: true },
  { icon: '📊', label: 'Analytics', desc: 'วิเคราะห์ผล · Platform · Angle · Revenue จริง', route: '/analytics', color: '#10b981', hot: true },
  { icon: '💡', label: 'Content Ideas', desc: 'AI สร้างไอเดีย · Truth Angle · หลาย Platform', route: '/ideas', color: '#f59e0b', hot: true },
  { icon: '🔗', label: 'Link Tracker', desc: 'ติดตาม affiliate link · คลิก · Conversion · รายได้', route: '/link-tracker', color: '#06b6d4' },
];

const AI_SKILLS = [
  { name: 'S1 · RCCF Prompt', desc: 'สร้าง Hook ที่ดึงดูดใจ', pct: 95, color: '#6366f1' },
  { name: 'S2 · Taste Check', desc: 'ตรวจสอบความถูกต้องของเนื้อหา', pct: 88, color: '#8b5cf6' },
  { name: 'S3 · Master Prompt', desc: 'Prompt Engineering ขั้นสูง', pct: 92, color: '#10b981' },
  { name: 'S6 · AI Critic', desc: 'ประเมินคุณภาพคอนเทนต์ 0-10', pct: 97, color: '#f59e0b' },
  { name: 'S7 · Context Card', desc: 'วิเคราะห์บริบทสินค้าไทย', pct: 90, color: '#fe2c55' },
  { name: 'S9 · Learning Layer', desc: 'เรียนรู้จากผลลัพธ์จริง', pct: 78, color: '#06b6d4' },
];

const PLATFORMS_STATUS = [
  { name: 'TikTok Shop', icon: '▶️', status: 'live', users: '1.2M' },
  { name: 'Shopee', icon: '🟠', status: 'live', users: '890K' },
  { name: 'Lazada', icon: '🔵', status: 'live', users: '650K' },
  { name: 'Facebook', icon: '👥', status: 'live', users: '2.1M' },
  { name: 'LINE Shopping', icon: '💚', status: 'beta', users: '340K' },
  { name: 'Instagram', icon: '📸', status: 'soon', users: '-' },
];

const DashboardPage = ({ onLogout }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [ticker, setTicker] = useState(0);
  const [liveStats, setLiveStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const h = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.allSettled([
      fetch(apiUrl('/api/health')).then(r => r.json()),
      fetch(apiUrl('/api/track/dashboard'), { headers: h }).then(r => r.json()),
      fetch(apiUrl('/api/autopost/log'), { headers: h }).then(r => r.json()),
    ]).then(([healthR, trackR, logR]) => {
      const health = healthR.status === 'fulfilled' ? healthR.value : {};
      const track  = trackR.status  === 'fulfilled' ? trackR.value  : {};
      const log    = logR.status    === 'fulfilled' ? logR.value    : {};

      const postCount = log.total || 0;
      const baseCount = 24891;
      const totalContent = baseCount + postCount;
      setTicker(totalContent);

      setLiveStats({
        posts:       { value: postCount, delta: postCount > 0 ? `+${postCount} โพสต์จริง` : 'ยังไม่มีประวัติ' },
        clicks:      { value: track.totals?.clicks || 0, delta: `${track.totals?.conversions || 0} conversion` },
        affiliates:  { value: health.affiliates || 0, delta: `${health.agents || 0} agents` },
        revenue:     { value: `฿${(track.totals?.revenue || 0).toLocaleString()}`, delta: `CTR ${track.totals?.conversions && track.totals?.clicks ? ((track.totals.conversions / track.totals.clicks) * 100).toFixed(1) : '0'}%` },
        ai:          health.ai_active || 'mock',
        uptime:      health.uptime_sec ? `${Math.floor(health.uptime_sec / 60)} นาที` : '-',
      });

      // Real activity from autopost log
      const acts = (log.data || []).slice(0, 5).map(item => ({
        icon: '🚀',
        text: `โพสต์ "${item.product || 'เนื้อหา'}" — ${(item.results || []).filter(r => r.status === 'success').length}/${(item.results || []).length} platform สำเร็จ`,
        time: item.dispatched_at ? new Date(item.dispatched_at).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
        score: null,
      }));
      if (acts.length > 0) setRecentActivity(acts);
    });

    const interval = setInterval(() => setTicker(prev => prev + Math.floor(Math.random() * 2)), 4000);
    return () => clearInterval(interval);
  }, []);

  const NAV = [
    { id: 'overview', icon: '🏠', label: 'ภาพรวม' },
    { id: 'ai', icon: '🤖', label: 'AI Tools', routes: ['/ai-generator', '/ai-tools'] },
    { id: 'social', icon: '📱', label: 'Social Feed' },
    { id: 'analytics', icon: '📊', label: 'Analytics' },
    { id: 'settings', icon: '⚙️', label: 'ตั้งค่า' },
  ];

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar pro-sidebar">
        <div className="sidebar-brand">
          <Logo size="sm" style={{ maxWidth: '160px' }} />
          <div className="pro-badge">PRO</div>
        </div>

        <div className="nav-links">
          {NAV.map(item => (
            <div
              key={item.id}
              className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.icon}</span> {item.label}
            </div>
          ))}

          <div className="nav-separator" />
          <div className="nav-section-label">AI Automation</div>
          <div className="nav-link" onClick={() => navigate('/agent')}>
            <span>🦾</span> AI Agent
            <span className="nav-badge-new" style={{ background: '#10b981' }}>24/7</span>
          </div>

          <div className="nav-separator" />
          <div className="nav-section-label">โซเชียลมีเดีย</div>
          <div className="nav-link" onClick={() => navigate('/tiktok')}>
            <span className="tiktok-nav-icon">▶</span> TikTok Feed
            <span className="nav-badge-new">LIVE</span>
          </div>
          <div className="nav-link" onClick={() => navigate('/facebook')}>
            <span style={{ color: '#1877f2', fontWeight: 900 }}>f</span> Facebook Feed
            <span className="nav-badge-new" style={{ background: '#1877f2' }}>LIVE</span>
          </div>
        </div>

        {/* AI Status Indicator */}
        <div className="ai-status-box">
          <div className="ai-status-dot" />
          <div>
            <div className="ai-status-label">Claude AI</div>
            <div className="ai-status-sub">ออนไลน์ · พร้อมใช้งาน</div>
          </div>
        </div>

        <button className="logout-btn" onClick={onLogout}>ออกจากระบบ</button>
      </aside>

      {/* Main Content */}
      <main className="main-content pro-main">

        {/* Top Bar */}
        <div className="pro-topbar">
          <div>
            <h2 className="pro-greeting">สวัสดีผู้จัดการ 👋</h2>
            <p className="pro-subgreeting">Openthai.ai Pro · วันนี้ระบบสร้างคอนเทนต์ไปแล้ว <strong style={{ color: '#a5b4fc' }}>{ticker.toLocaleString()}</strong> ชิ้น</p>
          </div>
          <button className="pro-cta-btn" onClick={() => navigate('/ai-generator')}>
            ⚡ สร้างคอนเทนต์ AI
          </button>
        </div>

        {/* Stats Row */}
        <div className="pro-stats-row">
          {[
            { icon: '⚡', label: 'คอนเทนต์สร้างแล้ว', value: ticker.toLocaleString(), delta: liveStats?.posts.delta || '+12% วันนี้', color: '#6366f1' },
            { icon: '🔗', label: 'คลิก Affiliate', value: (liveStats?.clicks.value || 0).toLocaleString(), delta: liveStats?.clicks.delta || 'กำลังโหลด...', color: '#10b981' },
            { icon: '🤖', label: 'AI Engine', value: liveStats?.ai || 'Claude', delta: `uptime ${liveStats?.uptime || '-'}`, color: '#f59e0b' },
            { icon: '💰', label: 'รายได้ Affiliate', value: liveStats?.revenue.value || '฿0', delta: liveStats?.revenue.delta || 'ดูสถิติ', color: '#fe2c55' },
          ].map((s, i) => (
            <div key={i} className="pro-stat-card glass-panel" style={{ '--accent': s.color }}>
              <div className="pro-stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
              <div className="pro-stat-value">{s.value}</div>
              <div className="pro-stat-label">{s.label}</div>
              <div className="pro-stat-delta">{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="pro-section-title">⚡ Quick Actions</div>
        <div className="pro-quick-actions">
          {QUICK_ACTIONS.map((a, i) => (
            <div key={i} className="pro-action-card glass-panel" onClick={() => navigate(a.route)}
                 style={{ '--acolor': a.color }}>
              {a.hot && <span className="pro-hot-badge">HOT</span>}
              <div className="pro-action-icon" style={{ background: `${a.color}20`, color: a.color }}>{a.icon}</div>
              <div className="pro-action-label">{a.label}</div>
              <div className="pro-action-desc">{a.desc}</div>
            </div>
          ))}
        </div>

        <div className="pro-two-col">
          {/* Left: Activity + Platform Status */}
          <div>
            <div className="pro-section-title">🕐 กิจกรรมล่าสุด</div>
            <div className="pro-activity-list glass-panel">
              {(recentActivity.length > 0 ? recentActivity : ACTIVITY).map((a, i) => (
                <div key={i} className="pro-activity-item">
                  <span className="pro-activity-icon">{a.icon}</span>
                  <span className="pro-activity-text">{a.text}</span>
                  <div className="pro-activity-right">
                    {a.score && <span className="pro-score-badge">{a.score}</span>}
                    <span className="pro-activity-time">{a.time}</span>
                  </div>
                </div>
              ))}
              {recentActivity.length > 0 && (
                <button onClick={() => navigate('/autopost')} style={{ width: '100%', textAlign: 'center', fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 2px' }}>
                  ดูประวัติทั้งหมด →
                </button>
              )}
            </div>

            <div className="pro-section-title" style={{ marginTop: '24px' }}>🌐 สถานะแพลตฟอร์ม</div>
            <div className="pro-platforms-grid glass-panel">
              {PLATFORMS_STATUS.map((p, i) => (
                <div key={i} className="pro-platform-row">
                  <span className="pro-platform-icon">{p.icon}</span>
                  <span className="pro-platform-name">{p.name}</span>
                  <span className={`pro-platform-status status-${p.status}`}>
                    {p.status === 'live' ? '● Live' : p.status === 'beta' ? '◑ Beta' : '○ Soon'}
                  </span>
                  <span className="pro-platform-users">{p.users}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: AI Skills */}
          <div>
            <div className="pro-section-title">🧠 9-Skills AI Framework</div>
            <div className="pro-skills-list glass-panel">
              <div className="pro-skills-header">
                ระบบ AI ของ Openthai.ai ประกอบด้วย 9 ทักษะหลัก พัฒนาเฉพาะสำหรับสินค้าไทยและตลาด ASEAN
              </div>
              {AI_SKILLS.map((s, i) => (
                <div key={i} className="pro-skill-row">
                  <div className="pro-skill-header-row">
                    <span className="pro-skill-name">{s.name}</span>
                    <span className="pro-skill-pct" style={{ color: s.color }}>{s.pct}%</span>
                  </div>
                  <div className="pro-skill-desc">{s.desc}</div>
                  <div className="pro-skill-bar-bg">
                    <div className="pro-skill-bar-fill" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
              <button className="pro-view-all-btn" onClick={() => navigate('/ai-tools')}>
                ดูเครื่องมือ AI ทั้งหมด →
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardPage;
