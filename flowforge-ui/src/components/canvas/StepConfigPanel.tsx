import React, { useEffect, useState } from 'react'
import { X, Plus, Trash2, Sparkles } from 'lucide-react'
import { useWorkflowStore } from '../../store/workflowStore'
import type { WorkflowNodeData } from '../../store/workflowStore'
import ScriptStepConfig from './ScriptStepConfig'

interface StepConfigPanelProps {
  nodeId: string
  onClose: () => void
}

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const HttpConfig: React.FC<{ config: Record<string, unknown>; onChange: (config: Record<string, unknown>) => void }> = ({ config, onChange }) => {
  const headers = (config.headers as Record<string, string>) || {}
  const headerEntries = Object.entries(headers)

  const addHeader = () => {
    onChange({ ...config, headers: { ...headers, '': '' } })
  }

  const updateHeader = (oldKey: string, newKey: string, value: string) => {
    const newHeaders = { ...headers }
    delete newHeaders[oldKey]
    newHeaders[newKey] = value
    onChange({ ...config, headers: newHeaders })
  }

  const removeHeader = (key: string) => {
    const newHeaders = { ...headers }
    delete newHeaders[key]
    onChange({ ...config, headers: newHeaders })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Method</label>
        <select
          value={String(config.method || 'GET')}
          onChange={(e) => onChange({ ...config, method: e.target.value })}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {methodOptions.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
        <input
          type="text"
          placeholder="https://api.example.com/endpoint"
          value={String(config.url || '')}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-700">Headers</label>
          <button onClick={addHeader} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="space-y-1.5">
          {headerEntries.map(([key, val], i) => (
            <div key={i} className="flex gap-1.5">
              <input
                placeholder="Key"
                value={key}
                onChange={(e) => updateHeader(key, e.target.value, val)}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
              />
              <input
                placeholder="Value"
                value={val}
                onChange={(e) => updateHeader(key, key, e.target.value)}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
              />
              <button onClick={() => removeHeader(key)} className="text-red-400 hover:text-red-600">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Request Body (JSON)</label>
        <textarea
          rows={4}
          placeholder='{"key": "value"}'
          value={String(config.body || '')}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          className="w-full text-xs font-mono border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  )
}

const ConditionConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }> = ({ config, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Expression</label>
      <input
        type="text"
        placeholder='$.response.status == "active"'
        value={String(config.expression || '')}
        onChange={(e) => onChange({ ...config, expression: e.target.value })}
        className="w-full text-sm font-mono border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-400 mt-1">Use JSONPath expressions to evaluate conditions</p>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">True Branch Step ID</label>
      <input
        type="text"
        value={String(config.trueBranch || '')}
        onChange={(e) => onChange({ ...config, trueBranch: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">False Branch Step ID</label>
      <input
        type="text"
        value={String(config.falseBranch || '')}
        onChange={(e) => onChange({ ...config, falseBranch: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
  </div>
)

const LoopConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }> = ({ config, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">List Path (JSONPath)</label>
      <input
        type="text"
        placeholder="$.data.items"
        value={String(config.listPath || '')}
        onChange={(e) => onChange({ ...config, listPath: e.target.value })}
        className="w-full text-sm font-mono border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Item Variable Name</label>
      <input
        type="text"
        placeholder="item"
        value={String(config.itemVar || '')}
        onChange={(e) => onChange({ ...config, itemVar: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Max Iterations</label>
      <input
        type="number"
        min={1}
        value={Number(config.maxIterations || 100)}
        onChange={(e) => onChange({ ...config, maxIterations: parseInt(e.target.value) })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
  </div>
)

const DelayConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }> = ({ config, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Duration (ms)</label>
      <input
        type="number"
        min={0}
        placeholder="1000"
        value={Number(config.durationMs || 0)}
        onChange={(e) => onChange({ ...config, durationMs: parseInt(e.target.value) })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
  </div>
)

// ScriptConfig is now handled by the full-featured ScriptStepConfig component (ScriptStepConfig.tsx)

const NotifyConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }> = ({ config, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
      <select
        value={String(config.channel || 'SLACK')}
        onChange={(e) => onChange({ ...config, channel: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      >
        <option value="SLACK">Slack</option>
        <option value="EMAIL">Email</option>
        <option value="WEBHOOK">Webhook</option>
      </select>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Recipient / Channel Name</label>
      <input
        type="text"
        placeholder="#alerts or user@example.com"
        value={String(config.recipient || '')}
        onChange={(e) => onChange({ ...config, recipient: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Message Template</label>
      <textarea
        rows={4}
        placeholder="Workflow {{workflowName}} completed with status {{status}}"
        value={String(config.message || '')}
        onChange={(e) => onChange({ ...config, message: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
  </div>
)

const SubWorkflowConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }> = ({ config, onChange }) => (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Sub-Workflow Name</label>
      <input
        type="text"
        placeholder="my-sub-workflow"
        value={String(config.workflowName || '')}
        onChange={(e) => onChange({ ...config, workflowName: e.target.value })}
        className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Input Mapping (JSON)</label>
      <textarea
        rows={4}
        placeholder='{"input_key": "$.previousStep.output.value"}'
        value={String(config.inputMapping || '')}
        onChange={(e) => onChange({ ...config, inputMapping: e.target.value })}
        className="w-full text-xs font-mono border border-gray-300 rounded-lg px-2.5 py-1.5"
      />
    </div>
    <div>
      <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(config.waitForCompletion)}
          onChange={(e) => onChange({ ...config, waitForCompletion: e.target.checked })}
          className="rounded"
        />
        Wait for completion
      </label>
    </div>
  </div>
)

const WaitConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; stepName?: string }> = ({ config, onChange, stepName }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Timeout (minutes)
      </label>
      <input
        type="number"
        min={0}
        placeholder="0 = wait indefinitely"
        value={config.timeoutMinutes !== undefined ? Number(config.timeoutMinutes) : ''}
        onChange={(e) => onChange({ ...config, timeoutMinutes: parseInt(e.target.value) || 0 })}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
      <p className="text-xs text-gray-400 mt-1">Set to 0 for no timeout.</p>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Resume Context Key
      </label>
      <input
        type="text"
        placeholder="Defaults to step name"
        value={String(config.resumeContextKey || '')}
        onChange={(e) => onChange({ ...config, resumeContextKey: e.target.value })}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
      />
      <p className="text-xs text-gray-400 mt-1">
        Resume data will be available as{' '}
        <code className="bg-gray-100 px-1 rounded">
          {'${' + (String(config.resumeContextKey || '') || stepName || 'stepName') + '.fieldName}'}
        </code>
      </p>
    </div>
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        Description
      </label>
      <textarea
        rows={2}
        placeholder="Why is this workflow waiting?"
        value={String(config.description || '')}
        onChange={(e) => onChange({ ...config, description: e.target.value })}
        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
      />
    </div>
    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700 space-y-1">
      <div className="font-semibold">How to resume:</div>
      <div>• API: <code className="font-mono bg-amber-100 px-1 rounded">POST /executions/:id/steps/:stepId/resume</code></div>
      <div>• Token: <code className="font-mono bg-amber-100 px-1 rounded">POST /executions/resume-by-token/:token</code></div>
      <div>• Kafka trigger with action set to "Resume Wait State"</div>
    </div>
  </div>
)

const RetryPolicySection: React.FC<{ data: WorkflowNodeData; nodeId: string }> = ({ data, nodeId }) => {
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData)
  const policy = data.retryPolicy || { maxRetries: 3, strategy: 'EXPONENTIAL', initialDelayMs: 1000, maxDelayMs: 30000 }

  const update = (field: string, value: unknown) => {
    updateNodeData(nodeId, { retryPolicy: { ...policy, [field]: value } })
  }

  return (
    <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Retry Policy</h4>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Max Retries</label>
          <input
            type="number"
            min={0}
            max={10}
            value={policy.maxRetries}
            onChange={(e) => update('maxRetries', parseInt(e.target.value))}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Strategy</label>
          <select
            value={policy.strategy}
            onChange={(e) => update('strategy', e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="FIXED">Fixed</option>
            <option value="EXPONENTIAL">Exponential</option>
            <option value="LINEAR">Linear</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Initial Delay (ms)</label>
          <input
            type="number"
            min={100}
            value={policy.initialDelayMs}
            onChange={(e) => update('initialDelayMs', parseInt(e.target.value))}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Max Delay (ms)</label>
          <input
            type="number"
            min={1000}
            value={policy.maxDelayMs}
            onChange={(e) => update('maxDelayMs', parseInt(e.target.value))}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          />
        </div>
      </div>
    </div>
  )
}

// ─── AI Call Config ───────────────────────────────────────────────────────────

const AI_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'claude-haiku-4-5 (fast, cost-effective)' },
  { value: 'claude-sonnet-4-6',         label: 'claude-sonnet-4-6 (balanced)'             },
]

const AiCallConfig: React.FC<{ config: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void }> = ({ config, onChange }) => (
  <div className="space-y-3">
    {/* Model */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
      <select
        value={String(config.model || 'claude-haiku-4-5-20251001')}
        onChange={(e) => onChange({ ...config, model: e.target.value })}
        className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {AI_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>

    {/* System Prompt */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt <span className="text-gray-400 font-normal">(optional)</span></label>
      <textarea
        rows={3}
        placeholder="You are a helpful assistant that..."
        value={String(config.systemPrompt || '')}
        onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
        className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
      />
    </div>

    {/* User Prompt */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">User Prompt <span className="text-red-400">*</span></label>
      <textarea
        rows={6}
        placeholder={'Summarize the following order:\nOrder ID: ${input.orderId}\nItems: ${steps.fetchOrder.output.items}'}
        value={String(config.userPrompt || '')}
        onChange={(e) => onChange({ ...config, userPrompt: e.target.value })}
        className="w-full text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {['${input.field}', '${steps.stepId.output.field}', '${variables.name}'].map((hint) => (
          <code key={hint} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
            {hint}
          </code>
        ))}
      </div>
    </div>

    {/* Max Tokens + Temperature */}
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Max Tokens</label>
        <input
          type="number"
          min={1}
          max={8192}
          value={Number(config.maxTokens ?? 1024)}
          onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value) || 1024 })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={Number(config.temperature ?? 0.7)}
          onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>

    {/* Info callout */}
    <div className="flex gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
      <Sparkles size={12} className="text-indigo-500 mt-0.5 shrink-0" />
      <p className="text-xs text-indigo-700">
        Output is available as <code className="bg-indigo-100 px-1 rounded font-mono">{'${steps.' + (config as any).__stepId + '.output.text}'}</code> in subsequent steps.
      </p>
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────

const StepConfigPanel: React.FC<StepConfigPanelProps> = ({ nodeId, onClose }) => {
  const { nodes, updateNodeData, updateNodeConfig, deleteNode } = useWorkflowStore()
  const node = nodes.find((n) => n.id === nodeId)
  const [name, setName] = useState(node?.data.name || '')

  useEffect(() => {
    setName(node?.data.name || '')
  }, [nodeId, node?.data.name])

  if (!node) return null

  const data = node.data
  const type = (data.type || 'HTTP_REQUEST').toUpperCase()

  const handleNameBlur = () => {
    if (name !== data.name) updateNodeData(nodeId, { name })
  }

  const handleConfigChange = (config: Record<string, unknown>) => {
    updateNodeConfig(nodeId, config)
  }

  const renderConfig = () => {
    const cfg = data.config || {}
    switch (type) {
      case 'HTTP_REQUEST':
      case 'HTTP':
        return <HttpConfig config={cfg} onChange={handleConfigChange} />
      case 'CONDITION':
        return <ConditionConfig config={cfg} onChange={handleConfigChange} />
      case 'LOOP':
        return <LoopConfig config={cfg} onChange={handleConfigChange} />
      case 'DELAY':
        return <DelayConfig config={cfg} onChange={handleConfigChange} />
      case 'SCRIPT':
        return <ScriptStepConfig config={cfg} onChange={handleConfigChange} />
      case 'NOTIFY':
        return <NotifyConfig config={cfg} onChange={handleConfigChange} />
      case 'SUB_WORKFLOW':
        return <SubWorkflowConfig config={cfg} onChange={handleConfigChange} />
      case 'WAIT':
        return <WaitConfig config={cfg} onChange={handleConfigChange} stepName={name} />
      case 'AI_CALL':
        return <AiCallConfig config={{ ...cfg, __stepId: nodeId }} onChange={handleConfigChange} />
      default:
        return <p className="text-xs text-gray-500">No configuration for this step type.</p>
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Step Configuration</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Step name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Step Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Step ID (readonly) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Step ID</label>
          <input
            type="text"
            value={data.stepId}
            readOnly
            className="w-full text-xs font-mono border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 text-gray-500"
          />
        </div>

        {/* Type-specific config */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            {type.replace(/_/g, ' ')} Settings
          </h4>
          {renderConfig()}
        </div>

        {/* Routing */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Routing</h4>
          <div>
            <label className="block text-xs text-gray-600 mb-1">On Success → Step ID</label>
            <input
              type="text"
              value={data.onSuccess || ''}
              onChange={(e) => updateNodeData(nodeId, { onSuccess: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">On Failure → Step ID</label>
            <input
              type="text"
              value={data.onFailure || ''}
              onChange={(e) => updateNodeData(nodeId, { onFailure: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
          </div>
        </div>

        {/* Retry Policy */}
        <RetryPolicySection data={data} nodeId={nodeId} />
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={() => deleteNode(nodeId)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <Trash2 size={12} /> Delete Step
        </button>
      </div>
    </div>
  )
}

export default StepConfigPanel
