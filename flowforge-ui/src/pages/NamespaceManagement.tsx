import React, { useEffect, useState } from 'react'
import { Layers, Plus, Trash2, Globe, X } from 'lucide-react'
import { useNamespaceStore } from '../store/namespaceStore'
import { createNamespace, deleteNamespace } from '../api/namespaces'
import type { Namespace } from '../types'
import Spinner from '../components/shared/Spinner'
import ConfirmModal from '../components/shared/ConfirmModal'
import { format } from 'date-fns'

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const NamespaceManagement: React.FC = () => {
  const { namespaces, isLoading, fetchNamespaces } = useNamespaceStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Namespace | null>(null)
  const [form, setForm] = useState({ name: '', displayName: '', description: '' })
  const [nameError, setNameError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => { fetchNamespaces() }, [fetchNamespaces])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!KEBAB_RE.test(form.name)) {
      setNameError('Name must be kebab-case (lowercase letters, numbers, hyphens)')
      return
    }
    setNameError('')
    setIsCreating(true)
    try {
      await createNamespace(form)
      await fetchNamespaces()
    } catch {
      // ignore
    } finally {
      setIsCreating(false)
      setShowCreateModal(false)
      setForm({ name: '', displayName: '', description: '' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteNamespace(deleteTarget.name)
      await fetchNamespaces()
    } catch {
      // ignore
    }
    setDeleteTarget(null)
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading namespaces..." /></div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Namespaces</h1>
          <p className="text-gray-500 text-sm mt-1">{namespaces.length} namespace{namespaces.length !== 1 ? 's' : ''} configured</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl"
        >
          <Plus size={16} /> New Namespace
        </button>
      </div>

      {/* Namespace Cards */}
      <div className="space-y-4">
        {namespaces.map((ns) => (
          <div key={ns.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center flex-shrink-0">
                  {ns.name === 'default' ? (
                    <Globe size={18} className="text-indigo-600" />
                  ) : (
                    <Layers size={18} className="text-indigo-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{ns.displayName}</h3>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{ns.name}</span>
                    {ns.name === 'default' && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Default</span>
                    )}
                  </div>
                  {ns.description && (
                    <p className="text-sm text-gray-500 mt-1">{ns.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>Created {format(new Date(ns.createdAt), 'MMM d, yyyy')}</span>
                    <span>Members: &mdash;</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => ns.name !== 'default' && setDeleteTarget(ns)}
                disabled={ns.name === 'default'}
                className={`p-1.5 rounded-lg ${
                  ns.name === 'default'
                    ? 'text-gray-200 cursor-not-allowed'
                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                }`}
                title={ns.name === 'default' ? 'Cannot delete the default namespace' : 'Delete namespace'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Namespace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Namespace</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameError('') }}
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${nameError ? 'border-red-300' : 'border-gray-300'}`}
                  placeholder="my-namespace"
                />
                {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only (kebab-case)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Display Name</label>
                <input
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Namespace"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isCreating} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">{isCreating ? 'Creating...' : 'Create Namespace'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Namespace"
        message={`Are you sure you want to delete the "${deleteTarget?.displayName}" namespace? All resources in this namespace will be affected. This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default NamespaceManagement
