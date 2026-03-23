import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, GitBranch, Copy, Play, Trash2, Filter, Clock, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { listWorkflows, deleteWorkflow, cloneWorkflow, createWorkflow, updateWorkflow } from '../api/workflows'
import type { Workflow } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import Spinner from '../components/shared/Spinner'
import ConfirmModal from '../components/shared/ConfirmModal'
import TriggerWorkflowModal from '../components/workflows/TriggerWorkflowModal'
import WorkflowFormModal, { type WorkflowFormValues } from '../components/workflows/WorkflowFormModal'
import { formatDistanceToNow } from 'date-fns'

const MOCK_WORKFLOWS: Workflow[] = [
  { id: '1', name: 'order-processing', displayName: 'Order Processing', triggerType: 'KAFKA', kafkaTopic: 'orders.created', version: 3, status: 'PUBLISHED', steps: [], edges: [], variables: {}, publishedAt: new Date(Date.now() - 86400000).toISOString(), lastRunAt: new Date(Date.now() - 60000).toISOString() },
  { id: '2', name: 'user-onboarding', displayName: 'User Onboarding', triggerType: 'KAFKA', kafkaTopic: 'users.registered', version: 2, status: 'PUBLISHED', steps: [], edges: [], variables: {}, publishedAt: new Date(Date.now() - 172800000).toISOString(), lastRunAt: new Date(Date.now() - 30000).toISOString() },
  { id: '3', name: 'invoice-sync', displayName: 'Invoice Sync', triggerType: 'CRON', cronExpression: '0 9 * * 1-5', version: 1, status: 'DRAFT', steps: [], edges: [], variables: {}, lastRunAt: new Date(Date.now() - 300000).toISOString() },
  { id: '4', name: 'notification-dispatch', displayName: 'Notification Dispatch', triggerType: 'API', version: 1, status: 'PUBLISHED', steps: [], edges: [], variables: {}, publishedAt: new Date(Date.now() - 259200000).toISOString(), lastRunAt: new Date(Date.now() - 900000).toISOString() },
  { id: '5', name: 'data-pipeline', displayName: 'Data Pipeline ETL', triggerType: 'CRON', cronExpression: '0 2 * * *', version: 4, status: 'DEPRECATED', steps: [], edges: [], variables: {}, publishedAt: new Date(Date.now() - 604800000).toISOString() },
]

const triggerColors: Record<string, string> = {
  KAFKA:   'bg-purple-100 text-purple-700',
  CRON:    'bg-orange-100 text-orange-700',
  API:     'bg-teal-100 text-teal-700',
  WEBHOOK: 'bg-blue-100 text-blue-700',
}

const WorkflowList: React.FC = () => {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [triggerFilter, setTriggerFilter] = useState('')

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Workflow | null>(null)
  const [triggerTarget, setTriggerTarget] = useState<Workflow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Workflow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchWorkflows = async () => {
      try {
        const res = await listWorkflows()
        const items = Array.isArray(res) ? res : (res?.content ?? [])
        setWorkflows(items)
      } catch {
        setWorkflows(MOCK_WORKFLOWS)
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkflows()
  }, [])

  const filtered = workflows.filter((wf) => {
    const matchSearch = wf.displayName.toLowerCase().includes(search.toLowerCase()) || wf.name.includes(search.toLowerCase())
    const matchStatus = !statusFilter || wf.status === statusFilter
    const matchTrigger = !triggerFilter || wf.triggerType === triggerFilter
    return matchSearch && matchStatus && matchTrigger
  })

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (values: WorkflowFormValues) => {
    const name = values.displayName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
    const wf = await createWorkflow({
      name,
      displayName: values.displayName,
      triggerType: values.triggerType,
      ...(values.description ? { description: values.description } : {}),
      ...(values.cronExpression ? { cronExpression: values.cronExpression } : {}),
      ...(values.kafkaTopic ? { kafkaTopic: values.kafkaTopic } : {}),
      ...values.schemaConfig,
    })
    setWorkflows((prev) => [wf, ...prev])
    setShowCreateModal(false)
    navigate(`/workflows/${wf.name}/designer`)
  }

  // ── Edit / Update ─────────────────────────────────────────────────────────

  const handleUpdate = async (values: WorkflowFormValues) => {
    if (!editTarget) return
    const updated = await updateWorkflow(editTarget.name, {
      displayName: values.displayName,
      description: values.description,
      triggerType: values.triggerType,
      cronExpression: values.cronExpression || undefined,
      kafkaTopic: values.kafkaTopic || undefined,
      ...values.schemaConfig,
    })
    setWorkflows((prev) => prev.map((w) => (w.id === editTarget.id ? { ...w, ...updated } : w)))
    setEditTarget(null)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteWorkflow(deleteTarget.name)
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id))
    } catch {
      // ignore
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ── Clone ─────────────────────────────────────────────────────────────────

  const handleClone = async (wf: Workflow) => {
    try {
      const cloned = await cloneWorkflow(wf.name, `${wf.name}-copy`)
      setWorkflows((prev) => [cloned, ...prev])
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <Spinner size="lg" label="Loading workflows..." />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 text-sm mt-1">{workflows.length} workflow{workflows.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <Plus size={16} /> New Workflow
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
            placeholder="Search workflows..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="DEPRECATED">Deprecated</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="">All Triggers</option>
            <option value="KAFKA">Kafka</option>
            <option value="CRON">Cron</option>
            <option value="API">API</option>
            <option value="WEBHOOK">Webhook</option>
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="hidden sm:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</th>
                <th className="hidden lg:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="hidden md:table-cell text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Run</th>
                <th className="sticky right-0 bg-gray-50 border-l border-gray-100 text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide z-10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Filter size={24} className="mx-auto mb-2 opacity-40" />
                    No workflows match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((wf) => (
                  <tr key={wf.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 max-w-[220px]">
                      <div>
                        <p className="font-semibold text-gray-900 truncate">{wf.displayName}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{wf.name}</p>
                        {/* Trigger shown inline on mobile when column hidden */}
                        <div className="sm:hidden flex items-center gap-1.5 mt-1">
                          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${triggerColors[wf.triggerType] || 'bg-gray-100 text-gray-600'}`}>
                            {wf.triggerType}
                          </span>
                          <StatusBadge status={wf.status} />
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${triggerColors[wf.triggerType] || 'bg-gray-100 text-gray-600'}`}>
                          {wf.triggerType}
                        </span>
                        {wf.kafkaTopic && (
                          <span className="text-[10px] text-gray-400 font-mono truncate max-w-[130px]">{wf.kafkaTopic}</span>
                        )}
                        {wf.cronExpression && (
                          <span className="text-[10px] text-gray-400 font-mono">{wf.cronExpression}</span>
                        )}
                      </div>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-4">
                      <span className="text-gray-600 text-xs font-medium">v{wf.version}</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-4">
                      <StatusBadge status={wf.status} />
                    </td>
                    <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap">
                      {wf.lastRunAt ? (
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Clock size={11} />
                          {formatDistanceToNow(new Date(wf.lastRunAt), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">Never</span>
                      )}
                    </td>
                    <td className="sticky right-0 bg-white border-l border-gray-100 px-3 py-4 z-10">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditTarget(wf)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Edit Settings"
                        >
                          <SlidersHorizontal size={14} />
                        </button>
                        <Link
                          to={`/workflows/${wf.name}/designer`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Open Designer"
                        >
                          <Edit2 size={14} />
                        </Link>
                        <Link
                          to={`/workflows/${wf.name}/versions`}
                          className="hidden sm:inline-flex p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Versions"
                        >
                          <GitBranch size={14} />
                        </Link>
                        <button
                          onClick={() => handleClone(wf)}
                          className="hidden sm:inline-flex p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Clone"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => setTriggerTarget(wf)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={wf.status === 'PUBLISHED' ? 'Trigger / Run Now' : 'Workflow not published'}
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(wf)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Modal ──────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <WorkflowFormModal
          workflow={null}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* ── Edit / Settings Modal ─────────────────────────────────────────────── */}
      {editTarget && (
        <WorkflowFormModal
          workflow={editTarget}
          onSave={handleUpdate}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Trigger Modal ─────────────────────────────────────────────────────── */}
      {triggerTarget && (
        <TriggerWorkflowModal
          workflow={triggerTarget}
          isOpen={!!triggerTarget}
          onClose={() => setTriggerTarget(null)}
          onTriggered={(execId) => {
            setTriggerTarget(null)
            navigate(`/executions/${execId}`)
          }}
        />
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Workflow"
        message={`Are you sure you want to delete "${deleteTarget?.displayName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}

export default WorkflowList
