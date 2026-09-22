import { useState, useEffect, useRef } from 'react'
import { apiUrl } from '../apiBase'

const SEV = {
  critical: { bg: 'bg-red-100',    text: 'text-red-700',    badge: 'bg-red-500',    emoji: '🚨' },
  warning:  { bg: 'bg-yellow-50',  text: 'text-yellow-700', badge: 'bg-yellow-400', emoji: '⚠️' },
  info:     { bg: 'bg-blue-50',    text: 'text-blue-700',   badge: 'bg-blue-400',   emoji: 'ℹ️' },
}
const TEAM_EMOJI = { dev: '👨‍💻', devops: '🖥️', finance: '💰', support: '🎧', mythos: '👑' }
const CAT_EMOJI  = { api: '🔌', frontend: '🌐', db: '🗄️', ssl: '🔒', perf: '⚡', payment: '💳' }

export default function ErrorHunterPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [lastRun, setLastRun] = useState(null)
  const [autoRun, setAutoRun] = useState(false)
  const intervalRef = useRef(null)

  const runHunt = async () => {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/system/error-hunt'))
      const data = await res.json()
      setResult(data)
      setLastRun(new Date())
    } catch (e) {
      setResult({ status: 'error', criticals: 0, warnings: 0, issues: [], error: e.message })
    }
    setLoading(false)
  }

  useEffect(() => {
    runHunt()
  }, [])

  useEffect(() => {
    if (autoRun) {
      intervalRef.current = setInterval(runHunt, 60000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [autoRun])

  const issues = result?.issues || []
  const criticals = issues.filter(i => i.severity === 'critical')
  const warnings  = issues.filter(i => i.severity === 'warning')
  const byTeam    = issues.reduce((acc, i) => {
    acc[i.team] = acc[i.team] || []
    acc[i.team].push(i)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              🔍 <span>Error Hunter</span>
              {result && (
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                  result.status === 'ok' ? 'bg-green-900 text-green-300' :
                  result.status === 'critical' ? 'bg-red-900 text-red-300' : 'bg-gray-700'
                }`}>
                  {result.status === 'ok' ? '✅ ระบบปกติ' : result.status === 'critical' ? '🚨 พบปัญหาวิกฤต' : '⚠️ มีคำเตือน'}
                </span>
              )}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              ชอนไชยค้นหาปัญหาทั่วระบบ — แจ้งทีมแก้ไขอัตโนมัติ
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} className="w-4 h-4" />
              Auto (60s)
            </label>
            <button onClick={runHunt} disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition disabled:opacity-50">
              {loading ? '🔄 กำลังสแกน...' : '▶ รัน Error Hunt'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: '🚨 Critical',   value: criticals.length, color: criticals.length > 0 ? 'text-red-400' : 'text-gray-500' },
            { label: '⚠️ Warning',    value: warnings.length,  color: warnings.length > 0 ? 'text-yellow-400' : 'text-gray-500' },
            { label: '🔍 ตรวจสอบ',    value: issues.length,    color: 'text-blue-400' },
            { label: '⏱️ เวลา (s)',   value: result?.elapsed_sec ?? '-', color: 'text-gray-300' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Last run */}
        {lastRun && (
          <p className="text-xs text-gray-500 mb-4">
            Last scan: {lastRun.toLocaleString('th-TH')}
            {result?.elapsed_sec && ` (${result.elapsed_sec}s)`}
          </p>
        )}

        {loading && (
          <div className="bg-gray-900 rounded-xl p-8 text-center border border-gray-800 mb-6">
            <div className="text-4xl mb-3 animate-pulse">🔍</div>
            <p className="text-gray-400">กำลังสแกนระบบทั้งหมด...</p>
            <p className="text-xs text-gray-600 mt-1">API • Frontend • Database • SSL • External Services</p>
          </div>
        )}

        {/* No issues */}
        {!loading && result && issues.length === 0 && (
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-8 text-center mb-6">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-bold text-green-400">ระบบทำงานปกติทุกอย่าง!</h3>
            <p className="text-green-600 text-sm mt-1">ไม่พบ error หรือ warning ใดๆ</p>
          </div>
        )}

        {/* Issues by Team */}
        {!loading && Object.keys(byTeam).length > 0 && (
          <div className="space-y-4 mb-6">
            {Object.entries(byTeam).map(([team, teamIssues]) => (
              <div key={team} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">
                    {TEAM_EMOJI[team] || '🔹'} {team.toUpperCase()} Team
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    teamIssues.some(i => i.severity === 'critical') ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {teamIssues.length} issues
                  </span>
                </div>
                <div className="divide-y divide-gray-800">
                  {teamIssues.map((issue, idx) => {
                    const s = SEV[issue.severity] || SEV.info
                    return (
                      <div key={idx} className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{s.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded font-mono ${s.bg} ${s.text}`}>
                                {issue.severity}
                              </span>
                              <span className="text-xs text-gray-500">
                                {CAT_EMOJI[issue.category] || '📌'} {issue.category}
                              </span>
                              <span className="font-medium text-sm">{issue.title}</span>
                            </div>
                            <p className="text-gray-400 text-sm mt-1">{issue.detail}</p>
                            {issue.fix_hint && (
                              <p className="text-blue-400 text-xs mt-1.5 flex items-start gap-1">
                                <span>💡</span> {issue.fix_hint}
                              </p>
                            )}
                            {issue.url && (
                              <a href={issue.url} target="_blank" rel="noreferrer"
                                className="text-xs text-gray-600 hover:text-gray-400 mt-1 inline-block">
                                🔗 {issue.url}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Schedule info */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-sm text-gray-500">
          <p className="font-medium text-gray-400 mb-2">⏰ Auto-scan Schedule</p>
          <div className="space-y-1">
            <p>🔄 ทุก 30 นาที — ตรวจสอบและแจ้งทีมอัตโนมัติถ้าพบปัญหา</p>
            <p>📊 07:00 น. — รายงานสรุปประจำวัน → Slack + LINE ทุกวัน</p>
            <p>🚨 Critical issues → แจ้ง LINE ท่าน Mythos ทันที</p>
          </div>
        </div>
      </div>
    </div>
  )
}
