import React, { useEffect, useState } from 'react'
import { Save, Plus, Trash2, Gauge, SlidersHorizontal } from 'lucide-react'
import { getRateLimits, updateRateLimit } from '../api/settings'
import { useRateLimitStatus } from '../hooks/useRateLimitStatus'
import type { RateLimit } from '../types'
import Spinner from '../components/shared/Spinner'

const MOCK_LIMITS: RateLimit[] = [
  { id: 'rl-client', scope: 'CLIENT', maxRequestsPerMinute: 1000, maxConcurrentExecutions: 50 },
  { id: 'rl-wf-1', workflowName: 'order-processing', scope: 'WORKFLOW', maxRequestsPerMinute: 200, maxConcurrentExecutions: 10 },
  { id: 'rl-wf-2', workflowName: 'data-pipeline', scope: 'WORKFLOW', maxRequestsPerMinute: 50, maxConcurrentExecutions: 5 },
]

const RateLimits: React.FC = () => {
  const [limits, setLimits] = useState<RateLimit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [clientLimit, setClientLimit] = useState({ maxRequestsPerMinute: 1000, maxConcurrentExecutions: 50 })
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [newWorkflowLimit, setNewWorkflowLimit] = useState({ workflowName: '', maxRequestsPerMinute: 100, maxConcurrentExecutions: 5 })
  const [showAddForm, setShowAddForm] = useState(false)

  const rateLimitStatus = useRateLimitStatus()

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getRateLimits()
        setLimits(data)
        const clientLevel = data.find((l) => l.scope === 'CLIENT')
        if (clientLevel) setClientLimit({ maxRequestsPerMinute: clientLevel.maxRequestsPerMinute, maxConcurrentExecutions: clientLevel.maxConcurrentExecutions })
      } catch {
        setLimits(MOCK_LIMITS)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  const handleSaveClient = async () => {
    setIsSaving(true)
    try {
      await updateRateLimit({ scope: 'CLIENT', ...clientLimit })
      setLimits((prev) => prev.map((l) => l.scope === 'CLIENT' ? { ...l, ...clientLimit } : l))
      setSuccessMsg('Client limits saved')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch {
      setSuccessMsg('Client limits updated (demo)')
      setTimeout(() => setSuccessMsg(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddWorkflowLimit = async () => {
    if (!newWorkflowLimit.workflowName) return
    try {
      const created = await updateRateLimit({ scope: 'WORKFLOW', ...newWorkflowLimit })
      setLimits((prev) => [...prev, created])
    } catch {
      setLimits((prev) => [...prev, { id: `rl-wf-${Date.now()}`, scope: 'WORKFLOW', ...newWorkflowLimit }])
    }
    setNewWorkflowLimit({ workflowName: '', maxRequestsPerMinute: 100, maxConcurrentExecutions: 5 })
    setShowAddForm(false)
  }

  const handleDeleteWorkflowLimit = (id: string) => {
    setLimits((prev) => prev.filter((l) => l.id !== id))
  }

  const workflowLimits = limits.filter((l) => l.scope === 'WORKFLOW')
  const usageColor = rateLimitStatus.percentage >= 90 ? 'bg-red-500' : rateLimitStatus.percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading rate limits..." /></div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rate Limits</h1>
        <p className="text-gray-500 text-sm mt-1">Control execution throughput and concurrency</p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-6">
          {successMsg}
        </div>
      )}

      {/* Current Usage */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Current Usage</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg ml-auto">
            Auto-refreshes every 5s
          </span>
        </div>

        {rateLimitStatus.isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm"><Spinner size="sm" /> Loading usage...</div>
        ) : rateLimitStatus.error ? (
          <div className="text-gray-400 text-sm">Usage data unavailable (demo: using sample data)</div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Requests this minute</span>
              <span className="text-sm font-semibold text-gray-900">
                {rateLimitStatus.used.toLocaleString()} / {rateLimitStatus.limit.toLocaleString()}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${usageColor}`}
                style={{ width: `${Math.min(rateLimitStatus.percentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-gray-400">
                {rateLimitStatus.percentage >= 90 ? '⚠️ High usage' : rateLimitStatus.percentage >= 70 ? 'Moderate usage' : 'Normal usage'}
              </span>
              <span className="text-xs text-gray-400">{rateLimitStatus.percentage.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Client-level limits */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">Client-Level Limits</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Requests / Minute</label>
            <input
              type="number"
              min={1}
              value={clientLimit.maxRequestsPerMinute}
              onChange={(e) => setClientLimit({ ...clientLimit, maxRequestsPerMinute: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Max Concurrent Executions</label>
            <input
              type="number"
              min={1}
              value={clientLimit.maxConcurrentExecutions}
              onChange={(e) => setClientLimit({ ...clientLimit, maxConcurrentExecutions: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleSaveClient}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl"
        >
          <Save size={14} /> {isSaving ? 'Saving...' : 'Save Client Limits'}
        </button>
      </div>

      {/* Per-workflow overrides */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Per-Workflow Overrides</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
          >
            <Plus size={12} /> Add Override
          </button>
        </div>

        {showAddForm && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Workflow Name</label>
                <input
                  type="text"
                  value={newWorkflowLimit.workflowName}
                  onChange={(e) => setNewWorkflowLimit({ ...newWorkflowLimit, workflowName: e.target.value })}
                  placeholder="workflow-name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Requests / Min</label>
                <input
                  type="number"
                  min={1}
                  value={newWorkflowLimit.maxRequestsPerMinute}
                  onChange={(e) => setNewWorkflowLimit({ ...newWorkflowLimit, maxRequestsPerMinute: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Concurrent</label>
                <input
                  type="number"
                  min={1}
                  value={newWorkflowLimit.maxConcurrentExecutions}
                  onChange={(e) => setNewWorkflowLimit({ ...newWorkflowLimit, maxConcurrentExecutions: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAddWorkflowLimit} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                Add Override
              </button>
              <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Workflow</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Req / Min</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Concurrent</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {workflowLimits.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center">
                  <Gauge size={28} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-medium">No per-workflow overrides</p>
                  <p className="text-gray-300 text-xs mt-1">Click "Add Override" to set a workflow-specific rate limit.</p>
                </td>
              </tr>
            ) : (
              workflowLimits.map((limit) => (
                <tr key={limit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <code className="font-mono text-xs text-gray-700">{limit.workflowName}</code>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{limit.maxRequestsPerMinute}/min</td>
                  <td className="px-4 py-4 text-gray-700">{limit.maxConcurrentExecutions}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteWorkflowLimit(limit.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RateLimits
