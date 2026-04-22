import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X, Zap,
  ChevronDown, ChevronUp, Search, Loader2, CheckCircle2,
  AlertTriangle, Info, MessageSquare, Clock,
  Copy, FolderInput,
} from 'lucide-react'
import { listTriggers, createTrigger, updateTrigger, deleteTrigger, enableTrigger, disableTrigger } from '../api/triggers'
import { listWorkflows } from '../api/workflows'
import { useNamespaceStore } from '../store/namespaceStore'
import { moveTriggerNamespace } from '../api/namespaceMove'
import type { Trigger, TriggerCondition, Workflow } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmModal from '../components/shared/ConfirmModal'
import MoveNamespaceModal from '../components/shared/MoveNamespaceModal'
import Spinner from '../components/shared/Spinner'
import ConditionBuilder from '../components/triggers/ConditionBuilder'
import { format, isValid } from 'date-fns'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (v: string | null | undefined) => {
  if (!v) return '—'
  const d = new Date(v)
  return isValid(d) ? format(d, 'MMM d, yyyy') : '—'
}

const sourceTypeColors: Record<string, string> = {
  KAFKA: 'bg-purple-100 text-purple-700',
  CRON:  'bg-orange-100 text-orange-700',
}

const SOURCE_TYPE_ICONS: Record<string, React.ReactNode> = {
  KAFKA: <MessageSquare size={13} />,
  CRON:  <Clock size={13} />,
}

const TRIGGER_TYPE_COLORS: Record<string, string> = {
  API:   'bg-teal-100 text-teal-700',
  KAFKA: 'bg-purple-100 text-purple-700',
  CRON:  'bg-orange-100 text-orange-700',
}

/**
 * Map a workflow's triggerType to the best matching event-trigger sourceType.
 * Only KAFKA is supported. API-triggered workflows return null.
 */
const workflowTriggerToSource = (triggerType: string): string | null => {
  if (triggerType === 'KAFKA') return 'KAFKA'
  if (triggerType === 'CRON')  return 'CRON'
  if (triggerType === 'API')   return null
  return 'KAFKA'
}

// ─── Workflow Picker Dropdown ─────────────────────────────────────────────────

interface PickedWorkflow {
  id: string
  name: string
  displayName: string
  triggerType: string
  status: string
}

interface WorkflowPickerProps {
  selected: PickedWorkflow | null
  onSelect: (wf: PickedWorkflow) => void
  onClear: () => void
  error?: string
}

const PAGE_SIZE = 10

function WorkflowPickerDropdown({ selected, onSelect, onClear, error }: WorkflowPickerProps) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')          // debounced
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<Workflow[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Debounce: update query 300ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => { setQuery(searchInput); setPage(0); setItems([]) }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load workflows whenever query or page changes (while open)
  useEffect(() => {
    if (!open) return
    setLoading(true)
    listWorkflows({ search: query || undefined, page, size: PAGE_SIZE })
      .then((res) => {
        setItems((prev) => page === 0 ? res.content : [...prev, ...res.content])
        setTotalPages(res.totalPages)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, query, page])

  // Focus search when opening
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
    else { setSearchInput(''); setQuery(''); setPage(0); setItems([]) }
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = useCallback((wf: Workflow) => {
    onSelect({ id: wf.id, name: wf.name, displayName: wf.displayName, triggerType: wf.triggerType, status: wf.status })
    setOpen(false)
  }, [onSelect])

  const hasMore = page + 1 < totalPages

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between border rounded-xl px-4 py-2.5 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-400' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium text-gray-900 truncate">{selected.displayName}</span>
            <code className="text-[10px] font-mono text-gray-400 shrink-0">{selected.name}</code>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${TRIGGER_TYPE_COLORS[selected.triggerType] || 'bg-gray-100 text-gray-600'}`}>
              {selected.triggerType}
            </span>
          </div>
        ) : (
          <span className="text-gray-400">Select a workflow…</span>
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onClear() }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onClear())}
              className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search workflows…"
              className="flex-1 text-sm outline-none placeholder-gray-400"
            />
            {loading && <Loader2 size={13} className="animate-spin text-gray-400 shrink-0" />}
          </div>

          {/* Results list */}
          <div className="max-h-56 overflow-y-auto">
            {items.length === 0 && !loading && (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                {query ? `No workflows matching "${query}"` : 'No workflows found'}
              </div>
            )}
            {items.map((wf) => (
              <button
                key={wf.id}
                type="button"
                onClick={() => handleSelect(wf)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                  selected?.id === wf.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{wf.displayName}</span>
                    {selected?.id === wf.id && <CheckCircle2 size={13} className="text-blue-500 shrink-0" />}
                  </div>
                  <code className="text-[11px] font-mono text-gray-400">{wf.name}</code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${TRIGGER_TYPE_COLORS[wf.triggerType] || 'bg-gray-100 text-gray-500'}`}>
                    {wf.triggerType}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    wf.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' :
                    wf.status === 'DRAFT'     ? 'bg-amber-100 text-amber-700' :
                                                'bg-gray-100 text-gray-500'
                  }`}>
                    {wf.status}
                  </span>
                </div>
              </button>
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="w-full py-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium transition-colors border-t border-gray-100"
              >
                {loading ? 'Loading…' : `Load more (${items.length} of ${(totalPages) * PAGE_SIZE}+)`}
              </button>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
            {items.length} workflow{items.length !== 1 ? 's' : ''} shown · page {page + 1} of {Math.max(totalPages, 1)}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ─── Source-type explainer callout ───────────────────────────────────────────

/** Small inline copy button — shows a ✓ for 2 s after copying */
const CopyBtn: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const [copied, setCopied] = React.useState(false)
  const doCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={doCopy}
      title="Copy to clipboard"
      className={className ?? 'p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors'}
    >
      {copied
        ? <CheckCircle2 size={13} className="text-green-500" />
        : <Copy size={13} />}
    </button>
  )
}

const SOURCE_EXPLAINERS: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; text: string }> = {
  KAFKA: {
    icon: <MessageSquare size={13} />,
    color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200',
    text: 'FlowForge consumes messages from the configured Kafka topic. When a message arrives and all conditions match, the workflow is triggered automatically.',
  },
  CRON: {
    icon: <Clock size={13} />,
    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
    text: 'Quartz Scheduler fires the workflow on the configured schedule (UTC). No inbound event needed — great for nightly batches, reports, and cleanup jobs.',
  },
}

// ─── Validation helpers ───────────────────────────────────────────────────────

interface FormErrors {
  name?: string
  workflow?: string
  sourceType?: string
  topicOrUrl?: string
  filterExpression?: string
}

function validateForm(form: TriggerFormState, selectedWorkflow: PickedWorkflow | null): FormErrors {
  const errs: FormErrors = {}
  if (!form.name.trim())                       errs.name = 'Trigger name is required.'
  if (!selectedWorkflow && !form.workflowName) errs.workflow = 'Select a workflow to trigger.'
  if (form.sourceType === 'KAFKA' && !form.topicOrUrl.trim())
    errs.topicOrUrl = 'Kafka topic name is required.'
  if (form.sourceType === 'CRON' && !form.filterExpression.trim())
    errs.filterExpression = 'Cron expression is required (e.g. 0 9 * * 1-5).'
  return errs
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface TriggerFormState {
  name: string
  sourceType: string
  workflowId: string
  workflowName: string
  topicOrUrl: string
  filterExpression: string
  condition: TriggerCondition | null
  payloadMapping: string
  triggerAction: 'FIRE_WORKFLOW' | 'RESUME_WAIT'
  resumeTokenPath: string
  resumeExecutionId: string
  resumeStepId: string
  enabled: boolean
}

function defaultForm(trigger?: Trigger): TriggerFormState {
  return {
    name:             trigger?.name || '',
    sourceType:       trigger?.sourceType || 'KAFKA',
    workflowId:       trigger?.workflowId || '',
    workflowName:     trigger?.workflowName || '',
    topicOrUrl:       trigger?.topic || trigger?.url || '',
    filterExpression: trigger?.filterExpression || '',
    condition:        trigger?.condition || null,
    payloadMapping:   trigger?.payloadMapping || '',
    triggerAction:    trigger?.triggerAction || 'FIRE_WORKFLOW',
    resumeTokenPath:  trigger?.resumeTokenPath || '',
    resumeExecutionId:trigger?.resumeExecutionId || '',
    resumeStepId:     trigger?.resumeStepId || '',
    enabled:          trigger?.enabled ?? true,
  }
}

// ─── Trigger Drawer ───────────────────────────────────────────────────────────

interface DrawerProps {
  trigger?: Trigger
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Trigger>) => void
  isLoading: boolean
}

const TriggerDrawer: React.FC<DrawerProps> = ({ trigger, isOpen, onClose, onSave, isLoading }) => {
  const [form, setForm]                     = useState<TriggerFormState>(defaultForm(trigger))
  const [selectedWorkflow, setSelectedWorkflow] = useState<PickedWorkflow | null>(null)
  const [conditionsOpen, setConditionsOpen] = useState(true)
  const [resumeMode, setResumeMode]         = useState<'token' | 'direct'>('token')
  const [errors, setErrors]                 = useState<FormErrors>({})
  const [mismatchWarning, setMismatchWarning] = useState<string | null>(null)

  // Re-init when trigger or open state changes
  useEffect(() => {
    setForm(defaultForm(trigger))
    setErrors({})
    setMismatchWarning(null)
    setConditionsOpen(true)
    setResumeMode('token')
    if (trigger) {
      setSelectedWorkflow({
        id:          trigger.workflowId || '',
        name:        trigger.workflowName,
        displayName: trigger.workflowName,
        triggerType: '',
        status:      '',
      })
    } else {
      setSelectedWorkflow(null)
    }
  }, [trigger, isOpen])

  if (!isOpen) return null

  const set = <K extends keyof TriggerFormState>(key: K, value: TriggerFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // When a workflow is picked from the dropdown
  const handleWorkflowSelect = (wf: PickedWorkflow) => {
    setSelectedWorkflow(wf)
    setForm((prev) => ({ ...prev, workflowId: wf.id, workflowName: wf.name }))
    setErrors((prev) => ({ ...prev, workflow: undefined }))

    const suggestedSource = workflowTriggerToSource(wf.triggerType)
    if (suggestedSource) {
      setForm((prev) => ({ ...prev, sourceType: suggestedSource, workflowId: wf.id, workflowName: wf.name }))
      setMismatchWarning(null)
    } else {
      // API-type workflow: show advisory
      setMismatchWarning(
        `"${wf.displayName}" is an API-triggered workflow. ` +
        `API workflows are invoked directly via REST — no event trigger config is typically needed. ` +
        `If you still want to automate it via Kafka, proceed below.`
      )
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateForm(form, selectedWorkflow)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})

    const payload: Partial<Trigger> = {
      name:             form.name,
      sourceType:       form.sourceType,
      workflowId:       form.workflowId || undefined,
      workflowName:     form.workflowName,
      topic:            form.sourceType === 'KAFKA' ? form.topicOrUrl : undefined,
      filterExpression: form.filterExpression || undefined,
      condition:        form.condition || undefined,
      payloadMapping:   form.payloadMapping || undefined,
      triggerAction:    form.triggerAction,
      resumeTokenPath:
        form.triggerAction === 'RESUME_WAIT' && resumeMode === 'token' ? form.resumeTokenPath : undefined,
      resumeExecutionId:
        form.triggerAction === 'RESUME_WAIT' && resumeMode === 'direct' ? form.resumeExecutionId : undefined,
      resumeStepId:
        form.triggerAction === 'RESUME_WAIT' && resumeMode === 'direct' ? form.resumeStepId : undefined,
    }
    onSave(payload)
  }

  const handleSourceTypeChange = (type: string) => {
    set('sourceType', type)
    setErrors((p) => ({ ...p, topicOrUrl: undefined, filterExpression: undefined }))
  }

  const showTopicUrl       = form.sourceType === 'KAFKA'
  const showCronExpression = form.sourceType === 'CRON'
  const showConditions     = form.sourceType !== 'CRON'
  const explainer          = SOURCE_EXPLAINERS[form.sourceType]

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">{trigger ? 'Edit Trigger' : 'Create Trigger'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Configure an automated trigger for a workflow</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── 1. Trigger Name ───────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Trigger Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { set('name', e.target.value); setErrors((p) => ({ ...p, name: undefined })) }}
              placeholder="e.g. new-order-kafka-trigger"
              className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* ── 2. Workflow picker ────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Workflow to Trigger <span className="text-red-500">*</span>
            </label>
            <WorkflowPickerDropdown
              selected={selectedWorkflow}
              onSelect={handleWorkflowSelect}
              onClear={() => {
                setSelectedWorkflow(null)
                setForm((p) => ({ ...p, workflowId: '', workflowName: '' }))
                setMismatchWarning(null)
              }}
              error={errors.workflow}
            />
            <p className="text-xs text-gray-400 mt-1">
              Source type is auto-populated from the workflow's configured trigger type.
            </p>
          </div>

          {/* Mismatch / advisory warning */}
          {mismatchWarning && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
              <span>{mismatchWarning}</span>
            </div>
          )}

          {/* ── 3. Source Type ────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                Source Type <span className="text-red-500">*</span>
              </label>
              {selectedWorkflow?.triggerType && (
                <span className="text-[10px] text-gray-400">
                  Workflow designed for:&nbsp;
                  <span className={`font-semibold ${TRIGGER_TYPE_COLORS[selectedWorkflow.triggerType]?.replace(/^bg-\S+ /, '')} `}>
                    {selectedWorkflow.triggerType}
                  </span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {['KAFKA', 'CRON'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSourceTypeChange(type)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    form.sourceType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={form.sourceType === type ? 'text-blue-500' : 'text-gray-400'}>
                    {SOURCE_TYPE_ICONS[type]}
                  </span>
                  {type}
                </button>
              ))}
            </div>

            {/* Source type explainer */}
            {explainer && (
              <div className={`mt-2.5 flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs ${explainer.bg} ${explainer.border} ${explainer.color}`}>
                <span className="mt-0.5 shrink-0">{explainer.icon}</span>
                <span>{explainer.text}</span>
              </div>
            )}

            {/* Note: API triggers don't belong here */}
            <div className="mt-2 flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500">
              <Info size={12} className="mt-0.5 shrink-0 text-gray-400" />
              <span>
                <strong>API-triggered workflows</strong> are invoked directly via&nbsp;
                <code className="font-mono bg-gray-100 px-1 rounded">POST /workflows/:name/trigger</code>.
                No event trigger config is needed — use the&nbsp;<strong>▶ Run Now</strong>&nbsp;button on the Workflows page.
              </span>
            </div>
          </div>

          {/* ── 4a. Kafka Topic ───────────────────────────────────────── */}
          {showTopicUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kafka Topic Name
                <span className="text-red-500"> *</span>
              </label>
              <input
                type="text"
                value={form.topicOrUrl}
                onChange={(e) => { set('topicOrUrl', e.target.value); setErrors((p) => ({ ...p, topicOrUrl: undefined })) }}
                placeholder="orders.created"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.topicOrUrl ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.topicOrUrl && <p className="text-xs text-red-500 mt-1">{errors.topicOrUrl}</p>}
            </div>
          )}

          {/* ── 5. Cron Expression ───────────────────────────────────── */}
          {showCronExpression && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Cron Expression <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.filterExpression}
                onChange={(e) => { set('filterExpression', e.target.value); setErrors((p) => ({ ...p, filterExpression: undefined })) }}
                placeholder="0 9 * * 1-5"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.filterExpression ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.filterExpression
                ? <p className="text-xs text-red-500 mt-1">{errors.filterExpression}</p>
                : (
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-gray-500">
                    {[
                      ['0 9 * * 1-5', 'Weekdays at 09:00 UTC'],
                      ['0 2 * * *',   'Every day at 02:00 UTC'],
                      ['*/15 * * * *','Every 15 minutes'],
                      ['0 0 1 * *',   '1st of every month'],
                    ].map(([expr, label]) => (
                      <button
                        key={expr}
                        type="button"
                        onClick={() => set('filterExpression', expr)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-300 rounded-lg text-left transition-colors"
                      >
                        <code className="font-mono text-orange-600">{expr}</code>
                        <span className="text-gray-400 truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ── 6. Conditions ─────────────────────────────────────────── */}
          {showConditions && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setConditionsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              >
                <span>Conditions <span className="text-xs font-normal text-gray-400">(optional — filter when to fire)</span></span>
                {conditionsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
              {conditionsOpen && (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-gray-500">
                    Define when this trigger should fire. Leave empty to fire on every event.
                    Use <strong>SpEL Expression</strong> for advanced logic, or build conditions visually.
                  </p>
                  <ConditionBuilder condition={form.condition} onChange={(c) => set('condition', c)} />
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Legacy SpEL Filter Expression
                    </label>
                    <input
                      type="text"
                      value={form.filterExpression}
                      onChange={(e) => set('filterExpression', e.target.value)}
                      placeholder='e.g. $.event.type == "PURCHASE"'
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── 7. Trigger Action ─────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">Trigger Action</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-2">
                {[
                  { value: 'FIRE_WORKFLOW', label: 'Fire new workflow execution',
                    desc: 'Start a new workflow instance each time a matching event arrives.' },
                  { value: 'RESUME_WAIT', label: 'Resume a wait state',
                    desc: 'Resume a paused execution that is currently waiting for this event.' },
                ].map(({ value, label, desc }) => (
                  <label key={value} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="triggerAction"
                      value={value}
                      checked={form.triggerAction === value}
                      onChange={() => set('triggerAction', value as 'FIRE_WORKFLOW' | 'RESUME_WAIT')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {form.triggerAction === 'RESUME_WAIT' && (
                <div className="mt-3 border border-amber-200 rounded-lg bg-amber-50 p-4 space-y-4">
                  <p className="text-xs font-semibold text-amber-800">Resume method</p>
                  <div className="flex gap-4">
                    {[
                      { val: 'token',  label: 'Token from event' },
                      { val: 'direct', label: 'Execution + Step ID' },
                    ].map(({ val, label }) => (
                      <label key={val} className="flex items-center gap-2 cursor-pointer text-sm text-amber-900">
                        <input
                          type="radio"
                          name="resumeMode"
                          value={val}
                          checked={resumeMode === val}
                          onChange={() => setResumeMode(val as 'token' | 'direct')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  {resumeMode === 'token' ? (
                    <div>
                      <label className="block text-xs font-medium text-amber-800 mb-1">Token field path</label>
                      <input
                        type="text"
                        placeholder="e.g. data.waitToken"
                        value={form.resumeTokenPath}
                        onChange={(e) => set('resumeTokenPath', e.target.value)}
                        className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <p className="text-xs text-amber-700 mt-1">JSONPath into the event payload to extract the wait token.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-amber-800 mb-1">Execution ID</label>
                        <input type="text" placeholder="data.executionId" value={form.resumeExecutionId}
                          onChange={(e) => set('resumeExecutionId', e.target.value)}
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-amber-800 mb-1">Step ID</label>
                        <input type="text" placeholder="data.stepId" value={form.resumeStepId}
                          onChange={(e) => set('resumeStepId', e.target.value)}
                          className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-amber-400" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── 8. Payload Mapping ────────────────────────────────────── */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Payload Mapping <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={4}
              value={form.payloadMapping}
              onChange={(e) => set('payloadMapping', e.target.value)}
              placeholder={'{\n  "orderId":   "$.body.id",\n  "customer":  "$.body.customer",\n  "amount":    "$.body.total"\n}'}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Map event fields to workflow input keys using JSONPath expressions.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              {isLoading
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : trigger ? 'Update Trigger' : 'Create Trigger'
              }
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Main EventTriggers page ──────────────────────────────────────────────────

const EventTriggers: React.FC = () => {
  const currentNamespace = useNamespaceStore(s => s.currentNamespace)
  const [triggers, setTriggers]     = useState<Trigger[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Trigger | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Trigger | null>(null)
  const [isSaving, setIsSaving]     = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [moveTarget, setMoveTarget] = useState<{ open: boolean; entityId: string | null }>({ open: false, entityId: null })

  const reloadTriggers = useCallback(() => {
    setIsLoading(true)
    listTriggers()
      .then((res) => setTriggers(Array.isArray(res) ? res : (res?.content ?? [])))
      .catch(() => setTriggers([]))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    reloadTriggers()
  }, [currentNamespace, reloadTriggers])

  const handleMoveConfirm = async (ns: string) => {
    if (!moveTarget.entityId) return
    await moveTriggerNamespace(moveTarget.entityId, ns)
    reloadTriggers()
  }

  const handleSave = async (data: Partial<Trigger>) => {
    setIsSaving(true)
    try {
      if (editTarget) {
        const updated = await updateTrigger(editTarget.id, data)
        setTriggers((prev) => prev.map((t) => (t.id === editTarget.id ? updated : t)))
      } else {
        const created = await createTrigger(data as Parameters<typeof createTrigger>[0])
        setTriggers((prev) => [created, ...prev])
      }
      setDrawerOpen(false)
      setEditTarget(undefined)
    } catch {
      const newId = `t-${Date.now()}`
      const newTrigger = { id: newId, ...data, enabled: true, createdAt: new Date().toISOString() } as Trigger
      setTriggers((prev) => editTarget ? prev.map((t) => t.id === editTarget.id ? { ...t, ...data } : t) : [newTrigger, ...prev])
      setDrawerOpen(false)
      setEditTarget(undefined)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggle = async (trigger: Trigger) => {
    try {
      const updated = trigger.enabled ? await disableTrigger(trigger.id) : await enableTrigger(trigger.id)
      setTriggers((prev) => prev.map((t) => (t.id === trigger.id ? updated : t)))
    } catch {
      setTriggers((prev) => prev.map((t) => (t.id === trigger.id ? { ...t, enabled: !t.enabled } : t)))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try { await deleteTrigger(deleteTarget.id) } catch { /* ignore */ }
    finally {
      setTriggers((prev) => prev.filter((t) => t.id !== deleteTarget.id))
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" label="Loading triggers…" />
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Triggers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {triggers.length} trigger{triggers.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(undefined); setDrawerOpen(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl"
        >
          <Plus size={16} /> Add Trigger
        </button>
      </div>

      {/* Source type legend */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { type: 'KAFKA', desc: 'Kafka topic consumer → conditions → fire' },
          { type: 'CRON',  desc: 'Quartz schedule → fire on timer' },
        ].map(({ type, desc }) => (
          <div key={type} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sourceTypeColors[type]}`}>{type}</span>
            <span className="text-xs text-gray-500">{desc}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 shadow-sm">
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">API</span>
          <span className="text-xs text-teal-600">
            Direct REST call — no trigger config needed.&nbsp;
            <strong>Use ▶ Run Now</strong> on the Workflows page.
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Workflow</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Topic / URL / Schedule</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">On / Off · Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {triggers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center">
                  <Zap size={30} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-400 font-medium">No triggers configured yet</p>
                  <p className="text-gray-300 text-xs mt-1">Click "Add Trigger" to create your first event trigger.</p>
                </td>
              </tr>
            ) : (
              triggers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    {t.condition && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {t.condition.conditionType === 'ALWAYS' ? 'Always fires' : `Condition: ${t.condition.conditionType}`}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sourceTypeColors[t.sourceType] || 'bg-gray-100 text-gray-600'}`}>
                      {SOURCE_TYPE_ICONS[t.sourceType]}
                      {t.sourceType}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <code className="text-gray-700 font-mono text-xs">{t.workflowName}</code>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-gray-500 text-xs font-mono truncate max-w-[180px] block">
                      {t.topic || t.url || t.filterExpression || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {t.triggerAction === 'RESUME_WAIT' ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Resume Wait</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">Fire Workflow</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">{fmtDate(t.createdAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggle(t)}
                        title={t.enabled ? 'Disable trigger' : 'Enable trigger'}
                        className={`transition-colors ${t.enabled ? 'text-green-500 hover:text-green-700' : 'text-gray-300 hover:text-gray-500'}`}
                      >
                        {t.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                      </button>
                      <button
                        onClick={() => { setEditTarget(t); setDrawerOpen(true) }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setMoveTarget({ open: true, entityId: t.id })}
                        title="Move to namespace"
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <FolderInput size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

      <TriggerDrawer
        trigger={editTarget}
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditTarget(undefined) }}
        onSave={handleSave}
        isLoading={isSaving}
      />

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Trigger"
        message={`Delete trigger "${deleteTarget?.name}"? Workflows triggered by this will no longer fire automatically.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />

      <MoveNamespaceModal
        open={moveTarget.open}
        onClose={() => setMoveTarget({ open: false, entityId: null })}
        onConfirm={handleMoveConfirm}
        currentNamespace={currentNamespace}
        entityLabel="Trigger"
      />
    </div>
  )
}

export default EventTriggers
