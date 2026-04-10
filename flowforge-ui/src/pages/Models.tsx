import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Database, Trash2, Pencil, Tag, Copy, AlertCircle,
  CheckCircle2, ChevronRight, FileJson, Layers, ArrowUpRight, FolderOpen, AlertTriangle
} from 'lucide-react'
import { usePlanEnforcement } from '../hooks/usePlanEnforcement'
import { useBillingStore } from '../store/billingStore'
import {
  listModels, createModel, updateModel, deleteModel,
  type DataModel, type DataModelRequest, MOCK_MODELS
} from '../api/models'
import {
  listModelRecords, deleteModelRecord, MOCK_MODEL_RECORDS
} from '../api/modelRecords'
import SearchBar from '../components/shared/SearchBar'
import ModelEditorModal from '../components/models/ModelEditorModal'
import ModelRecordModal from '../components/models/ModelRecordModal'
import Spinner from '../components/shared/Spinner'
import ConfirmModal from '../components/shared/ConfirmModal'
import type { ModelRecord } from '../types'

const isDummy = import.meta.env.VITE_DUMMY_MODE === 'true'

// ─────────────────────────────────────────────────────────────────────────────

const Models: React.FC = () => {
  const modelLimit = usePlanEnforcement('models')
  const { fetchUsage } = useBillingStore()

  useEffect(() => { fetchUsage() }, [fetchUsage])

  const [models, setModels] = useState<DataModel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchState, setSearchState] = useState<{ q: string }>({ q: '' })
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [editorModel, setEditorModel] = useState<DataModel | null | undefined>(undefined)
  // undefined = editor closed, null = creating new, DataModel = editing existing
  const [confirmDelete, setConfirmDelete] = useState<DataModel | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expandedModel, setExpandedModel] = useState<string | null>(null)

  // Fetch models
  useEffect(() => {
    const load = async () => {
      try {
        const data = await listModels()
        setModels(data)
      } catch {
        setModels(MOCK_MODELS)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Flash message helper
  const flash = (msg: string, isError = false) => {
    if (isError) setErrorMsg(msg)
    else setSuccessMsg(msg)
    setTimeout(() => { setSuccessMsg(null); setErrorMsg(null) }, 3500)
  }

  // CRUD handlers
  const handleSave = async (req: DataModelRequest) => {
    if (editorModel) {
      // update
      try {
        const updated = await updateModel(editorModel.id, req)
        setModels(prev => prev.map(m => m.id === editorModel.id ? updated : m))
        flash('Model updated successfully')
      } catch {
        if (isDummy) {
          const fake = { ...editorModel, ...req, updatedAt: new Date().toISOString() }
          setModels(prev => prev.map(m => m.id === editorModel.id ? fake : m))
          flash('Model updated (demo mode)')
        } else throw new Error('Failed to update model')
      }
    } else {
      // create
      try {
        const created = await createModel(req)
        setModels(prev => [...prev, created])
        flash('Model created successfully')
      } catch {
        if (isDummy) {
          const fake: DataModel = {
            id: `model-${Date.now()}`,
            clientId: 'client-1',
            ...req,
            fieldNames: [],
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          setModels(prev => [...prev, fake])
          flash('Model created (demo mode)')
        } else throw new Error('Failed to create model')
      }
    }
    setEditorModel(undefined)
  }

  const handleDelete = async (model: DataModel) => {
    try {
      await deleteModel(model.id)
    } catch { /* demo mode */ }
    setModels(prev => prev.filter(m => m.id !== model.id))
    flash('Model deleted')
    setConfirmDelete(null)
  }

  const handleDuplicate = async (model: DataModel) => {
    const req: DataModelRequest = {
      name: model.name + '-copy',
      description: model.description,
      schemaJson: model.schemaJson,
      tags: model.tags,
      active: true,
    }
    await handleSave(req)
  }

  // Filtering
  const allTags = Array.from(
    new Set(models.flatMap(m => m.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? []))
  ).sort()

  const filtered = models.filter(m => {
    const q = searchState.q.toLowerCase()
    const matchSearch = !q ||
      m.name.toLowerCase().includes(q) ||
      (m.description ?? '').toLowerCase().includes(q) ||
      (m.tags ?? '').toLowerCase().includes(q)
    const matchTag = !selectedTag || (m.tags ?? '').split(',').map(t => t.trim()).includes(selectedTag)
    return matchSearch && matchTag
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" label="Loading models…" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Models</h1>
          <p className="text-gray-500 text-sm mt-1">
            Define reusable JSON Schema models to validate workflow inputs and shape responses
          </p>
        </div>
        <button
          onClick={() => !modelLimit.isAtLimit && setEditorModel(null)}
          disabled={modelLimit.isAtLimit}
          className={`flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors ${
            modelLimit.isAtLimit
              ? 'bg-gray-400 cursor-not-allowed opacity-50'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={15} /> {modelLimit.isAtLimit ? `${modelLimit.used}/${modelLimit.limit} Models` : 'New Model'}
        </button>
      </div>

      {modelLimit.isAtLimit && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={16} />
            <span>Model limit reached ({modelLimit.used}/{modelLimit.limit}). Upgrade your plan to create more.</span>
          </div>
          <Link to="/billing" className="text-xs font-medium text-red-700 bg-red-100 px-3 py-1 rounded-lg hover:bg-red-200">
            Upgrade
          </Link>
        </div>
      )}
      {modelLimit.isNearLimit && !modelLimit.isAtLimit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm text-yellow-700">
          <AlertTriangle size={16} />
          <span>Approaching model limit ({modelLimit.used}/{modelLimit.limit}).</span>
        </div>
      )}

      {/* Flash messages */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-5">
          <CheckCircle2 size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
          <AlertCircle size={15} /> {errorMsg}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {[
          { label: 'Total Models', value: models.length, icon: <Database size={18} className="text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'Active Models', value: models.filter(m => m.active).length, icon: <CheckCircle2 size={18} className="text-green-500" />, bg: 'bg-green-50' },
          { label: 'Total Fields', value: models.reduce((sum, m) => sum + (m.fieldNames?.length ?? 0), 0), icon: <Layers size={18} className="text-violet-500" />, bg: 'bg-violet-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + tag filter */}
      <div className="flex gap-3 mb-5 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <SearchBar
            placeholder="Search models by name, description, or tag..."
            onSearch={(params) => setSearchState({ q: params.q })}
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-gray-400 mr-1 flex items-center gap-1"><Tag size={12} /> Tags:</span>
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium ${!selectedTag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {allTags.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTag(t === selectedTag ? null : t)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium ${selectedTag === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <FileJson size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">
            {models.length === 0 ? 'No models yet' : 'No models match your search'}
          </p>
          {models.length === 0 && (
            <button
              onClick={() => setEditorModel(null)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
            >
              <Plus size={14} /> Create your first model
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              expanded={expandedModel === model.id}
              onToggle={() => setExpandedModel(expandedModel === model.id ? null : model.id)}
              onEdit={() => setEditorModel(model)}
              onDelete={() => setConfirmDelete(model)}
              onDuplicate={() => handleDuplicate(model)}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editorModel !== undefined && (
        <ModelEditorModal
          model={editorModel}
          onSave={handleSave}
          onClose={() => setEditorModel(undefined)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Model"
          message={`Delete "${confirmDelete.name}"? Any workflows using this model will lose their schema binding.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelCard
// ─────────────────────────────────────────────────────────────────────────────

const FIELD_TYPE_COLORS: Record<string, string> = {
  string:  'text-emerald-700 bg-emerald-50',
  number:  'text-blue-700 bg-blue-50',
  integer: 'text-blue-700 bg-blue-50',
  boolean: 'text-violet-700 bg-violet-50',
  object:  'text-amber-700 bg-amber-50',
  array:   'text-orange-700 bg-orange-50',
}

interface ModelCardProps {
  model: DataModel
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}

const ModelCard: React.FC<ModelCardProps> = ({
  model, expanded, onToggle, onEdit, onDelete, onDuplicate
}) => {
  const tags = model.tags?.split(',').map(t => t.trim()).filter(Boolean) ?? []
  const fieldCount = model.fieldNames?.length ?? 0
  const [copied, setCopied] = useState(false)

  const copySchema = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(model.schemaJson).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  // Parse properties for expanded view
  let parsedProps: [string, Record<string, unknown>][] = []
  let requiredFields: string[] = []
  try {
    const schema = JSON.parse(model.schemaJson)
    if (schema.properties) {
      parsedProps = Object.entries(schema.properties as Record<string, Record<string, unknown>>)
    }
    if (Array.isArray(schema.required)) {
      requiredFields = schema.required as string[]
    }
  } catch { /* ignore */ }

  return (
    <div className={`bg-white border rounded-2xl transition-all shadow-sm ${
      expanded ? 'border-blue-200' : 'border-gray-100 hover:border-gray-200'
    }`}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={onToggle}
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0">
          <FileJson size={16} className="text-white" />
        </div>

        {/* Name + description — takes all available space */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-gray-900 font-mono truncate">{model.name}</span>
            {!model.active && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">INACTIVE</span>
            )}
          </div>
          {/* Metadata row: description + tags + stats — collapses gracefully */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {model.description && (
              <p className="text-xs text-gray-400 truncate max-w-[200px] sm:max-w-xs">{model.description}</p>
            )}
            {tags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1">
                {tags.map(t => (
                  <span key={t} className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[11px] text-gray-400 flex-shrink-0">
              {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
            </span>
            <span className="hidden sm:inline text-[11px] text-gray-300 flex-shrink-0">
              {new Date(model.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions — always visible, never pushed off screen */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={copySchema} title="Copy schema JSON"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {copied ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
          </button>
          <button onClick={onDuplicate} title="Duplicate"
            className="hidden sm:inline-flex p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowUpRight size={14} />
          </button>
          <button onClick={onEdit} title="Edit"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} title="Delete"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>

        <ChevronRight size={14} className={`text-gray-300 transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`} />
      </div>

      {/* Expanded — schema fields */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 rounded-b-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fields list */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fields</p>
              {parsedProps.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No properties defined</p>
              ) : (
                <div className="space-y-1.5">
                  {parsedProps.map(([fieldName, prop]) => (
                    <div key={fieldName} className="flex items-center gap-2 min-w-0">
                      <span className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded ${
                        FIELD_TYPE_COLORS[String(prop.type)] || 'text-gray-600 bg-gray-100'
                      }`}>
                        {String(prop.type || 'any')}
                      </span>
                      <span className="text-xs font-medium text-gray-800 font-mono truncate">{fieldName}</span>
                      {requiredFields.includes(fieldName) && (
                        <span className="flex-shrink-0 text-[9px] text-red-500 font-bold">*</span>
                      )}
                      {prop.description && (
                        <span className="hidden md:inline text-[11px] text-gray-400 truncate">{String(prop.description)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Schema JSON preview */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Schema JSON</p>
              <pre className="text-[10px] font-mono text-gray-600 bg-white border border-gray-200 rounded-xl p-3 overflow-auto max-h-36 leading-relaxed">
                {model.schemaJson}
              </pre>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-400">
              By <span className="font-medium text-gray-600">{model.createdBy || '—'}</span>
            </span>
            <span className="text-xs text-gray-400">
              Updated {new Date(model.updatedAt).toLocaleString()}
            </span>
            <button
              onClick={onEdit}
              className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0"
            >
              <Pencil size={11} /> Edit Schema
            </button>
          </div>

          {/* Records section */}
          <ModelRecordsSection dataModelId={model.id} dataModelName={model.name} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelRecordsSection — inline records list for an expanded ModelCard
// ─────────────────────────────────────────────────────────────────────────────

interface ModelRecordsSectionProps {
  dataModelId: string
  dataModelName: string
}

const ModelRecordsSection: React.FC<ModelRecordsSectionProps> = ({ dataModelId, dataModelName }) => {
  const [records, setRecords] = useState<ModelRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState<ModelRecord | null | false>(false)
  // false = modal closed, null = creating, ModelRecord = editing
  const [deleteTarget, setDeleteTarget] = useState<ModelRecord | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listModelRecords(dataModelId)
        setRecords(data)
      } catch {
        setRecords(MOCK_MODEL_RECORDS.filter(r => r.dataModelId === dataModelId))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dataModelId])

  const handleSaved = (record: ModelRecord) => {
    if (showModal && typeof showModal === 'object' && showModal.id) {
      setRecords(prev => prev.map(r => r.id === record.id ? record : r))
    } else {
      setRecords(prev => [...prev, record])
    }
    setShowModal(false)
  }

  const handleDelete = async (record: ModelRecord) => {
    try {
      await deleteModelRecord(record.id)
    } catch { /* demo mode */ }
    setRecords(prev => prev.filter(r => r.id !== record.id))
    setDeleteTarget(null)
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-indigo-500" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Records ({records.length})
          </span>
        </div>
        <button
          onClick={() => setShowModal(null)}
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          <Plus size={12} /> Add Record
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Loading records...</p>
      ) : records.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No records yet. Click "Add Record" to create one.</p>
      ) : (
        <div className="space-y-1.5">
          {records.map(record => (
            <div key={record.id}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 hover:border-indigo-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">{record.name}</div>
                <div className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                  {JSON.stringify(record.data).slice(0, 80)}...
                </div>
              </div>
              <span className="text-[10px] text-gray-300 flex-shrink-0">
                {new Date(record.updatedAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => setShowModal(record)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => setDeleteTarget(record)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record editor modal */}
      {showModal !== false && (
        <ModelRecordModal
          dataModelId={dataModelId}
          dataModelName={dataModelName}
          record={showModal}
          onSave={handleSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Record"
          message={`Delete record "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default Models
