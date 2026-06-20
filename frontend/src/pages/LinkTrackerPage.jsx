import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const PLATFORM_ICONS = { facebook: '📘', instagram: '📸', tiktok: '🎵', twitter: '🐦', line: '💚', telegram: '✈️', youtube: '▶️', manual: '✋', unknown: '❓' };

function StatCard({ icon, label, value, sub, color = 'indigo' }) {
  const colors = { indigo: 'from-indigo-600/20 to-indigo-600/5 border-indigo-800', emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-800', amber: 'from-amber-600/20 to-amber-600/5 border-amber-800', rose: 'from-rose-600/20 to-rose-600/5 border-rose-800' };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function LinkTrackerPage() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [linkStats, setLinkStats] = useState(null);
  const [createForm, setCreateForm] = useState({ affiliateRef: '', platform: 'manual', productId: '', destination: '' });
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-admin-key': localStorage.getItem('admin_key') || '' };

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const r = await fetch(apiUrl('/api/track/dashboard'), { headers });
      const d = await r.json();
      if (d.dashboard) setDashboard(d.dashboard);
    } catch (_) {}
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(() => loadDashboard(true), 10000); // refresh every 10s
    return () => clearInterval(timer);
  }, [loadDashboard]);

  async function loadLinkStats(code) {
    setSelectedLink(code);
    try {
      const r = await fetch(apiUrl(`/api/track/stats/${code}`), { headers });
      const d = await r.json();
      if (d.stats) setLinkStats(d.stats);
    } catch (_) {}
  }

  async function createLink() {
    if (!createForm.affiliateRef) return;
    setCreating(true);
    try {
      const r = await fetch(apiUrl('/api/track/create'), {
        method: 'POST', headers,
        body: JSON.stringify(createForm),
      });
      const d = await r.json();
      setNewLink(d);
      loadDashboard();
    } catch (_) {}
    setCreating(false);
  }

  const totals = dashboard?.totals || {};
  const byPlatform = dashboard?.by_platform || {};
  const topLinks = dashboard?.top_links || [];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              🔗 Link Tracker
            </h1>
            <p className="text-gray-400 mt-1">ติดตาม affiliate link แบบ real-time — คลิก · Conversion · รายได้</p>
          </div>
          <button onClick={() => loadDashboard()} className={`flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-xl text-sm hover:bg-gray-700 transition-all ${refreshing ? 'opacity-60' : ''}`}>
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span> รีเฟรช
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1 w-fit">
          {[['dashboard', '📊 ภาพรวม'], ['links', '🔗 ลิ้งทั้งหมด'], ['create', '➕ สร้างลิ้ง']].map(([t, label]) => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon="👆" label="คลิกทั้งหมด" value={totals.clicks?.toLocaleString() || '0'} color="indigo" />
              <StatCard icon="👤" label="Unique คลิก" value={totals.unique_clicks?.toLocaleString() || '0'} color="indigo" />
              <StatCard icon="✅" label="Conversion" value={totals.conversions?.toLocaleString() || '0'} color="emerald" />
              <StatCard icon="💰" label="รายได้รวม" value={`฿${(totals.revenue || 0).toLocaleString('th-TH')}`} color="amber" />
            </div>

            {/* Platform Breakdown */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
              <h2 className="font-semibold text-gray-300 mb-4">📡 สถิติตามแพลตฟอร์ม</h2>
              {Object.keys(byPlatform).length === 0 ? (
                <p className="text-gray-600 text-sm">ยังไม่มีข้อมูล</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(byPlatform).map(([pid, stats]) => (
                    <div key={pid} className="bg-gray-800 rounded-xl p-4">
                      <div className="text-2xl mb-1">{PLATFORM_ICONS[pid] || '📤'}</div>
                      <div className="text-sm font-semibold capitalize text-white">{pid}</div>
                      <div className="mt-2 space-y-1 text-xs text-gray-400">
                        <div>👆 {stats.clicks.toLocaleString()} คลิก</div>
                        <div>✅ {stats.conversions} conversion</div>
                        <div>💰 ฿{(stats.revenue || 0).toLocaleString()}</div>
                        <div className="text-emerald-400">CTR {stats.clicks > 0 ? ((stats.conversions / stats.clicks) * 100).toFixed(1) : 0}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Links */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h2 className="font-semibold text-gray-300 mb-4">🏆 Top Links</h2>
              {topLinks.length === 0 ? <p className="text-gray-600 text-sm">ยังไม่มีลิ้ง</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                        <th className="pb-3 text-left">ลิ้ง</th>
                        <th className="pb-3 text-left">แพลตฟอร์ม</th>
                        <th className="pb-3 text-right">คลิก</th>
                        <th className="pb-3 text-right">Unique</th>
                        <th className="pb-3 text-right">Conv.</th>
                        <th className="pb-3 text-right">CTR</th>
                        <th className="pb-3 text-right">รายได้</th>
                        <th className="pb-3 text-right">สร้าง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLinks.map(link => (
                        <tr key={link.code} onClick={() => { setActiveTab('links'); loadLinkStats(link.code); }}
                          className="border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors">
                          <td className="py-3 font-mono text-indigo-400">/go/{link.code}</td>
                          <td className="py-3">{PLATFORM_ICONS[link.platform]} {link.platform}</td>
                          <td className="py-3 text-right font-semibold">{link.clicks.toLocaleString()}</td>
                          <td className="py-3 text-right text-gray-400">{link.unique_clicks.toLocaleString()}</td>
                          <td className="py-3 text-right text-emerald-400">{link.conversions}</td>
                          <td className="py-3 text-right text-blue-400">{link.ctr}</td>
                          <td className="py-3 text-right text-amber-400">฿{(link.revenue || 0).toLocaleString()}</td>
                          <td className="py-3 text-right text-gray-600 text-xs">{new Date(link.created_at).toLocaleDateString('th-TH')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'links' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-300">🔗 ลิ้งทั้งหมด</h2>
              {topLinks.map(link => (
                <button key={link.code} onClick={() => loadLinkStats(link.code)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedLink === link.code ? 'border-emerald-500 bg-emerald-950/30' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-indigo-400 text-sm">/go/{link.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${link.clicks > 0 ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-500'}`}>{link.clicks} คลิก</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{PLATFORM_ICONS[link.platform]} {link.platform}</span>
                    <span>·</span>
                    <span>{link.affiliate_ref || 'ไม่มี ref'}</span>
                    <span className="ml-auto text-emerald-400">{link.ctr} CTR</span>
                  </div>
                </button>
              ))}
            </div>

            {linkStats && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 sticky top-6">
                <h3 className="font-semibold text-white mb-4">📈 รายละเอียด /go/{linkStats.code}</h3>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-white">{linkStats.clicks}</div>
                    <div className="text-xs text-gray-500">คลิกรวม</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-emerald-400">{linkStats.unique_clicks}</div>
                    <div className="text-xs text-gray-500">Unique</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-blue-400">{linkStats.ctr}</div>
                    <div className="text-xs text-gray-500">CTR</div>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-amber-400">฿{(linkStats.revenue || 0).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">รายได้</div>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">ปลายทาง</p>
                  <p className="text-xs text-blue-400 break-all">{linkStats.destination}</p>
                </div>
                {linkStats.recent?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">คลิกล่าสุด</p>
                    <div className="space-y-1">
                      {linkStats.recent.slice(0, 5).map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 rounded-lg p-2">
                          <span>{c.is_unique ? '🆕' : '🔁'}</span>
                          <span>{c.country || '?'}</span>
                          <span className="ml-auto text-gray-600">{new Date(c.ts).toLocaleTimeString('th-TH')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div className="max-w-lg">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
              <h2 className="font-semibold text-gray-300">➕ สร้าง Tracking Link ใหม่</h2>
              <input value={createForm.affiliateRef} onChange={e => setCreateForm(f => ({ ...f, affiliateRef: e.target.value }))}
                placeholder="Affiliate Ref Code *" className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <select value={createForm.platform} onChange={e => setCreateForm(f => ({ ...f, platform: e.target.value }))}
                className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {Object.entries(PLATFORM_ICONS).map(([id, icon]) => (
                  <option key={id} value={id}>{icon} {id}</option>
                ))}
              </select>
              <input value={createForm.productId} onChange={e => setCreateForm(f => ({ ...f, productId: e.target.value }))}
                placeholder="Product ID (ถ้ามี)" className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input value={createForm.destination} onChange={e => setCreateForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="URL ปลายทาง (ถ้าว่างจะใช้ /store?ref=... อัตโนมัติ)" className="w-full bg-gray-800 rounded-xl p-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={createLink} disabled={!createForm.affiliateRef || creating}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl font-bold disabled:opacity-50">
                {creating ? '⏳ กำลังสร้าง...' : '✨ สร้าง Tracking Link'}
              </button>

              {newLink && (
                <div className="bg-emerald-950 border border-emerald-700 rounded-xl p-4">
                  <p className="text-emerald-300 font-semibold mb-2">✅ สร้างลิ้งสำเร็จ!</p>
                  <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
                    <span className="text-blue-400 text-sm font-mono break-all flex-1">{newLink.shortUrl}</span>
                    <button onClick={() => navigator.clipboard.writeText(newLink.shortUrl)} className="text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600">คัดลอก</button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">→ {newLink.destination}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
