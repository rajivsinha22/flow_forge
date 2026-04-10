import React, { useState, useEffect } from 'react'
import { X, Save, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react'
import { createModelRecord, updateModelRecord, type ModelRecordRequest } from '../../api/modelRecords'
import { validatePayload } from '../../api/models'
import type { ModelRecord } from '../../types'

interface ModelRecordModalProps {
  /** The dataModelId this record belongs to. */
  dataModelId: string
  /** The DataModel name (for display). */
  dataModelName: string
  /** null = create mode, ModelRecord = edit mode */
  record: ModelRecord | null
  onSave: (record: ModelRecord) => void
  onClose: () => void
}

const ModelRecordModal: React.FC<ModelRecordModalProps> = ({
  dataModelId,
  dataModelName,
  record,
  onSave,
  onClose,
}) => {
  const isEdit = !!record

  const [name, setName] = useState(record?.name ?? '')
  const [dataJson, setDataJson] = useState(
    record ? JSON.stringify(record.data, null, 2) : '{\n  \n}'
  )
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [jsonError, setJsonError] = useState('')
  const [validationSuccess, setValidationSuccess] = useState(false)

  // Clear validation status when data changes
  useEffect(() => {
    setValidationSuccess(false)
    setErrors([])
  }, [dataJson])

  const parseData = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(dataJson)
      setJsonError('')
      return parsed
    } catch {
      setJsonError('Invalid JSON — fix the data before saving.')
      return null
    }
  }

  const handleValidate = async () => {
    const data = parseData()
    if (!data) return

    setValidating(true)
    setErrors([])
    setValidationSuccess(false)
    try {
      const result = await validatePayload(dataModelId, data)
      if (result.valid) {
        setValidationSuccess(true)
      } else {
        setErrors(result.errors)
      }
    } catch {
      setErrors(['Validation request failed.'])
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setErrors(['Record name is required.'])
      return
    }
    const data = parseData()
    if (!data) return

    setSaving(true)
    setErrors([])
    try {
      const request: ModelRecordRequest = {
        dataModelId,
        name: name.trim(),
        data,
      }
      const saved = isEdit
        ? await updateModelRecord(record!.id, request)
        : await createModelRecord(request)
      onSave(saved)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save record.'
      setErrors([msg])
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Record' : 'New Record'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Model: <span className="font-mono text-gray-500">{dataModelName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Record Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Order #ORD-2026-0042"
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Data JSON */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-gray-700">Data (JSON)</label>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {validating ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
                Validate
              </button>
            </div>
            <textarea
              value={dataJson}
              onChange={e => { setDataJson(e.target.value); setJsonError('') }}
              rows={12}
              spellCheck={false}
              className={`w-full font-mono text-xs border rounded-xl p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                jsonError ? 'border-red-400 bg-red-50' : 'border-gray-300'
              }`}
            />
            {jsonError && (
              <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
                <AlertCircle size={12} /> {jsonError}
              </p>
            )}
          </div>

          {/* Validation result */}
          {validationSuccess && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
              <CheckCircle2 size={13} /> Data is valid against the schema.
            </div>
          )}

          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                  <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : isEdit ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModelRecordModal
