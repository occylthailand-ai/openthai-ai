import React, { useState, useEffect } from 'react';
import CorporateLayout from '../../components/CorporateLayout';
import { apiUrl } from '../../apiBase';

const TABS = ['Press Releases', 'Media Contacts', 'Campaigns', 'KOL', 'Crisis Plan', 'Newsletter'];

const statusColor = s => ({ published: '#10b981', draft: '#f59e0b', archived: '#6b7280', active: '#10b981', planning: '#6366f1', completed: '#8b5cf6' }[s] || '#6b7280');
const tierBadge   = t => ({ 1: '#ef4444', 2: '#f59e0b', 3: '#6b7280' }[t] || '#6b7280');

const PRCommsPage = () => {
  const [tab, setTab]         = useState(0);
  const [releases, setReleases] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [kols, setKols]       = useState([]);
  const [crisis, setCrisis]   = useState(null);
  const [newsletters, setNewsletters] = useState(null);

  useEffect(() => {
    fetch(apiUrl('/api/corporate/pr/releases')).then(r => r.json()).then(d => setReleases(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/contacts')).then(r => r.json()).then(d => setContacts(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/campaigns')).then(r => r.json()).then(d => setCampaigns(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/kols')).then(r => r.json()).then(d => setKols(d.data || [])).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/crisis')).then(r => r.json()).then(d => setCrisis(d.data)).catch(() => {});
    fetch(apiUrl('/api/corporate/pr/newsletters')).then(r => r.json()).then(d => setNewsletters(d.data)).catch(() => {});
  }, []);

  const card = (style = {}) => ({
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '18px', ...style,
  });

  return (
    <CorporateLayout title="📣 PR & Global Communications" subtitle="Press Room · Media Center · KOL · Crisis · Newsletter · Global Campaigns">

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Press Releases', value: releases.length, sub: `${releases.filter(r => r.status === 'published').length} Published`, color: '#6366f1' },
          { label: 'Media Outlets', value: contacts.length, sub: `${contacts.filter(c => c.tier === 1).length} Tier 1`, color: '#10b981' },
          { label: 'Campaigns', value: campaigns.length, sub: `${campaigns.filter(c => c.status === 'active').length} Active`, color: '#f59e0b' },
          { label: 'KOL Partners', value: kols.length, sub: `${kols.filter(k => k.status === 'active').length} Active`, color: '#fe2c55' },
        ].map((s, i) => (
          <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '30px', fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: tab === i ? 700 : 400, background: tab === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: tab === i ? '#a5b4fc' : '#9ca3af' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Press Releases */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {releases.map(r => (
            <div key={r.id} style={card({ display: 'flex', gap: '16px', alignItems: 'flex-start' })}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>{r.title}</span>
                  <span style={{ fontSize: '10px', background: `${statusColor(r.status)}20`, color: statusColor(r.status), padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>{r.status}</span>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.07)', color: '#9ca3af', padding: '2px 6px', borderRadius: '6px' }}>{r.category}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6366f1', marginBottom: '4px' }}>{r.titleEN}</div>
                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '8px' }}>{r.summary}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(r.languages || []).map(l => (
                    <span key={l} style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>{l.toUpperCase()}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '80px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.date}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{r.views} views</div>
              </div>
            </div>
          ))}
          <button style={{ background: 'rgba(99,102,241,0.15)', border: '1px dashed rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '12px', padding: '14px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>
            + เขียน Press Release ใหม่
          </button>
        </div>
      )}

      {/* Tab: Media Contacts */}
      {tab === 1 && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {contacts.map(c => (
              <div key={c.id} style={card({ display: 'flex', gap: '14px', alignItems: 'center' })}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${tierBadge(c.tier)}20`, border: `1px solid ${tierBadge(c.tier)}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  📰
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '2px' }}>{c.outlet}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{c.beat} · {c.country}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.contact}</div>
                </div>
                <span style={{ fontSize: '10px', background: `${tierBadge(c.tier)}20`, color: tierBadge(c.tier), padding: '3px 8px', borderRadius: '10px', fontWeight: 800, flexShrink: 0 }}>T{c.tier}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Global Campaigns */}
      {tab === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {campaigns.map(c => (
            <div key={c.id} style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{c.name}</span>
                  <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '10px' }}>{c.nameLocal}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', background: '#1e3a5f', color: '#60a5fa', padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>{c.region}</span>
                  <span style={{ fontSize: '11px', background: `${statusColor(c.status)}20`, color: statusColor(c.status), padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>{c.status}</span>
                </div>
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '10px', fontStyle: 'italic' }}>"{c.message}"</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {(c.channels || []).map(ch => (
                  <span key={ch} style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', color: '#d1d5db', padding: '3px 8px', borderRadius: '8px' }}>{ch}</span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px' }}>
                {[
                  { label: 'Reach', value: (c.kpi?.reach || 0).toLocaleString(), target: (c.kpi?.target_reach || 0).toLocaleString() },
                  { label: 'Engagement', value: (c.kpi?.engagement || 0).toLocaleString(), target: '-' },
                  { label: 'Leads', value: (c.kpi?.leads || 0).toLocaleString(), target: '-' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#a5b4fc' }}>{k.value}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{k.label} / target: {k.target}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#4b5563' }}>{c.startDate} → {c.endDate}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: KOL Management */}
      {tab === 3 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {kols.map(k => (
            <div key={k.id} style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 800 }}>{k.name}</div>
                <span style={{ fontSize: '10px', background: `${tierBadge(k.tier)}20`, color: tierBadge(k.tier), padding: '3px 8px', borderRadius: '10px', fontWeight: 800 }}>T{k.tier}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '8px' }}>{k.platform}</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#d1d5db', padding: '2px 8px', borderRadius: '8px' }}>{k.followers}</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.06)', color: '#d1d5db', padding: '2px 8px', borderRadius: '8px' }}>{k.niche}</span>
                <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '8px' }}>{k.region}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', background: `${statusColor(k.status)}20`, color: statusColor(k.status), padding: '2px 10px', borderRadius: '10px', fontWeight: 700 }}>{k.status}</span>
                <button style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                  ติดต่อ
                </button>
              </div>
            </div>
          ))}
          <div style={{ ...card(), display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.1)', color: '#4b5563', minHeight: '120px' }}>
            <span style={{ fontSize: '28px' }}>+</span>
            <span style={{ fontSize: '13px' }}>เพิ่ม KOL ใหม่</span>
          </div>
        </div>
      )}

      {/* Tab: Crisis Communication */}
      {tab === 4 && crisis && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {crisis.levels.map(l => (
              <div key={l.level} style={{ background: `${l.color}10`, border: `2px solid ${l.color}40`, borderRadius: '14px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: l.color }}>L{l.level}</span>
                  <span style={{ fontSize: '11px', background: `${l.color}20`, color: l.color, padding: '3px 8px', borderRadius: '8px', fontWeight: 700 }}>{l.label}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{l.desc}</div>
                <div style={{ fontSize: '11px', color: l.color, fontWeight: 700 }}>⏱ {l.response_time}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{l.owner}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>Holding Statements (3 ภาษา)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {[
              { lang: '🇹🇭 TH', text: crisis.holding_statements?.th, color: '#3b82f6' },
              { lang: '🇬🇧 EN', text: crisis.holding_statements?.en, color: '#10b981' },
              { lang: '🇨🇳 ZH', text: crisis.holding_statements?.zh, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={card({ borderLeft: `3px solid ${s.color}` })}>
                <div style={{ fontSize: '11px', color: s.color, fontWeight: 700, marginBottom: '6px' }}>{s.lang}</div>
                <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.6 }}>{s.text}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>Emergency Contacts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {crisis.contacts.map((c, i) => (
              <div key={i} style={card()}>
                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>{c.role}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>{c.phone}</div>
                <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px' }}>{c.email}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Newsletter */}
      {tab === 5 && newsletters && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'สมาชิก TH', value: newsletters.subscribers?.th || 0, color: '#3b82f6' },
              { label: 'สมาชิก EN', value: newsletters.subscribers?.en || 0, color: '#10b981' },
              { label: 'สมาชิก ZH', value: newsletters.subscribers?.zh || 0, color: '#ef4444' },
            ].map((s, i) => (
              <div key={i} style={{ background: `${s.color}10`, border: `1px solid ${s.color}30`, borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <h3 style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 12px' }}>Newsletter Templates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(newsletters.templates || []).map(t => (
              <div key={t.id} style={card({ display: 'flex', alignItems: 'center', gap: '14px' })}>
                <div style={{ fontSize: '28px' }}>📧</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.07)', color: '#9ca3af', padding: '2px 8px', borderRadius: '6px' }}>{t.freq}</span>
                    {(t.lang || []).map(l => <span key={l} style={{ fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px' }}>{l.toUpperCase()}</span>)}
                  </div>
                </div>
                <span style={{ fontSize: '11px', background: `${statusColor(t.status)}20`, color: statusColor(t.status), padding: '3px 10px', borderRadius: '10px', fontWeight: 700 }}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CorporateLayout>
  );
};

export default PRCommsPage;
