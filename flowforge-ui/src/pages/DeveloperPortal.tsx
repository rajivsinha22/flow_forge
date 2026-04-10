import React, { useEffect, useState } from 'react'
import { Code2, Key, Play, Plus, Trash2, Copy, CheckCircle, Database, AlertCircle, Terminal, FlaskConical } from 'lucide-react'
import { listApiKeys, createApiKey, revokeApiKey } from '../api/settings'
import type { ApiKey } from '../types'
import { listModelRecords, MOCK_MODEL_RECORDS } from '../api/modelRecords'
import { listWorkflows } from '../api/workflows'
import type { Workflow, ModelRecord } from '../types'
import Spinner from '../components/shared/Spinner'
import JsonViewer from '../components/shared/JsonViewer'
import ConfirmModal from '../components/shared/ConfirmModal'
import { format } from 'date-fns'

const MOCK_API_KEYS: ApiKey[] = [
  { id: 'k-1', name: 'Production Key', keyPrefix: 'ff_prod_abcd1234', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), lastUsedAt: new Date(Date.now() - 3600000).toISOString(), scopes: ['executions:write', 'workflows:read'] },
  { id: 'k-2', name: 'CI/CD Key', keyPrefix: 'ff_ci_efgh5678', createdAt: new Date(Date.now() - 86400000 * 14).toISOString(), lastUsedAt: new Date(Date.now() - 86400000).toISOString(), scopes: ['executions:write', 'workflows:read', 'executions:read'] },
]

interface ApiEndpoint {
  method: string
  path: string
  description: string
  auth: boolean
  category: string
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Workflows
  { method: 'GET', path: '/api/v1/workflows', description: 'List all workflows', auth: true, category: 'Workflows' },
  { method: 'POST', path: '/api/v1/workflows', description: 'Create a new workflow', auth: true, category: 'Workflows' },
  { method: 'GET', path: '/api/v1/workflows/{name}', description: 'Get workflow by name', auth: true, category: 'Workflows' },
  { method: 'PUT', path: '/api/v1/workflows/{name}', description: 'Update workflow definition', auth: true, category: 'Workflows' },
  { method: 'POST', path: '/api/v1/workflows/{name}/publish', description: 'Publish workflow version', auth: true, category: 'Workflows' },
  { method: 'POST', path: '/api/v1/workflows/{name}/trigger', description: 'Trigger workflow execution (supports modelRecordId)', auth: true, category: 'Workflows' },
  // Executions
  { method: 'GET', path: '/api/v1/executions', description: 'List executions with filters', auth: true, category: 'Executions' },
  { method: 'GET', path: '/api/v1/executions/{id}', description: 'Get execution details', auth: true, category: 'Executions' },
  { method: 'GET', path: '/api/v1/executions/{id}/trace', description: 'Full execution trace with steps and model data', auth: true, category: 'Executions' },
  { method: 'POST', path: '/api/v1/executions/{id}/pause', description: 'Pause running execution', auth: true, category: 'Executions' },
  { method: 'POST', path: '/api/v1/executions/{id}/resume', description: 'Resume paused execution', auth: true, category: 'Executions' },
  // Model Records
  { method: 'GET', path: '/api/v1/model-records', description: 'List model records (filter by ?dataModelId=)', auth: true, category: 'Model Records' },
  { method: 'POST', path: '/api/v1/model-records', description: 'Create a model record (validates against DataModel schema)', auth: true, category: 'Model Records' },
  { method: 'GET', path: '/api/v1/model-records/{id}', description: 'Get model record by ID', auth: true, category: 'Model Records' },
  { method: 'PUT', path: '/api/v1/model-records/{id}', description: 'Update model record (re-validates against schema)', auth: true, category: 'Model Records' },
  { method: 'PUT', path: '/api/v1/model-records/{id}/data', description: 'Update record data only (used by execution engine write-back)', auth: true, category: 'Model Records' },
  { method: 'DELETE', path: '/api/v1/model-records/{id}', description: 'Delete a model record', auth: true, category: 'Model Records' },
  // Data Models
  { method: 'GET', path: '/api/v1/models', description: 'List data models (JSON Schema definitions)', auth: true, category: 'Data Models' },
  { method: 'POST', path: '/api/v1/models', description: 'Create a data model', auth: true, category: 'Data Models' },
  { method: 'GET', path: '/api/v1/models/{id}', description: 'Get data model by ID', auth: true, category: 'Data Models' },
  { method: 'PUT', path: '/api/v1/models/{id}', description: 'Update data model', auth: true, category: 'Data Models' },
  { method: 'POST', path: '/api/v1/models/{id}/validate', description: 'Validate payload against model schema', auth: true, category: 'Data Models' },
  // Failed Workflows
  { method: 'GET', path: '/api/v1/failed-workflows', description: 'List failed workflow entries', auth: true, category: 'Failed Workflows' },
  { method: 'POST', path: '/api/v1/failed-workflows/{id}/replay', description: 'Replay failed workflow entry', auth: true, category: 'Failed Workflows' },
  // Auth
  { method: 'POST', path: '/api/v1/auth/login', description: 'Authenticate and get JWT token', auth: false, category: 'Auth' },
  { method: 'POST', path: '/api/v1/auth/register', description: 'Register new organization', auth: false, category: 'Auth' },
]

const API_CATEGORIES = [...new Set(API_ENDPOINTS.map(e => e.category))]

const methodColors: Record<string, string> = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
}

const DeveloperPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'api' | 'keys' | 'sandbox'>('api')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', scopes: ['executions:write', 'workflows:read'] })
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)
  const [copied, setCopied] = useState(false)

  // Sandbox state
  const [sandboxWorkflow, setSandboxWorkflow] = useState('')
  const [sandboxDataSource, setSandboxDataSource] = useState<'payload' | 'record'>('payload')
  const [sandboxPayload, setSandboxPayload] = useState('{\n  "orderId": "ORD-1234",\n  "amount": 99.99\n}')
  const [sandboxRecordId, setSandboxRecordId] = useState('')
  const [sandboxResult, setSandboxResult] = useState<unknown>(null)
  const [isSandboxRunning, setIsSandboxRunning] = useState(false)
  const [sandboxPayloadError, setSandboxPayloadError] = useState('')
  const [sandboxWorkflows, setSandboxWorkflows] = useState<Workflow[]>([])
  const [sandboxModelRecords, setSandboxModelRecords] = useState<ModelRecord[]>([])
  const [sandboxSelectedWorkflow, setSandboxSelectedWorkflow] = useState<Workflow | null>(null)

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

  // Load workflows for sandbox dropdown
  useEffect(() => {
    listWorkflows({ status: 'PUBLISHED' } as any)
      .then(res => {
        const wfs = Array.isArray(res) ? res : (res as any).content || []
        setSandboxWorkflows(wfs)
      })
      .catch(() => {
        // Fallback: use imported DUMMY_WORKFLOWS from mock data
        import('../mocks/data').then(m => setSandboxWorkflows(m.DUMMY_WORKFLOWS as any)).catch(() => {})
      })
  }, [])

  // Load model records when sandbox workflow changes (if it has dataSyncMode)
  useEffect(() => {
    if (!sandboxSelectedWorkflow?.inputModelId) {
      setSandboxModelRecords([])
      return
    }
    listModelRecords(sandboxSelectedWorkflow.inputModelId)
      .then(setSandboxModelRecords)
      .catch(() => setSandboxModelRecords(MOCK_MODEL_RECORDS.filter(r => r.dataModelId === sandboxSelectedWorkflow.inputModelId)))
  }, [sandboxSelectedWorkflow])

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
    setSandboxPayloadError('')

    // Validate JSON if using payload mode
    let parsedPayload: Record<string, unknown> = {}
    if (sandboxDataSource === 'payload') {
      try {
        parsedPayload = JSON.parse(sandboxPayload)
      } catch {
        setSandboxPayloadError('Invalid JSON — fix the payload before running.')
        return
      }
    }

    // Validate selection if using record mode
    if (sandboxDataSource === 'record' && !sandboxRecordId) {
      setSandboxPayloadError('Please select a model record.')
      return
    }

    setIsSandboxRunning(true)
    setSandboxResult(null)

    // Simulate execution — this is a dry run that does NOT persist to DB
    const simStart = Date.now()
    try {
      // Small delay to simulate execution time
      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800))

      const wf = sandboxSelectedWorkflow
      const selectedRecord = sandboxModelRecords.find(r => r.id === sandboxRecordId)
      const inputData = sandboxDataSource === 'record' && selectedRecord
        ? selectedRecord.data
        : parsedPayload

      const simResult: Record<string, unknown> = {
        simulation: true,
        persisted: false,
        executionId: `sim_${Date.now()}`,
        workflowName: wf?.name || sandboxWorkflow,
        workflowVersion: wf?.version || 1,
        status: 'SIMULATED',
        triggerType: 'SANDBOX',
        dataSyncMode: wf?.dataSyncMode || null,
        durationMs: Date.now() - simStart,
        input: inputData,
        modelRecordId: sandboxDataSource === 'record' ? sandboxRecordId : null,
        modelRecordName: selectedRecord?.name || null,
        stepsCount: wf?.steps?.length || 0,
        steps: (wf?.steps || []).map((s: any) => ({
          stepId: s.stepId,
          name: s.name,
          type: s.type,
          status: 'SIMULATED',
        })),
        note: 'This is a simulation. No data was saved to the database and no workflows were actually executed.',
      }

      setSandboxResult(simResult)
    } catch {
      setSandboxResult({
        simulation: true,
        persisted: false,
        status: 'SIMULATION_ERROR',
        message: 'Sandbox simulation failed — this is expected in some environments.',
      })
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
    { id: 'keys', label: 'API Keys', icon: <Key size={15} /> },
    { id: 'sandbox', label: 'Sandbox', icon: <FlaskConical size={15} /> },
  ] as const

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading developer portal..." /></div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Developer Portal</h1>
        <p className="text-gray-500 text-sm mt-1">API reference, keys, and simulation sandbox</p>
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
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
            <p className="text-sm text-gray-500">Base URL: <span className="font-mono text-gray-700">https://api.flowforge.io</span></p>
            <p className="text-sm text-gray-500 mt-1">Authentication: <span className="font-mono text-gray-700">Authorization: Bearer &lt;token&gt;</span></p>
            <p className="text-sm text-gray-500 mt-1">Tenant header: <span className="font-mono text-gray-700">X-Client-Id: &lt;your-org-id&gt;</span></p>
          </div>

          {API_CATEGORIES.map(category => {
            const endpoints = API_ENDPOINTS.filter(e => e.category === category)
            const categoryColors: Record<string, string> = {
              'Workflows': 'border-l-blue-500',
              'Executions': 'border-l-green-500',
              'Model Records': 'border-l-indigo-500',
              'Data Models': 'border-l-violet-500',
              'Failed Workflows': 'border-l-orange-500',
              'Auth': 'border-l-gray-400',
            }
            return (
              <div key={category} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden border-l-4 ${categoryColors[category] || 'border-l-gray-300'}`}>
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700">{category}</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {endpoints.map((ep, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-2.5 w-20">
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${methodColors[ep.method] || 'bg-gray-100 text-gray-600'}`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700 w-80">{ep.path}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{ep.description}</td>
                        <td className="px-6 py-2.5 w-24">
                          {ep.auth ? (
                            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">Required</span>
                          ) : (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Public</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
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
        <div className="space-y-5">
          {/* Simulation banner */}
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <FlaskConical size={18} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Simulation Mode</p>
              <p className="text-xs text-amber-600">Sandbox runs are simulated dry runs. Nothing is saved to the database and no workflows are actually executed.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left panel — Configuration */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FlaskConical size={16} className="text-violet-500" />
                  Simulate Workflow Execution
                </h2>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Workflow selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Workflow</label>
                  <select
                    value={sandboxWorkflow}
                    onChange={(e) => {
                      setSandboxWorkflow(e.target.value)
                      const wf = sandboxWorkflows.find(w => w.name === e.target.value) || null
                      setSandboxSelectedWorkflow(wf)
                      setSandboxRecordId('')
                      setSandboxResult(null)
                    }}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a workflow --</option>
                    {sandboxWorkflows.map(wf => (
                      <option key={wf.name} value={wf.name}>
                        {wf.displayName || wf.name} (v{wf.version})
                        {wf.dataSyncMode ? ` [${wf.dataSyncMode} Sync]` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workflow info badges */}
                {sandboxSelectedWorkflow && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {sandboxSelectedWorkflow.triggerType}
                    </span>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {sandboxSelectedWorkflow.steps?.length || 0} steps
                    </span>
                    {sandboxSelectedWorkflow.dataSyncMode && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sandboxSelectedWorkflow.dataSyncMode === 'WRITE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-cyan-100 text-cyan-700'
                      }`}>
                        {sandboxSelectedWorkflow.dataSyncMode} Sync
                      </span>
                    )}
                    {sandboxSelectedWorkflow.inputModelId && (
                      <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                        Input Model
                      </span>
                    )}
                  </div>
                )}

                {/* Data source toggle */}
                {sandboxSelectedWorkflow && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Data Source</label>
                      <div className="flex rounded-xl overflow-hidden border border-gray-200">
                        <button
                          type="button"
                          onClick={() => { setSandboxDataSource('payload'); setSandboxPayloadError('') }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                            sandboxDataSource === 'payload'
                              ? 'bg-violet-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Terminal size={13} /> JSON Payload
                        </button>
                        {sandboxModelRecords.length > 0 && (
                          <button
                            type="button"
                            onClick={() => { setSandboxDataSource('record'); setSandboxPayloadError('') }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                              sandboxDataSource === 'record'
                                ? 'bg-violet-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <Database size={13} /> Model Record
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Payload editor */}
                    {sandboxDataSource === 'payload' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Input Payload (JSON)</label>
                        <textarea
                          rows={10}
                          value={sandboxPayload}
                          onChange={(e) => { setSandboxPayload(e.target.value); setSandboxPayloadError('') }}
                          spellCheck={false}
                          className={`w-full border rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                            sandboxPayloadError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                      </div>
                    )}

                    {/* Model record selector */}
                    {sandboxDataSource === 'record' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Model Record</label>
                        <select
                          value={sandboxRecordId}
                          onChange={(e) => setSandboxRecordId(e.target.value)}
                          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Select a record --</option>
                          {sandboxModelRecords.map(r => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({Object.keys(r.data).length} fields)
                            </option>
                          ))}
                        </select>
                        {sandboxRecordId && (
                          <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                            <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide mb-1">Record Data</p>
                            <pre className="text-[10px] font-mono text-indigo-800 max-h-32 overflow-auto whitespace-pre-wrap">
                              {JSON.stringify(
                                sandboxModelRecords.find(r => r.id === sandboxRecordId)?.data ?? {},
                                null, 2
                              )}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Error message */}
                {sandboxPayloadError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                    <AlertCircle size={13} className="flex-shrink-0" /> {sandboxPayloadError}
                  </div>
                )}

                {/* Run button */}
                <button
                  onClick={runSandbox}
                  disabled={isSandboxRunning || !sandboxWorkflow}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl transition-colors"
                >
                  {isSandboxRunning ? (
                    <><Spinner size="sm" className="text-white" /> Simulating...</>
                  ) : (
                    <><FlaskConical size={16} /> Simulate Execution</>
                  )}
                </button>
              </div>
            </div>

            {/* Right panel — Result */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Simulation Result</h2>
              </div>

              <div className="px-5 py-4">
                {sandboxResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5">
                      <CheckCircle size={15} className="text-violet-600" />
                      <div>
                        <p className="text-sm font-medium text-violet-800">Simulation Complete</p>
                        <p className="text-[10px] text-violet-500">Dry run only — no data was persisted</p>
                      </div>
                    </div>
                    <JsonViewer data={sandboxResult} initialExpanded />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center h-72">
                    <div className="text-center text-gray-400">
                      <FlaskConical size={36} className="mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">No simulation run yet</p>
                      <p className="text-xs mt-1">Select a workflow and click "Simulate Execution"</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
