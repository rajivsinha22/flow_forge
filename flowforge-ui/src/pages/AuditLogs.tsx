import React, { useEffect, useState } from 'react'
import { Search, Download, ChevronDown, Shield } from 'lucide-react'
import { listAuditLogs } from '../api/settings'
import type { AuditLog } from '../types'
import Spinner from '../components/shared/Spinner'
import { format, formatDistanceToNow } from 'date-fns'

const MOCK_LOGS: AuditLog[] = [
  { id: 'al-1', action: 'WORKFLOW_PUBLISHED', actor: 'jane@company.com', resource: 'Workflow', resourceId: 'order-processing', details: { version: 3 }, timestamp: new Date(Date.now() - 60000).toISOString(), ipAddress: '192.168.1.1' },
  { id: 'al-2', action: 'API_KEY_CREATED', actor: 'john@company.com', resource: 'ApiKey', resourceId: 'k-production', details: { name: 'Production Key' }, timestamp: new Date(Date.now() - 3600000).toISOString(), ipAddress: '10.0.0.5' },
  { id: 'al-3', action: 'WORKFLOW_DELETED', actor: 'admin@company.com', resource: 'Workflow', resourceId: 'old-pipeline', details: { version: 2 }, timestamp: new Date(Date.now() - 7200000).toISOString(), ipAddress: '192.168.1.1' },
  { id: 'al-4', action: 'USER_INVITED', actor: 'jane@company.com', resource: 'User', resourceId: 'alice@company.com', details: { role: 'VIEWER' }, timestamp: new Date(Date.now() - 86400000).toISOString(), ipAddress: '192.168.1.1' },
  { id: 'al-5', action: 'RATE_LIMIT_UPDATED', actor: 'admin@company.com', resource: 'RateLimit', resourceId: 'client', details: { maxRequestsPerMinute: 1000 }, timestamp: new Date(Date.now() - 172800000).toISOString(), ipAddress: '10.0.0.1' },
  { id: 'al-6', action: 'TRIGGER_CREATED', actor: 'john@company.com', resource: 'Trigger', resourceId: 'order-kafka-trigger', details: { sourceType: 'KAFKA' }, timestamp: new Date(Date.now() - 259200000).toISOString(), ipAddress: '10.0.0.5' },
  { id: 'al-7', action: 'DLQ_REPLAYED_ALL', actor: 'jane@company.com', resource: 'DLQ', resourceId: 'batch', details: { count: 12 }, timestamp: new Date(Date.now() - 345600000).toISOString(), ipAddress: '192.168.1.1' },
  { id: 'al-8', action: 'SETTINGS_UPDATED', actor: 'admin@company.com', resource: 'OrgSettings', resourceId: 'org', details: { webhookUrl: 'https://new.url/webhooks' }, timestamp: new Date(Date.now() - 432000000).toISOString(), ipAddress: '10.0.0.1' },
]

const actionColors: Record<string, string> = {
  WORKFLOW_PUBLISHED: 'bg-green-100 text-green-700',
  WORKFLOW_DELETED: 'bg-red-100 text-red-700',
  API_KEY_CREATED: 'bg-blue-100 text-blue-700',
  API_KEY_REVOKED: 'bg-red-100 text-red-700',
  USER_INVITED: 'bg-purple-100 text-purple-700',
  USER_REMOVED: 'bg-red-100 text-red-700',
  RATE_LIMIT_UPDATED: 'bg-yellow-100 text-yellow-700',
  TRIGGER_CREATED: 'bg-teal-100 text-teal-700',
  DLQ_REPLAYED_ALL: 'bg-orange-100 text-orange-700',
  SETTINGS_UPDATED: 'bg-gray-100 text-gray-700',
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await listAuditLogs()
        setLogs(Array.isArray(res) ? res : (res?.content ?? []))
      } catch {
        setLogs(MOCK_LOGS)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  const filtered = logs.filter((log) => {
    const matchSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceId.toLowerCase().includes(search.toLowerCase())
    const matchAction = !actionFilter || log.action === actionFilter
    const matchActor = !actorFilter || log.actor === actorFilter
    return matchSearch && matchAction && matchActor
  })

  const exportCsv = () => {
    const headers = ['ID', 'Action', 'Actor', 'Resource', 'Resource ID', 'Timestamp', 'IP Address']
    const rows = filtered.map((log) => [
      log.id, log.action, log.actor, log.resource, log.resourceId,
      format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'), log.ipAddress || '',
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const uniqueActions = [...new Set(logs.map((l) => l.action))]
  const uniqueActors = [...new Set(logs.map((l) => l.actor))]

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading audit logs..." /></div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">{logs.length} total audit events</p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-xl transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, actor, or resource..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none appearance-none"
          >
            <option value="">All Actions</option>
            {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none appearance-none"
          >
            <option value="">All Actors</option>
            {uniqueActors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actor</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resource</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">When</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No audit logs match your filters
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-700">{log.actor}</td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{log.resource}</p>
                      <p className="text-xs text-gray-400 font-mono">{log.resourceId}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {log.details && (
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-xs text-gray-700">{format(new Date(log.timestamp), 'MMM d, HH:mm')}</p>
                      <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-gray-400 font-mono">{log.ipAddress || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditLogs
