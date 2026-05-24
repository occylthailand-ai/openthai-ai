import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../apiBase';

const SEVERITY_CONFIG = {
  CRITICAL:  { color: '#ef4444', bg: '#ef444420', label: '🔴 CRITICAL',  badge: 'bg-red-900/40 text-red-400 border-red-700/50' },
  IMPORTANT: { color: '#f59e0b', bg: '#f59e0b20', label: '🟡 IMPORTANT', badge: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/50' },
  FUTURE:    { color: '#6366f1', bg: '#6366f120', label: '🔵 FUTURE',    badge: 'bg-indigo-900/40 text-indigo-400 border-indigo-700/50' },
};

const AGENT_EMOJI = {
  mythos: '🧠', athena: '🦉', hermes: '⚡', hephaestus: '🔧',
  poseidon: '🌊', demeter: '🌾', ares: '🛡️', plutus: '💰',
  apollo: '🎯', iris: '🌈', kronos: '⏱️', themis: '⚖️',
};

function ObstacleCard({ obs, onResolve }) {
  const cfg = SEVERITY_CONFIG[obs.severity] || SEVERITY_CONFIG.FUTURE;
  return (
    <div
      className="rounded-xl border p-4 transition-all hover:scale-[1.01]"
      style={{ borderColor: cfg.color + '44', backgroundColor: cfg.bg }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">{obs.id}</span>
          <span className="text-xs text-gray-500">
            {AGENT_EMOJI[obs.agent] || '🤖'} {obs.agent}
          </span>
        </div>
        {obs.status !== 'RESOLVED' && onResolve && (
          <button
            onClick={() => onResolve(obs.id)}
            className="text-xs bg-green-900/40 text-green-400 border border-green-700/50 px-2 py-0.5 rounded hover:bg-green-800/40 transition-colors shrink-0"
          >
            ✅ แก้แล้ว
          </button>
        )}
      </div>
      <div className="font-semibold text-sm mb-1">{obs.title}</div>
      {obs.detail && <div className="text-xs text-gray-400 leading-relaxed mb-2">{obs.detail}</div>}
      <div className="flex flex-wrap gap-2 text-xs">
        {obs.assigned_to && (
          <span className="text-gray-500">→ {obs.assigned_to}</span>
        )}
        {obs.eta && (
          <span className="text-gray-500">⏰ {obs.eta}</span>
        )}
        {obs.action_url && (
          <a
            href={obs.action_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            🔗 ดำเนินการ
          </a>
        )}
      </div>
    </div>
  );
}

export default function CommandBoardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [resolving, setResolving] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/board/status'));
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setLastRefresh(new Date());
        setError(null);
      } else {
        setError('Board ไม่พร้อมใช้งาน');
      }
    } catch (e) {
      setError('เชื่อมต่อ Backend ไม่ได้ — กำลัง retry...');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
    const interval = setInterval(fetchBoard, 60000); // refresh ทุก 1 นาที
    return () => clearInterval(interval);
  }, [fetchBoard]);

  const handleResolve = async (id) => {
    const resolution = prompt(`แก้ไข [${id}] อย่างไร?`);
    if (!resolution) return;
    setResolving(id);
    try {
      await fetch(apiUrl('/api/board/resolve'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved_by: 'zuejai', resolution }),
      });
      await fetchBoard();
    } catch (e) {
      setError(`บันทึกการแก้ไขไม่สำเร็จ: ${e.message}`);
    }
    setResolving(null);
  };

  const obstacles = data?.active_obstacles || [];
  const filtered = filter === 'ALL' ? obstacles : obstacles.filter(o => o.severity === filter);
  const criticalCount = obstacles.filter(o => o.severity === 'CRITICAL').length;
  const importantCount = obstacles.filter(o => o.severity === 'IMPORTANT').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">🗂️</span>
                <h1 className="text-2xl font-bold">Command Board</h1>
                <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/50 px-2 py-0.5 rounded-full">
                  ● LIVE
                </span>
              </div>
              <p className="text-gray-400 text-sm">บอร์ดกลาง OpenThai AI — Mythos Team Operations</p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-gray-600">
                  อัปเดต {lastRefresh.toLocaleTimeString('th-TH')}
                </span>
              )}
              <button
                onClick={fetchBoard}
                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          {data && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {[
                { label: 'Agents Online', value: `${data.summary.agents_online}/${data.summary.total_agents}`, color: '#10b981', icon: '🤖' },
                { label: 'Critical Issues', value: criticalCount, color: '#ef4444', icon: '🔴' },
                { label: 'Important Issues', value: importantCount, color: '#f59e0b', icon: '🟡' },
                { label: 'Board Status', value: data.summary.board_status, color: '#8b5cf6', icon: '📋' },
              ].map(s => (
                <div key={s.label} className="bg-gray-900/60 rounded-lg border border-gray-700 p-3">
                  <div className="text-xs text-gray-500 mb-1">{s.icon} {s.label}</div>
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {loading && (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-3 animate-pulse">🧠</div>
            <p>Mythos กำลังโหลด board...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {data && !loading && (
          <>
            {/* Team Status Grid */}
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                🤖 สถานะทีมงาน
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(data.team_status || {}).map(([id, agent]) => (
                  <div
                    key={id}
                    className="bg-gray-900 border border-gray-800 rounded-lg p-3 flex items-start gap-2"
                  >
                    <span className="text-lg">{AGENT_EMOJI[id] || '🤖'}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm capitalize">{id}</div>
                      <div className="text-xs text-gray-500 truncate">{agent.current_task}</div>
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${agent.status === 'ONLINE' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}
                        />
                        <span className={`text-xs ${agent.status === 'ONLINE' ? 'text-green-400' : 'text-gray-500'}`}>
                          {agent.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Obstacles */}
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  🚨 อุปสรรคที่ต้องแก้ไข ({obstacles.length})
                </h2>
                <div className="flex gap-2">
                  {['ALL', 'CRITICAL', 'IMPORTANT', 'FUTURE'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                        filter === f ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <div className="text-4xl mb-2">✅</div>
                  <p>ไม่มีอุปสรรค{filter !== 'ALL' ? ` ประเภท ${filter}` : ''}!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map(obs => (
                    <ObstacleCard
                      key={obs.id}
                      obs={obs}
                      onResolve={resolving ? null : handleResolve}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Notification Hours Notice */}
            <div className="rounded-xl border border-blue-800/40 bg-blue-900/10 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <div className="font-semibold text-sm text-blue-300 mb-1">
                    Mobile Notification — {data.notification_hours?.start}–{data.notification_hours?.end} น.
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">
                    Kronos ตรวจสอบระบบทุก 15 นาที — ถ้าพบอุปสรรค CRITICAL ระหว่างเวลา{' '}
                    <strong className="text-blue-400">{data.notification_hours?.start}–{data.notification_hours?.end}</strong>{' '}
                    Hermes จะส่งแจ้งเตือนไปยัง LINE ทันที
                    <br />
                    <span className="text-gray-500 mt-1 block">
                      ⚙️ ต้องตั้ง LINE_NOTIFY_TOKEN ใน Vercel ENV เพื่อเปิดใช้งาน (OBS-004)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
