import { useState, useEffect } from 'react'
import { apiUrl } from '../apiBase'

const STATUS_COLORS = {
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '⏳ รอติดต่อ' },
  contacted: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: '📞 ติดต่อแล้ว' },
  onboarded: { bg: 'bg-green-100',  text: 'text-green-800',  label: '✅ Onboard แล้ว' },
}

export default function ProducerAdminPage() {
  const [producers, setProducers] = useState([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const [search, setSearch] = useState('')

  const load = async (status) => {
    setLoading(true)
    try {
      const q = status !== 'all' ? `?status=${status}` : ''
      const res = await fetch(apiUrl(`/api/producers/list${q}`))
      const data = await res.json()
      setProducers(data.producers || [])
      setTotal(data.total || 0)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  useEffect(() => { load(filter) }, [filter])

  const updateStatus = async (id, status) => {
    setUpdating(true)
    try {
      await fetch(apiUrl(`/api/producers/${id}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      })
      setSelected(null)
      setNotes('')
      load(filter)
    } catch (e) { console.error(e) }
    setUpdating(false)
  }

  const filtered = producers.filter(p =>
    !search || p.company_name.includes(search) || p.contact_name.includes(search) ||
    p.category.includes(search) || p.contact_phone.includes(search)
  )

  const stats = {
    total,
    pending: producers.filter(p => p.status === 'pending').length,
    contacted: producers.filter(p => p.status === 'contacted').length,
    onboarded: producers.filter(p => p.status === 'onboarded').length,
    export: producers.filter(p => p.export_ready).length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">🏭 Producer Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">จัดการผู้ผลิตที่ลงทะเบียนเข้าแพลตฟอร์ม</p>
          </div>
          <a href="/producer" target="_blank"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
            + ลงทะเบียนใหม่
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'ทั้งหมด', value: stats.total, color: 'bg-gray-800' },
            { label: '⏳ รอติดต่อ', value: stats.pending, color: 'bg-yellow-500' },
            { label: '📞 ติดต่อแล้ว', value: stats.contacted, color: 'bg-blue-500' },
            { label: '✅ Onboard', value: stats.onboarded, color: 'bg-green-500' },
            { label: '🌍 ส่งออกได้', value: stats.export, color: 'bg-purple-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <div className={`text-2xl font-bold text-white ${s.color} rounded-lg py-2 mb-1`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-wrap gap-3 mb-4">
          {['all', 'pending', 'contacted', 'onboarded'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}>
              {s === 'all' ? 'ทั้งหมด' : STATUS_COLORS[s].label}
            </button>
          ))}
          <input
            className="ml-auto px-4 py-1.5 border rounded-full text-sm outline-none focus:border-blue-400 w-56"
            placeholder="🔍 ค้นหา บริษัท / ชื่อ / หมวดหมู่..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400">กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">ยังไม่มีผู้ผลิตลงทะเบียน</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['#', 'บริษัท', 'ผู้ติดต่อ', 'หมวดหมู่', 'สินค้าเด่น', 'ส่งออก', 'สถานะ', 'วันที่', 'จัดการ'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const sc = STATUS_COLORS[p.status]
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400 font-mono">{p.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{p.company_name}</div>
                        {p.company_name_en && <div className="text-xs text-gray-400">{p.company_name_en}</div>}
                        {p.province && <div className="text-xs text-gray-400">📍 {p.province}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div>{p.contact_name}</div>
                        <div className="text-xs text-blue-500">{p.contact_phone}</div>
                        <div className="text-xs text-gray-400 truncate max-w-32">{p.contact_email}</div>
                      </td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs">{p.category}</span></td>
                      <td className="px-4 py-3 max-w-40 truncate text-gray-600">{p.flagship_product}</td>
                      <td className="px-4 py-3 text-center">{p.export_ready ? '✅' : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(p); setNotes('') }}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          อัปเดต
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="font-bold text-lg mb-1">{selected.company_name}</h3>
              <p className="text-sm text-gray-500 mb-4">{selected.contact_name} | {selected.contact_phone}</p>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">เปลี่ยนสถานะ:</p>
                <div className="flex gap-2">
                  {['pending', 'contacted', 'onboarded'].map(s => {
                    const sc = STATUS_COLORS[s]
                    return (
                      <button key={s} onClick={() => updateStatus(selected.id, s)} disabled={updating}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${sc.bg} ${sc.text} hover:opacity-80`}>
                        {sc.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <textarea
                className="w-full border rounded-lg p-3 text-sm mb-4 h-20 resize-none outline-none focus:border-blue-400"
                placeholder="บันทึกหมายเหตุ (ถ้ามี)..."
                value={notes} onChange={e => setNotes(e.target.value)}
              />

              <div className="flex gap-3">
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  ยกเลิก
                </button>
                <a href={`mailto:${selected.contact_email}`}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm text-center hover:bg-blue-700">
                  📧 ส่งอีเมล
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
