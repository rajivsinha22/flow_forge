import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Clock, Globe, Radio, ChevronRight,
  CheckCircle2, Sparkles,
  ShieldCheck, RefreshCw,
} from 'lucide-react'
import WorkflowSchemaSettings, {
  type WorkflowSchemaConfig,
} from '../workflow/WorkflowSchemaSettings'
import type { Workflow } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowFormValues {
  displayName: string
  description: string
  triggerType: string
  cronExpression: string
  kafkaTopic: string
  schemaConfig: WorkflowSchemaConfig
}

interface WorkflowFormModalProps {
  /** null = create mode, Workflow = edit mode */
  workflow?: Workflow | null
  onSave: (values: WorkflowFormValues) => Promise<void>
  onClose: () => void
}

// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  {
    value: 'API',
    label: 'API / Manual',
    description: 'Triggered by an HTTP call or manually from the UI',
    icon: <Globe size={18} />,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    activeColor: 'ring-2 ring-teal-400 border-teal-400 bg-teal-50',
  },
  {
    value: 'KAFKA',
    label: 'Kafka Event',
    description: 'Fires when a message arrives on a Kafka topic',
    icon: <Radio size={18} />,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    activeColor: 'ring-2 ring-purple-400 border-purple-400 bg-purple-50',
  },
  {
    value: 'CRON',
    label: 'Cron Schedule',
    description: 'Runs on a fixed schedule using a cron expression',
    icon: <Clock size={18} />,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    activeColor: 'ring-2 ring-orange-400 border-orange-400 bg-orange-50',
  },
]

const CRON_PRESETS = [
  { label: 'Every minute',  value: '* * * * *' },
  { label: 'Every hour',    value: '0 * * * *' },
  { label: 'Every day 9am', value: '0 9 * * *' },
  { label: 'Every Monday',  value: '0 9 * * 1' },
]

type Tab = 'basics' | 'schema'

const TABS: { id: Tab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'basics',
    label: 'Basics',
    icon: <Sparkles size={14} />,
    description: 'Name, trigger type, schedule',
  },
  {
    id: 'schema',
    label: 'Schema & Response',
    icon: <ShieldCheck size={14} />,
    description: 'Input validation, data sync, response mapping',
  },
]

// ─────────────────────────────────────────────────────────────────────────────

const WorkflowFormModal: React.FC<WorkflowFormModalProps> = ({
  workflow,
  onSave,
  onClose,
}) => {
  const isEdit = !!workflow

  // ── State ──────────────────────────────────────────────────────────────────

  const [tab, setTab] = useState<Tab>('basics')
  const [displayName, setDisplayName] = useState(workflow?.displayName ?? '')
  const [description, setDescription] = useState(workflow?.description ?? '')
  const [triggerType, setTriggerType] = useState(workflow?.triggerType ?? 'API')
  const [cronExpression, setCronExpression] = useState(workflow?.cronExpression ?? '')
  const [kafkaTopic, setKafkaTopic] = useState(workflow?.kafkaTopic ?? '')
  const [schemaConfig, setSchemaConfig] = useState<WorkflowSchemaConfig>({
    inputModelId: workflow?.inputModelId,
    dataSyncMode: workflow?.dataSyncMode,
  })

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Auto-generate slug preview for create
  const slug = displayName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60)

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!displayName.trim()) e.displayName = 'Workflow name is required'
    if (triggerType === 'CRON' && !cronExpression.trim())
      e.cronExpression = 'Cron expression is required for scheduled workflows'
    if (triggerType === 'KAFKA' && !kafkaTopic.trim())
      e.kafkaTopic = 'Kafka topic is required'
    setErrors(e)
    if (Object.keys(e).length > 0) { setTab('basics'); return false }
    return true
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      await onSave({
        displayName: displayName.trim(),
        description: description.trim(),
        triggerType,
        cronExpression,
        kafkaTopic,
        schemaConfig,
      })
    } finally {
      setSaving(false)
    }
  }

  // ── Schema summary badges ──────────────────────────────────────────────────

  const hasSchema = !!schemaConfig.inputModelId

  // ── Render ─────────────────────────────────────────────────────────────────

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? `Edit — ${workflow.displayName}` : 'New Workflow'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isEdit
                  ? 'Update settings, schema bindings and error behaviour'
                  : 'Configure your workflow before opening the canvas designer'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-100 px-6">
          {TABS.map((t, idx) => {
            const isActive = tab === t.id
            const isDone = tab === 'schema' && t.id === 'basics'
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-400 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                </span>
                <span>{t.label}</span>
                {/* badges */}
                {t.id === 'schema' && hasSchema && (
                  <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Basics ─────────────────────────────────────────────────────── */}
          {tab === 'basics' && (
            <div className="px-6 py-5 space-y-5">

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Workflow Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => { setDisplayName(e.target.value); setErrors(prev => ({ ...prev, displayName: '' })) }}
                  placeholder="e.g. Order Processing"
                  autoFocus
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.displayName ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
                  }`}
                />
                {errors.displayName && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} /> {errors.displayName}
                  </p>
                )}
                {!isEdit && slug && (
                  <p className="text-xs text-gray-400 mt-1">
                    Internal ID: <code className="font-mono bg-gray-100 px-1 rounded">{slug}</code>
                  </p>
                )}
                {isEdit && (
                  <p className="text-xs text-gray-400 mt-1">
                    Internal ID: <code className="font-mono bg-gray-100 px-1 rounded">{workflow.name}</code>
                    <span className="ml-2 text-gray-300">(cannot be changed)</span>
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Trigger type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Trigger Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_OPTIONS.map(opt => {
                    const active = triggerType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTriggerType(opt.value)}
                        className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          active
                            ? opt.activeColor
                            : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`mt-0.5 flex-shrink-0 ${active ? '' : 'text-gray-400'}`}>
                          {opt.icon}
                        </span>
                        <div>
                          <p className={`text-sm font-semibold ${active ? '' : 'text-gray-700'}`}>{opt.label}</p>
                          <p className={`text-[11px] mt-0.5 leading-relaxed ${active ? 'opacity-75' : 'text-gray-400'}`}>
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cron expression */}
              {triggerType === 'CRON' && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Cron Expression <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={e => { setCronExpression(e.target.value); setErrors(prev => ({ ...prev, cronExpression: '' })) }}
                      placeholder="0 9 * * 1-5"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                        errors.cronExpression ? 'border-red-400' : 'border-orange-200'
                      }`}
                    />
                    {errors.cronExpression && (
                      <p className="text-xs text-red-500 mt-1">{errors.cronExpression}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Presets</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CRON_PRESETS.map(p => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setCronExpression(p.value)}
                          className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition-colors ${
                            cronExpression === p.value
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white border-orange-200 text-orange-700 hover:bg-orange-100'
                          }`}
                        >
                          {p.label} <span className="opacity-60 ml-1">{p.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Kafka topic */}
              {triggerType === 'KAFKA' && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Kafka Topic <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={kafkaTopic}
                    onChange={e => { setKafkaTopic(e.target.value); setErrors(prev => ({ ...prev, kafkaTopic: '' })) }}
                    placeholder="orders.created"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                      errors.kafkaTopic ? 'border-red-400' : 'border-purple-200'
                    }`}
                  />
                  {errors.kafkaTopic && (
                    <p className="text-xs text-red-500 mt-1">{errors.kafkaTopic}</p>
                  )}
                </div>
              )}

              {/* Continue to schema arrow */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setTab('schema')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-blue-600">
                    <ShieldCheck size={15} />
                    <span className="font-medium">Configure Schema & Response</span>
                    {hasSchema && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">configured</span>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500" />
                </button>
              </div>
            </div>
          )}

          {/* ── Schema & Errors ─────────────────────────────────────────────── */}
          {tab === 'schema' && (
            <div className="px-6 py-5">
              <WorkflowSchemaSettings
                config={schemaConfig}
                onChange={setSchemaConfig}
              />
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">

          {/* Summary badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {schemaConfig.inputModelId && (
              <span className="flex items-center gap-1 text-[11px] bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-medium">
                <ShieldCheck size={10} /> Input validated
              </span>
            )}
            {schemaConfig.dataSyncMode && (
              <span className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium ${
                schemaConfig.dataSyncMode === 'WRITE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-cyan-100 text-cyan-700'
              }`}>
                <RefreshCw size={10} /> {schemaConfig.dataSyncMode === 'WRITE' ? 'Write Sync' : 'Read Sync'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {tab === 'basics' && !isEdit && (
              <button
                onClick={() => { if (validate()) setTab('schema') }}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-1.5"
              >
                Next <ChevronRight size={13} />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition-colors flex items-center gap-2"
            >
              {saving
                ? 'Saving…'
                : isEdit
                ? 'Save Changes'
                : 'Create Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

export default WorkflowFormModal
