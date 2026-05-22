import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Logo';

const NAV = [
  { section: '🏛️ Governance', items: [
    { icon: '👑', label: 'Corporate Overview',  route: '/corporate' },
    { icon: '🤝', label: 'Board of Directors',  route: '/corporate/board' },
    { icon: '🔍', label: 'Audit & Risk',        route: '/corporate/audit' },
    { icon: '📋', label: 'Company Secretary',   route: '/corporate/secretary' },
    { icon: '⚖️', label: 'Compliance & Legal',  route: '/corporate/compliance' },
    { icon: '📈', label: 'Investor Relations',  route: '/corporate/ir' },
  ]},
  { section: '⚙️ Operations', items: [
    { icon: '💰', label: 'Finance & Accounting', route: '/corporate/finance' },
    { icon: '👥', label: 'Human Resources',      route: '/corporate/hr' },
    { icon: '🤖', label: 'Technology & AI',      route: '/corporate/it' },
    { icon: '📢', label: 'Marketing & Sales',    route: '/corporate/marketing' },
    { icon: '📦', label: 'Procurement',          route: '/corporate/procurement' },
    { icon: '🌏', label: 'Global Operations',    route: '/corporate/global' },
  ]},
  { section: '🚀 Strategy', items: [
    { icon: '🎯', label: 'Strategy & Biz Dev',   route: '/corporate/strategy' },
    { icon: '🌿', label: 'ESG & Sustainability', route: '/corporate/esg' },
    { icon: '📊', label: 'IPO Roadmap',          route: '/corporate/ipo' },
  ]},
  { section: '📣 Communications', items: [
    { icon: '📣', label: 'PR & Global Comms',    route: '/corporate/pr' },
    { icon: '🎯', label: 'Command Center',        route: '/corporate/command' },
  ]},
];

const CorporateLayout = ({ children, title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a18 0%, #0d1b2a 100%)', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Sidebar */}
      <aside style={{ width: collapsed ? '60px' : '240px', transition: 'width 0.25s', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Brand */}
        <div style={{ padding: '16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {!collapsed && (
            <div>
              <Logo size="sm" style={{ maxWidth: '120px' }} />
              <div style={{ fontSize: '9px', color: '#6366f1', fontWeight: 700, marginTop: '2px', letterSpacing: '2px' }}>PUBLIC COMPANY</div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px' }}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Back to main */}
        <div style={{ padding: '8px' }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a0a0b0', borderRadius: '8px', padding: '8px', cursor: 'pointer', fontSize: '12px', textAlign: collapsed ? 'center' : 'left' }}>
            {collapsed ? '⬅' : '⬅ Back to Dashboard'}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {NAV.map(section => (
            <div key={section.section} style={{ marginBottom: '16px' }}>
              {!collapsed && <div style={{ fontSize: '10px', color: '#4b5563', fontWeight: 700, letterSpacing: '1px', padding: '4px 8px', marginBottom: '4px' }}>{section.section}</div>}
              {section.items.map(item => {
                const active = location.pathname === item.route;
                return (
                  <button key={item.route} onClick={() => navigate(item.route)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: collapsed ? '10px' : '9px 12px', borderRadius: '8px', border: 'none', background: active ? 'rgba(99,102,241,0.2)' : 'transparent', color: active ? '#a5b4fc' : '#9ca3af', cursor: 'pointer', fontSize: '13px', fontWeight: active ? 700 : 400, textAlign: 'left', justifyContent: collapsed ? 'center' : 'flex-start', marginBottom: '2px', transition: 'all 0.15s' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                    {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                    {active && !collapsed && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: '10px', color: '#374151' }}>
            <div>OpenThai AI Public Co., Ltd.</div>
            <div style={{ color: '#6366f1', marginTop: '2px' }}>SET/MAI Ready · Global</div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>{title}</h1>
            {subtitle && <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{subtitle}</p>}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>PUBLIC COMPANY</span>
            <span style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>🌏 GLOBAL</span>
          </div>
        </div>
        <div style={{ flex: 1, padding: '28px' }}>{children}</div>
      </main>
    </div>
  );
};

export default CorporateLayout;
