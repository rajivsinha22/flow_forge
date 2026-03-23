import React, { useEffect, useState } from 'react'
import {
  FileJson, ShieldCheck, AlertTriangle, Plus, Trash2,
  ChevronDown, Info, CheckCircle2, ArrowRight
} from 'lucide-react'
import { listModels, type DataModel, type ErrorHandlingConfig, MOCK_MODELS } from '../../api/models'

// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowSchemaConfig {
  inputModelId?: string
  outputModelId?: string
  outputMapping?: Record<string, string>
  errorHandlingConfig?: ErrorHandlingConfig
}

interface WorkflowSchemaSettingsProps {
  config: WorkflowSchemaConfig
  onChange: (cfg: WorkflowSchemaConfig) => void
}

const ERROR_MODES = [
  {
    value: 'FAIL_FAST',
    label: 'Fail Fast',
    description: 'Immediately reject the request with a 422 error',
    color: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  {
    value: 'CONTINUE',
    label: 'Continue',
    description: 'Log the failure but continue execution and return 200',
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    value: 'CUSTOM_RESPONSE',
    label: 'Custom Response',
    description: 'Return a user-defined HTTP status and response body',
    color: 'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },
]

const DEFAULT_ERROR_HANDLING: ErrorHandlingConfig = {
  mode: 'FAIL_FAST',
  customStatusCode: 422,
  customBody: { error: '{{error.message}}', code: 'WORKFLOW_ERROR' },
  notifyOnError: false,
}

// ─────────────────────────────────────────────────────────────────────────────

const WorkflowSchemaSettings: React.FC<WorkflowSchemaSettingsProps> = ({ config, onChange }) => {
  const [models, setModels] = useState<DataModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [mappingRows, setMappingRows] = useState<{ key: string; value: string }[]>(() =>
    Object.entries(config.outputMapping ?? {}).map(([key, value]) => ({ key, value }))
  )

  useEffect(() => {
    listModels(true)
      .then(setModels)
      .catch(() => setModels(MOCK_MODELS))
      .finally(() => setLoadingModels(false))
  }, [])

  const errorConfig = config.errorHandlingConfig ?? DEFAULT_ERROR_HANDLING

  const update = (patch: Partial<WorkflowSchemaConfig>) =>
    onChange({ ...config, ...patch })

  const updateErrorConfig = (patch: Partial<ErrorHandlingConfig>) =>
    update({ errorHandlingConfig: { ...errorConfig, ...patch } })

  // Output mapping helpers
  const syncMapping = (rows: { key: string; value: string }[]) => {
    setMappingRows(rows)
    const map: Record<string, string> = {}
    for (const r of rows) {
      if (r.key.trim()) map[r.key.trim()] = r.value
    }
    update({ outputMapping: Object.keys(map).length ? map : undefined })
  }

  const addMappingRow = () => syncMapping([...mappingRows, { key: '', value: '' }])
  const removeMappingRow = (idx: number) => syncMapping(mappingRows.filter((_, i) => i !== idx))
  const updateMappingRow = (idx: number, patch: Partial<{ key: string; value: string }>) => {
    const rows = mappingRows.map((r, i) => i === idx ? { ...r, ...patch } : r)
    syncMapping(rows)
  }

  const selectedInputModel = models.find(m => m.id === config.inputModelId)
  const selectedOutputModel = models.find(m => m.id === config.outputModelId)

  return (
    <div className="space-y-6">

      {/* ── Input Schema ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-800">Input Validation</h3>
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">optional</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Select a model to validate the trigger payload before execution starts.
          Requests with non-conforming data will be rejected immediately.
        </p>

        <ModelSelector
          label="Input Model"
          value={config.inputModelId}
          models={models}
          loading={loadingModels}
          onChange={v => update({ inputModelId: v })}
        />

        {selectedInputModel && (
          <SelectedModelBadge model={selectedInputModel} onClear={() => update({ inputModelId: undefined })} />
        )}
      </section>

      {/* ── Output Schema ─────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <FileJson size={16} className="text-violet-600" />
          <h3 className="text-sm font-semibold text-gray-800">Output Schema</h3>
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">optional</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Defines the expected shape of a successful workflow response — used for documentation and client contracts.
        </p>

        <ModelSelector
          label="Output Model"
          value={config.outputModelId}
          models={models}
          loading={loadingModels}
          onChange={v => update({ outputModelId: v })}
        />

        {selectedOutputModel && (
          <SelectedModelBadge model={selectedOutputModel} onClear={() => update({ outputModelId: undefined })} />
        )}
      </section>

      {/* ── Output Mapping ────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight size={16} className="text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-800">Response Mapping</h3>
          <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">optional</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Map step outputs to the final API response body using{' '}
          <code className="bg-gray-100 px-1 rounded font-mono text-[11px]">{'{{'+'stepId.field'+'}}'}</code> templates.
          When empty the last step's raw output is returned.
        </p>

        <div className="space-y-2">
          {mappingRows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={row.key}
                onChange={e => updateMappingRow(idx, { key: e.target.value })}
                placeholder="responseField"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-gray-300 text-xs">→</span>
              <input
                type="text"
                value={row.value}
                onChange={e => updateMappingRow(idx, { value: e.target.value })}
                placeholder="{{httpStep.data.id}}"
                className="flex-[2] border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={() => removeMappingRow(idx)}
                className="p-1 text-gray-300 hover:text-red-500 rounded">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={addMappingRow}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={12} /> Add mapping
          </button>
        </div>

        {mappingRows.length > 0 && (
          <div className="mt-3 bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wide">Template hints</p>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-500 font-mono">
              <span>{'{{stepId.field}}'}</span><span className="text-gray-400">→ step output field</span>
              <span>{'{{stepId.data.nested}}'}</span><span className="text-gray-400">→ nested path</span>
              <span>{'{{input.fieldName}}'}</span><span className="text-gray-400">→ original input</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Error Handling ────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">Error Handling</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Configure how this workflow responds when execution fails or input validation rejects the payload.
        </p>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {ERROR_MODES.map(mode => (
            <button
              key={mode.value}
              onClick={() => updateErrorConfig({ mode: mode.value as ErrorHandlingConfig['mode'] })}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                errorConfig.mode === mode.value
                  ? mode.color + ' border-current shadow-sm'
                  : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-2 h-2 rounded-full ${errorConfig.mode === mode.value ? mode.dot : 'bg-gray-300'}`} />
                <span className="text-xs font-semibold">{mode.label}</span>
              </div>
              <p className="text-[10px] leading-relaxed opacity-75">{mode.description}</p>
            </button>
          ))}
        </div>

        {/* Custom response config */}
        {errorConfig.mode === 'CUSTOM_RESPONSE' && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info size={13} className="text-blue-500" />
              <p className="text-[11px] text-blue-700">
                Use <code className="bg-blue-100 px-1 rounded font-mono">{'{{error.message}}'}</code>,{' '}
                <code className="bg-blue-100 px-1 rounded font-mono">{'{{error.step}}'}</code>, and{' '}
                <code className="bg-blue-100 px-1 rounded font-mono">{'{{execution.id}}'}</code> as placeholders.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">HTTP Status Code</label>
              <input
                type="number"
                min={400}
                max={599}
                value={errorConfig.customStatusCode ?? 422}
                onChange={e => updateErrorConfig({ customStatusCode: Number(e.target.value) })}
                className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                Custom Response Body (JSON)
              </label>
              <textarea
                value={JSON.stringify(errorConfig.customBody ?? {}, null, 2)}
                onChange={e => {
                  try {
                    updateErrorConfig({ customBody: JSON.parse(e.target.value) })
                  } catch { /* invalid JSON during typing */ }
                }}
                rows={4}
                spellCheck={false}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>
          </div>
        )}

        {/* Notify toggle */}
        <label className="flex items-center gap-2.5 mt-3 cursor-pointer">
          <button
            type="button"
            onClick={() => updateErrorConfig({ notifyOnError: !errorConfig.notifyOnError })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              errorConfig.notifyOnError ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              errorConfig.notifyOnError ? 'translate-x-[18px]' : 'translate-x-[2px]'
            }`} />
          </button>
          <span className="text-xs text-gray-700">Emit error notification event when workflow fails</span>
        </label>
      </section>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface ModelSelectorProps {
  label: string
  value?: string
  models: DataModel[]
  loading: boolean
  onChange: (v: string | undefined) => void
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ label, value, models, loading, onChange }) => (
  <div className="relative">
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value || undefined)}
      disabled={loading}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
    >
      <option value="">— No {label} —</option>
      {models.map(m => (
        <option key={m.id} value={m.id}>
          {m.name}{m.description ? ` — ${m.description}` : ''}
        </option>
      ))}
    </select>
    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
  </div>
)

interface SelectedModelBadgeProps {
  model: DataModel
  onClear: () => void
}

const SelectedModelBadge: React.FC<SelectedModelBadgeProps> = ({ model, onClear }) => {
  const fieldCount = model.fieldNames?.length ?? 0
  return (
    <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
      <CheckCircle2 size={13} className="text-blue-500 flex-shrink-0" />
      <span className="text-xs font-semibold text-blue-800 font-mono">{model.name}</span>
      <span className="text-xs text-blue-500">{fieldCount} {fieldCount === 1 ? 'field' : 'fields'}</span>
      {model.tags && (
        <span className="text-[10px] text-blue-400">#{model.tags.split(',')[0].trim()}</span>
      )}
      <button onClick={onClear} className="ml-auto text-blue-400 hover:text-blue-600 text-xs font-medium">
        Remove
      </button>
    </div>
  )
}

export default WorkflowSchemaSettings
