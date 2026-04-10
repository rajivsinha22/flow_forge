import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Filter, Play, Eye, RefreshCw, Pause, XCircle
} from 'lucide-react'
import { listExecutions, retryExecution, pauseExecution, cancelExecution } from '../api/executions'
import type { Execution } from '../types'
import SearchBar from '../components/shared/SearchBar'
import StatusBadge from '../components/shared/StatusBadge'
import Spinner from '../components/shared/Spinner'
import ConfirmModal from '../components/shared/ConfirmModal'
import { formatDistanceToNow, format } from 'date-fns'

const MOCK_EXECUTIONS: Execution[] = [
  { id: 'ex-001', workflowName: 'order-processing', workflowVersion: 3, status: 'SUCCESS', triggerType: 'KAFKA', triggeredBy: 'kafka-consumer', startedAt: new Date(Date.now() - 60000).toISOString(), completedAt: new Date(Date.now() - 57900).toISOString(), durationMs: 2100 },
  { id: 'ex-002', workflowName: 'user-onboarding', workflowVersion: 2, status: 'RUNNING', triggerType: 'KAFKA', triggeredBy: 'kafka-consumer', startedAt: new Date(Date.now() - 30000).toISOString() },
  { id: 'ex-003', workflowName: 'invoice-sync', workflowVersion: 1, status: 'FAILED', triggerType: 'CRON', triggeredBy: 'scheduler', startedAt: new Date(Date.now() - 300000).toISOString(), completedAt: new Date(Date.now() - 298500).toISOString(), durationMs: 1500 },
  { id: 'ex-004', workflowName: 'order-processing', workflowVersion: 3, status: 'SUCCESS', triggerType: 'KAFKA', triggeredBy: 'kafka-consumer', startedAt: new Date(Date.now() - 600000).toISOString(), completedAt: new Date(Date.now() - 596800).toISOString(), durationMs: 3200 },
  { id: 'ex-005', workflowName: 'notification-dispatch', workflowVersion: 1, status: 'PAUSED', triggerType: 'API', triggeredBy: 'manual', startedAt: new Date(Date.now() - 900000).toISOString() },
  { id: 'ex-006', workflowName: 'data-pipeline', workflowVersion: 4, status: 'CANCELLED', triggerType: 'CRON', triggeredBy: 'scheduler', startedAt: new Date(Date.now() - 1800000).toISOString(), completedAt: new Date(Date.now() - 1798000).toISOString(), durationMs: 2000 },
  { id: 'ex-007', workflowName: 'user-onboarding', workflowVersion: 2, status: 'SUCCESS', triggerType: 'EVENT', triggeredBy: 'kafka-consumer', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3597000).toISOString(), durationMs: 3000 },
]

const ExecutionList: React.FC = () => {
  const navigate = useNavigate()
  const [executions, setExecutions] = useState<Execution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchState, setSearchState] = useState<{ q: string; status: string; triggerType: string }>({ q: '', status: '', triggerType: '' })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cancelTarget, setCancelTarget] = useState<Execution | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)

  useEffect(() => {
    const fetchExecs = async () => {
      try {
        const res = await listExecutions()
        setExecutions(Array.isArray(res) ? res : (res?.content ?? []))
      } catch {
        setExecutions(MOCK_EXECUTIONS)
      } finally {
        setIsLoading(false)
      }
    }
    fetchExecs()
  }, [])

  const filtered = executions.filter((ex) => {
    const q = searchState.q.toLowerCase()
    const matchSearch = !q || ex.workflowName.toLowerCase().includes(q) || ex.id.includes(q)
    const matchStatus = !searchState.status || ex.status === searchState.status
    const matchTrigger = !searchState.triggerType || ex.triggerType === searchState.triggerType
    return matchSearch && matchStatus && matchTrigger
  })

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleRetry = async (exec: Execution) => {
    try {
      const updated = await retryExecution(exec.id)
      navigate(`/executions/${updated.id}`)
    } catch {
      navigate(`/executions/${exec.id}`)
    }
  }

  const handlePause = async (exec: Execution) => {
    try {
      await pauseExecution(exec.id)
      setExecutions((prev) => prev.map((e) => e.id === exec.id ? { ...e, status: 'PAUSED' } : e))
    } catch { /* ignore */ }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      await cancelExecution(cancelTarget.id)
      setExecutions((prev) => prev.map((e) => e.id === cancelTarget.id ? { ...e, status: 'CANCELLED' } : e))
    } catch { /* ignore */ } finally {
      setIsCancelling(false)
      setCancelTarget(null)
    }
  }

  const handleBulkRetry = async () => {
    for (const id of selected) {
      const exec = executions.find((e) => e.id === id)
      if (exec && exec.status === 'FAILED') {
        try { await retryExecution(id) } catch { /* ignore */ }
      }
    }
    setSelected(new Set())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading executions..." />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
          <p className="text-gray-500 text-sm mt-1">{executions.length} total executions</p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <button
              onClick={handleBulkRetry}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <RefreshCw size={12} /> Retry Failed
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6">
        <SearchBar
          placeholder="Search by workflow or execution ID..."
          filters={[
            { key: 'status', label: 'All Statuses', options: [
              { label: 'Pending', value: 'PENDING' },
              { label: 'Running', value: 'RUNNING' },
              { label: 'Success', value: 'SUCCESS' },
              { label: 'Failed', value: 'FAILED' },
              { label: 'Paused', value: 'PAUSED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ]},
            { key: 'triggerType', label: 'All Triggers', options: [
              { label: 'API', value: 'API' },
              { label: 'Kafka', value: 'KAFKA' },
              { label: 'Cron', value: 'CRON' },
              { label: 'Webhook', value: 'WEBHOOK' },
            ]},
          ]}
          onSearch={(params) => setSearchState({ q: params.q, status: params.status || '', triggerType: params.triggerType || '' })}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(filtered.map((ex) => ex.id)))
                      else setSelected(new Set())
                    }}
                  />
                </th>
                <th className="hidden md:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Execution ID</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Workflow</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="hidden sm:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</th>
                <th className="hidden sm:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Started</th>
                <th className="hidden lg:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                <th className="sticky right-0 bg-gray-50 border-l border-gray-100 text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <Filter size={24} className="mx-auto mb-2 opacity-40" />
                    No executions match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((exec) => (
                  <tr
                    key={exec.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/executions/${exec.id}`)}
                  >
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={selected.has(exec.id)}
                        onChange={() => toggleSelect(exec.id)}
                      />
                    </td>
                    <td className="hidden md:table-cell px-4 py-3.5">
                      <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {exec.id}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[180px]">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900 truncate">{exec.workflowName}</p>
                          {exec.modelRecordId && (
                            <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              exec.dataSyncMode === 'WRITE'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-cyan-100 text-cyan-600'
                            }`}>
                              {exec.dataSyncMode || 'MODEL'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">v{exec.workflowVersion}</p>
                        {/* Show ID inline on mobile when ID column is hidden */}
                        <p className="md:hidden text-[10px] text-gray-400 font-mono mt-0.5 truncate">{exec.id}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3.5">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {exec.triggerType}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(exec.startedAt), { addSuffix: true })}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                      {exec.durationMs ? `${exec.durationMs}ms` : '—'}
                    </td>
                    <td className="sticky right-0 bg-white border-l border-gray-100 px-3 py-3.5 z-10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/executions/${exec.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View trace"
                        >
                          <Eye size={14} />
                        </button>
                        {exec.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(exec)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Retry"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                        {exec.status === 'RUNNING' && (
                          <>
                            <button
                              onClick={() => handlePause(exec)}
                              className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Pause"
                            >
                              <Pause size={14} />
                            </button>
                            <button
                              onClick={() => setCancelTarget(exec)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {exec.status === 'PAUSED' && (
                          <button
                            onClick={async () => {
                              const { resumeExecution } = await import('../api/executions')
                              await resumeExecution(exec.id)
                              setExecutions((prev) => prev.map((e) => e.id === exec.id ? { ...e, status: 'RUNNING' } : e))
                            }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Resume"
                          >
                            <Play size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Execution"
        message={`Are you sure you want to cancel execution ${cancelTarget?.id}?`}
        confirmLabel="Cancel Execution"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
        isLoading={isCancelling}
      />
    </div>
  )
}

export default ExecutionList
