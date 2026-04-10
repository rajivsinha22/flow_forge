import React, { useEffect, useState } from 'react'
import {
  ShieldCheck, ChevronDown, Info, CheckCircle2, RefreshCw, BookOpen, Pencil
} from 'lucide-react'
import { listModels, type DataModel, MOCK_MODELS } from '../../api/models'

// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowSchemaConfig {
  inputModelId?: string
  dataSyncMode?: 'READ' | 'WRITE'
}

interface WorkflowSchemaSettingsProps {
  config: WorkflowSchemaConfig
  onChange: (cfg: WorkflowSchemaConfig) => void
}

// ─────────────────────────────────────────────────────────────────────────────

const WorkflowSchemaSettings: React.FC<WorkflowSchemaSettingsProps> = ({ config, onChange }) => {
  const [models, setModels] = useState<DataModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)

  useEffect(() => {
    listModels(true)
      .then(setModels)
      .catch(() => setModels(MOCK_MODELS))
      .finally(() => setLoadingModels(false))
  }, [])

  const update = (patch: Partial<WorkflowSchemaConfig>) =>
    onChange({ ...config, ...patch })

  const selectedInputModel = models.find(m => m.id === config.inputModelId)

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
          onChange={v => update({ inputModelId: v, ...(!v ? { dataSyncMode: undefined } : {}) })}
        />

        {selectedInputModel && (
          <SelectedModelBadge model={selectedInputModel} onClear={() => update({ inputModelId: undefined, dataSyncMode: undefined })} />
        )}
      </section>

      {/* ── Data Sync (visible only when inputModelId is set) ─────────────── */}
      {config.inputModelId && (
        <section className="border-t border-gray-100 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw size={16} className="text-cyan-600" />
            <h3 className="text-sm font-semibold text-gray-800">Data Sync</h3>
            <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">optional</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Link model record data to execution context. When a model record is provided at trigger time,
            its data will be loaded into the execution context and optionally written back after completion.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* READ option */}
            <button
              type="button"
              onClick={() => update({ dataSyncMode: config.dataSyncMode === 'READ' ? undefined : 'READ' })}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                config.dataSyncMode === 'READ'
                  ? 'ring-2 ring-cyan-400 border-cyan-400 bg-cyan-50'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <BookOpen size={16} className={`mt-0.5 flex-shrink-0 ${config.dataSyncMode === 'READ' ? 'text-cyan-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${config.dataSyncMode === 'READ' ? 'text-cyan-700' : 'text-gray-700'}`}>Read</p>
                <p className={`text-[11px] mt-0.5 leading-relaxed ${config.dataSyncMode === 'READ' ? 'text-cyan-600 opacity-75' : 'text-gray-400'}`}>
                  Load model data into context before execution
                </p>
              </div>
            </button>

            {/* WRITE option */}
            <button
              type="button"
              onClick={() => update({ dataSyncMode: config.dataSyncMode === 'WRITE' ? undefined : 'WRITE' })}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                config.dataSyncMode === 'WRITE'
                  ? 'ring-2 ring-emerald-400 border-emerald-400 bg-emerald-50'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Pencil size={16} className={`mt-0.5 flex-shrink-0 ${config.dataSyncMode === 'WRITE' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${config.dataSyncMode === 'WRITE' ? 'text-emerald-700' : 'text-gray-700'}`}>Write</p>
                <p className={`text-[11px] mt-0.5 leading-relaxed ${config.dataSyncMode === 'WRITE' ? 'text-emerald-600 opacity-75' : 'text-gray-400'}`}>
                  Read + write updated data back after success
                </p>
              </div>
            </button>
          </div>

          {config.dataSyncMode && (
            <div className={`mt-3 flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
              config.dataSyncMode === 'WRITE'
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-cyan-700 bg-cyan-50'
            }`}>
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <span>
                {config.dataSyncMode === 'READ'
                  ? 'Model data will be available as ${modelData.fieldName} in step expressions.'
                  : 'Model data will be loaded before execution and written back to the model record after successful completion.'}
              </span>
            </div>
          )}
        </section>
      )}

      {/* ── Response Mapping Hint ─────────────────────────────────────────── */}
      <section className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-800">Response Mapping</h3>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
          <p className="text-xs text-indigo-700 leading-relaxed">
            To customise the HTTP response returned by this workflow, set the following keys in the execution context
            from any step:
          </p>
          <div className="bg-white border border-indigo-100 rounded-lg p-3 font-mono text-[11px] space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold min-w-[120px]">responseBody</span>
              <span className="text-gray-500">The JSON object or string returned as the HTTP body</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold min-w-[120px]">responseStatus</span>
              <span className="text-gray-500">HTTP status code (e.g. 200, 201, 422). Default: 200</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-indigo-600 font-bold min-w-[120px]">contentType</span>
              <span className="text-gray-500">Response content type. Default: application/json</span>
            </div>
          </div>
          <p className="text-[11px] text-indigo-500 leading-relaxed">
            If none of these keys are set, the engine returns the last step's output with a 200 status and
            application/json content type.
          </p>
        </div>
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
