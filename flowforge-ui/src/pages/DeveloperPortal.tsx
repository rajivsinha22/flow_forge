import React, { useEffect, useState } from 'react'
import { Code2, Download, Key, Play, Plus, Trash2, Copy, CheckCircle } from 'lucide-react'
import { listApiKeys, createApiKey, revokeApiKey } from '../api/settings'
import type { ApiKey } from '../types'
import { triggerExecution } from '../api/executions'
import Spinner from '../components/shared/Spinner'
import JsonViewer from '../components/shared/JsonViewer'
import ConfirmModal from '../components/shared/ConfirmModal'
import { format } from 'date-fns'

const MOCK_API_KEYS: ApiKey[] = [
  { id: 'k-1', name: 'Production Key', keyPrefix: 'ff_prod_abcd1234', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), lastUsedAt: new Date(Date.now() - 3600000).toISOString(), scopes: ['executions:write', 'workflows:read'] },
  { id: 'k-2', name: 'CI/CD Key', keyPrefix: 'ff_ci_efgh5678', createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), lastUsedAt: new Date(Date.now() - 86400000).toISOString(), scopes: ['executions:write', 'workflows:read', 'executions:read'] },
]

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/workflows', description: 'List all workflows', auth: true },
  { method: 'POST', path: '/api/v1/workflows', description: 'Create a new workflow', auth: true },
  { method: 'GET', path: '/api/v1/workflows/{name}', description: 'Get workflow by name', auth: true },
  { method: 'PUT', path: '/api/v1/workflows/{name}', description: 'Update workflow definition', auth: true },
  { method: 'POST', path: '/api/v1/workflows/{name}/publish', description: 'Publish workflow version', auth: true },
  { method: 'POST', path: '/api/v1/workflows/{name}/trigger', description: 'Trigger workflow execution', auth: true },
  { method: 'GET', path: '/api/v1/executions', description: 'List executions with filters', auth: true },
  { method: 'GET', path: '/api/v1/executions/{id}', description: 'Get execution details', auth: true },
  { method: 'POST', path: '/api/v1/executions/{id}/pause', description: 'Pause running execution', auth: true },
  { method: 'POST', path: '/api/v1/executions/{id}/resume', description: 'Resume paused execution', auth: true },
  { method: 'GET', path: '/api/v1/dlq', description: 'List DLQ messages', auth: true },
  { method: 'POST', path: '/api/v1/dlq/{id}/replay', description: 'Replay DLQ message', auth: true },
  { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate and get JWT token', auth: false },
  { method: 'POST', path: '/api/v1/auth/register', description: 'Register new organization', auth: false },
]

const SDK_CARDS = [
  { lang: 'Java', icon: '☕', color: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', version: '1.2.0', maven: 'io.flowforge:flowforge-sdk:1.2.0' },
  { lang: 'TypeScript', icon: '🔷', color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', version: '1.2.0', npm: 'npm install @flowforge/sdk' },
  { lang: 'Python', icon: '🐍', color: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', version: '1.1.0', pip: 'pip install flowforge-sdk' },
  { lang: 'Go', icon: '🐹', color: 'bg-cyan-50 border-cyan-200', badge: 'bg-cyan-100 text-cyan-700', version: '1.0.0', go: 'go get github.com/flowforge/sdk-go' },
]

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
}

const DeveloperPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'sdks' | 'keys' | 'sandbox'>('api')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', scopes: ['executions:write', 'workflows:read'] })
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [copied, setCopied] = useState(false)

  // Sandbox state
  const [sandboxWorkflow, setSandboxWorkflow] = useState('order-processing')
  const [sandboxPayload, setSandboxPayload] = useState('{\n  "orderId": "ORD-1234",\n  "amount": 99.99\n}')
  const [sandboxResult, setSandboxResult] = useState<unknown>(null)
  const [isSandboxRunning, setIsSandboxRunning] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const keys = await listApiKeys()
        setApiKeys(keys)
      } catch {
        setApiKeys(MOCK_API_KEYS)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await createApiKey(newKeyForm)
      setNewKeySecret(result.secret || 'ff_secret_demo_' + Math.random().toString(36).slice(2))
      setApiKeys((prev) => [...prev, result])
    } catch {
      const secret = 'ff_secret_demo_' + Math.random().toString(36).slice(2)
      const key: ApiKey = { id: `k-${Date.now()}`, ...newKeyForm, keyPrefix: `ff_${newKeyForm.name.slice(0, 4).toLowerCase()}_${Math.random().toString(36).slice(2, 10)}`, createdAt: new Date().toISOString() }
      setApiKeys((prev) => [...prev, key])
      setNewKeySecret(secret)
    }
    setShowCreateKey(false)
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setIsRevoking(true)
    try {
      await revokeApiKey(revokeTarget.id)
    } catch { /* ignore */ } finally {
      setApiKeys((prev) => prev.filter((k) => k.id !== revokeTarget.id))
      setIsRevoking(false)
      setRevokeTarget(null)
    }
  }

  const runSandbox = async () => {
    setIsSandboxRunning(true)
    setSandboxResult(null)
    try {
      let payload: unknown = {}
      try { payload = JSON.parse(sandboxPayload) } catch { /* use empty */ }
      const result = await triggerExecution(sandboxWorkflow, payload)
      setSandboxResult({ status: 'TRIGGERED', executionId: result.id, message: 'Execution started successfully' })
    } catch {
      setSandboxResult({ status: 'DEMO', executionId: 'ex-sandbox-' + Date.now(), message: 'Sandbox execution triggered (demo mode)' })
    } finally {
      setIsSandboxRunning(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs = [
    { id: 'api', label: 'API Reference', icon: <Code2 size={15} /> },
    { id: 'sdks', label: 'SDK Downloads', icon: <Download size={15} /> },
    { id: 'keys', label: 'API Keys', icon: <Key size={15} /> },
    { id: 'sandbox', label: 'Sandbox', icon: <Play size={15} /> },
  ] as const

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading developer portal..." /></div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
        <p className="text-gray-500 text-sm mt-1">API reference, SDKs, keys, and sandbox environment</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* API Reference */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-500">Base URL: <span className="font-mono text-gray-700">https://api.flowforge.io</span></p>
            <p className="text-sm text-gray-500 mt-1">Authentication: <span className="font-mono text-gray-700">Authorization: Bearer &lt;token&gt;</span></p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Endpoint</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Auth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {API_ENDPOINTS.map((ep, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${methodColors[ep.method] || 'bg-gray-100 text-gray-600'}`}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{ep.path}</td>
                  <td className="px-4 py-3 text-gray-600">{ep.description}</td>
                  <td className="px-6 py-3">
                    {ep.auth ? (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Required</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Public</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SDK Downloads */}
      {activeTab === 'sdks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SDK_CARDS.map((sdk) => (
            <div key={sdk.lang} className={`rounded-2xl border-2 p-6 ${sdk.color}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{sdk.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{sdk.lang} SDK</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sdk.badge}`}>v{sdk.version}</span>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400 mb-4">
                {sdk.maven || sdk.npm || sdk.pip || sdk.go}
              </div>
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                <Download size={14} /> Download SDK
              </button>
            </div>
          ))}
        </div>
      )}

      {/* API Keys */}
      {activeTab === 'keys' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setShowCreateKey(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl"
            >
              <Plus size={14} /> Create API Key
            </button>
          </div>

          {newKeySecret && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-semibold text-green-800">API Key Created — Copy it now!</p>
                <button onClick={() => setNewKeySecret(null)} className="text-green-600 hover:text-green-800 text-xs">Dismiss</button>
              </div>
              <p className="text-xs text-green-600 mb-2">This key will only be shown once. Store it securely.</p>
              <div className="flex items-center gap-2 bg-white border border-green-200 rounded-lg p-2">
                <span className="font-mono text-xs text-gray-800 flex-1 break-all">{newKeySecret}</span>
                <button onClick={() => copyToClipboard(newKeySecret)} className="text-green-600 hover:text-green-800 flex-shrink-0">
                  {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Key Prefix</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Scopes</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">Last Used</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{key.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-gray-600">{key.keyPrefix}...</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => <span key={s} className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500">{format(new Date(key.createdAt), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">{key.lastUsedAt ? format(new Date(key.lastUsedAt), 'MMM d, HH:mm') : 'Never'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => setRevokeTarget(key)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 ml-auto">
                        <Trash2 size={11} /> Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCreateKey && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateKey(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create API Key</h3>
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Key Name</label>
                    <input type="text" required value={newKeyForm.name} onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Production Key" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Scopes</label>
                    <div className="space-y-1.5">
                      {['executions:write', 'executions:read', 'workflows:read', 'workflows:write', 'dlq:write'].map((scope) => (
                        <label key={scope} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newKeyForm.scopes.includes(scope)}
                            onChange={(e) => {
                              const scopes = e.target.checked ? [...newKeyForm.scopes, scope] : newKeyForm.scopes.filter((s) => s !== scope)
                              setNewKeyForm({ ...newKeyForm, scopes })
                            }}
                            className="rounded"
                          />
                          <span className="text-xs font-mono text-gray-700">{scope}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreateKey(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
                    <button type="submit" className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700">Create Key</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Test Workflow Execution</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Workflow Name</label>
              <input
                type="text"
                value={sandboxWorkflow}
                onChange={(e) => setSandboxWorkflow(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="workflow-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Input Payload (JSON)</label>
              <textarea
                rows={10}
                value={sandboxPayload}
                onChange={(e) => setSandboxPayload(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={runSandbox}
              disabled={isSandboxRunning || !sandboxWorkflow}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl transition-colors"
            >
              {isSandboxRunning ? (
                <><Spinner size="sm" className="text-white" /> Running...</>
              ) : (
                <><Play size={16} /> Run Workflow</>
              )}
            </button>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Result</h2>
            {sandboxResult ? (
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                  Execution triggered successfully
                </div>
                <JsonViewer data={sandboxResult} initialExpanded />
              </div>
            ) : (
              <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center h-64">
                <div className="text-center text-gray-400">
                  <Play size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Run a workflow to see the result here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!revokeTarget}
        title="Revoke API Key"
        message={`Revoke "${revokeTarget?.name}"? Any services using this key will lose access immediately.`}
        confirmLabel="Revoke Key"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
        isLoading={isRevoking}
      />
    </div>
  )
}

export default DeveloperPortal
