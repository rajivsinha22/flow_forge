import React, { useState } from 'react'
import { X, FolderInput, AlertCircle } from 'lucide-react'
import { useNamespaceStore } from '../../store/namespaceStore'

interface MoveNamespaceModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (ns: string) => Promise<void>
  currentNamespace: string
  entityLabel: string
}

const MoveNamespaceModal: React.FC<MoveNamespaceModalProps> = ({
  open, onClose, onConfirm, currentNamespace, entityLabel,
}) => {
  const namespaces = useNamespaceStore(s => s.namespaces)
  const available = namespaces.filter(n => n.name !== currentNamespace)
  const [selected, setSelected] = useState<string>(available[0]?.name ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleMove = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(selected)
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to move to namespace'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-full flex-shrink-0 text-blue-600 bg-blue-100">
            <FolderInput size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">Move {entityLabel}</h3>
            <p className="mt-2 text-sm text-gray-600">
              Move this {entityLabel.toLowerCase()} from <span className="font-mono font-semibold">{currentNamespace}</span> to another namespace.
              It will no longer appear in the current namespace's list.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Target Namespace
          </label>
          {available.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No other namespaces available.</p>
          ) : (
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              disabled={submitting}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            >
              {available.map(n => (
                <option key={n.id} value={n.name}>
                  {n.displayName} ({n.name})
                </option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={submitting || available.length === 0 || !selected}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {submitting ? 'Moving...' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default MoveNamespaceModal
