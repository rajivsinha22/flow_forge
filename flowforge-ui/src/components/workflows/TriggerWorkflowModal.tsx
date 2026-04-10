import React, { useState, useEffect } from 'react'
import {
  X, Play, Zap, Clock, MessageSquare, Terminal,
  Copy, Check, ChevronDown, ChevronUp, AlertCircle, Loader2,
  Database, RefreshCw,
} from 'lucide-react'
import { triggerWorkflow } from '../../api/workflows'
import { listModelRecords, MOCK_MODEL_RECORDS } from '../../api/modelRecords'
import type { Workflow, ModelRecord } from '../../types'

// ─── Trigger type metadata ────────────────────────────────────────────────────

interface TriggerMeta {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
  description: string
}

const TRIGGER_META: Record<string, TriggerMeta> = {
  API: {
    label: 'Manual API',
    icon: <Terminal size={16} />,
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    description: 'Triggered on demand via REST API call or the Run Now button below.',
  },
  KAFKA: {
    label: 'Kafka Event',
    icon: <Zap size={16} />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Fires automatically when a matching message is consumed from the Kafka topic.',
  },
  CRON: {
    label: 'Cron Schedule',
    icon: <Clock size={16} />,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Runs automatically on a fixed schedule. You can also trigger it manually.',
  },
  EVENT: {
    label: 'Event (Kafka/SQS)',
    icon: <MessageSquare size={16} />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Fires when a matching event arrives on the configured topic or queue.',
  },
}

// ─── Cron helper ─────────────────────────────────────────────────────────────

function describeCron(expr: string): string {
  const COMMON: Record<string, string> = {
    '0 * * * *':     'Every hour at :00',
    '*/5 * * * *':   'Every 5 minutes',
    '*/15 * * * *':  'Every 15 minutes',
    '*/30 * * * *':  'Every 30 minutes',
    '0 9 * * 1-5':   'Weekdays at 09:00 UTC',
    '0 9 * * *':     'Every day at 09:00 UTC',
    '0 0 * * *':     'Every day at midnight UTC',
    '0 2 * * *':     'Every day at 02:00 UTC',
    '0 0 * * 1':     'Every Monday at midnight UTC',
    '0 0 1 * *':     'First day of every month at midnight UTC',
    '0 12 * * *':    'Every day at 12:00 UTC (noon)',
  }
  return COMMON[expr.trim()] || expr
}

// Compute the next N UTC fire times (approximate, for display only)
function nextCronRuns(expr: string, count = 3): string[] {
  try {
    const parts = expr.trim().split(/\s+/)
    if (parts.length !== 5) return []
    const [minute, hour] = parts
    const min  = minute.startsWith('*/') ? parseInt(minute.slice(2)) : (isNaN(+minute) ? null : +minute)
    const hr   = hour === '*' ? null : (isNaN(+hour) ? null : +hour)
    const results: string[] = []
    const d = new Date()
    d.setSeconds(0, 0)
    for (let i = 0; i < 200 && results.length < count; i++) {
      d.setMinutes(d.getMinutes() + 1)
      const m = d.getUTCMinutes()
      const h = d.getUTCHours()
      const matchMin  = min === null ? (m % (min || 1) === 0) : (m === min)
      const matchHour = hr === null || h === hr
      if (matchMin && matchHour) {
        results.push(
          d.toLocaleString(undefined, {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false,
          })
        )
      }
    }
    return results
  } catch {
    return []
  }
}

// ─── Copy button ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
      title="Copy"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

// ─── Code block ──────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  return (
    <div className="relative group">
      <pre className={`text-xs font-mono bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed lang-${lang}`}>
        {code}
      </pre>
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={code} />
      </div>
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title, defaultOpen = true, children,
}: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}

// ─── Type-specific info panels ───────────────────────────────────────────────

function ApiInfo({ workflow }: { workflow: Workflow }) {
  const endpoint = `POST /api/v1/workflows/${workflow.name}/trigger`
  const curlExample = `curl -X POST \\
  https://api.flowforge.io/api/v1/workflows/${workflow.name}/trigger \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"input": {"key": "value"}}'`

  return (
    <Section title="API Endpoint">
      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Endpoint</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <code className="text-xs font-mono text-gray-800 flex-1 break-all">{endpoint}</code>
            <CopyButton text={endpoint} />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">cURL Example</p>
          <CodeBlock code={curlExample} />
        </div>
        <div className="flex items-start gap-2 text-xs text-teal-700 bg-teal-50 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          Authenticate via Bearer token or API Key header. Use the Developer Portal to generate keys.
        </div>
      </div>
    </Section>
  )
}

function KafkaInfo({ workflow }: { workflow: Workflow }) {
  // Try to find the configured topic from dummy triggers
  const topicPlaceholder = `${workflow.name}.events`
  const samplePayload = JSON.stringify(
    { event: 'entity.created', data: { id: '12345', workflowName: workflow.name }, meta: { source: 'service-a', timestamp: new Date().toISOString() } },
    null, 2
  )
  const produceCmd = `# Using kafka-console-producer
echo '${JSON.stringify({ event: 'entity.created', data: { id: '12345' } })}' | \\
  kafka-console-producer.sh \\
  --broker-list kafka-broker:9092 \\
  --topic ${topicPlaceholder}`

  return (
    <Section title="Kafka Topic">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Subscribed Topic</p>
            <code className="text-xs font-mono text-purple-700 font-semibold">{topicPlaceholder}</code>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-0.5">Consumer Group</p>
            <code className="text-xs font-mono text-gray-700">flowforge-engine</code>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Expected Event Schema</p>
          <CodeBlock code={samplePayload} lang="json" />
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Produce a Test Event</p>
          <CodeBlock code={produceCmd} />
        </div>
        <div className="flex items-start gap-2 text-xs text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          Trigger conditions configured in <strong>Event Triggers</strong> determine which messages fire this workflow.
          Use the <strong>Run Now</strong> button below to trigger a test execution without producing to Kafka.
        </div>
      </div>
    </Section>
  )
}

function CronInfo({ workflow }: { workflow: Workflow }) {
  // Try to show a meaningful cron expression
  const cronExpr = '0 9 * * 1-5'  // default fallback
  const description = describeCron(cronExpr)
  const nextRuns = nextCronRuns(cronExpr)

  return (
    <Section title="Cron Schedule">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-600 mb-0.5">Expression (UTC)</p>
            <code className="text-sm font-mono text-orange-800 font-bold">{cronExpr}</code>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-600 mb-0.5">Human Readable</p>
            <p className="text-xs font-medium text-orange-800">{description}</p>
          </div>
        </div>
        {nextRuns.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Next scheduled runs</p>
            <div className="space-y-1">
              {nextRuns.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={11} className="text-orange-400 flex-shrink-0" />
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
          <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
          The schedule runs automatically via Quartz Scheduler. Use <strong>Run Now</strong> below to trigger an immediate one-off execution.
        </div>
      </div>
    </Section>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  workflow: Workflow
  isOpen: boolean
  onClose: () => void
  onTriggered: (executionId: string) => void
}

export default function TriggerWorkflowModal({ workflow, isOpen, onClose, onTriggered }: Props) {
  const [payload, setPayload] = useState('{\n  \n}')
  const [payloadError, setPayloadError] = useState('')
  const [isTriggering, setIsTriggering] = useState(false)
  const [triggerError, setTriggerError] = useState('')

  // Model record linking state
  const hasDataSync = !!workflow.dataSyncMode && !!workflow.inputModelId
  const [dataSource, setDataSource] = useState<'record' | 'custom'>('custom')
  const [modelRecords, setModelRecords] = useState<ModelRecord[]>([])
  const [selectedRecordId, setSelectedRecordId] = useState<string>('')
  const [loadingRecords, setLoadingRecords] = useState(false)

  const meta = TRIGGER_META[workflow.triggerType] || TRIGGER_META.API

  useEffect(() => {
    if (!isOpen) return
    // Reset state when modal opens, pre-fill with a sample payload
    const sample = samplePayloadFor(workflow)
    setPayload(JSON.stringify(sample, null, 2))
    setPayloadError('')
    setTriggerError('')
    setDataSource('custom')
    setSelectedRecordId('')

    // Load model records if workflow has data sync enabled
    if (hasDataSync && workflow.inputModelId) {
      setLoadingRecords(true)
      listModelRecords(workflow.inputModelId)
        .then(setModelRecords)
        .catch(() => setModelRecords(MOCK_MODEL_RECORDS.filter(r => r.dataModelId === workflow.inputModelId)))
        .finally(() => setLoadingRecords(false))
    }
  }, [isOpen, workflow])

  if (!isOpen) return null

  const handleTrigger = async () => {
    // Validate JSON
    let parsed: unknown
    try {
      parsed = JSON.parse(payload)
      setPayloadError('')
    } catch {
      setPayloadError('Invalid JSON — fix the payload before triggering.')
      return
    }

    setIsTriggering(true)
    setTriggerError('')
    try {
      const triggerPayload: Record<string, unknown> = {
        input: parsed,
        triggerType: 'API',
      }
      // Include modelRecordId if triggering by record
      if (hasDataSync && dataSource === 'record' && selectedRecordId) {
        triggerPayload.modelRecordId = selectedRecordId
      }
      const res = await triggerWorkflow(workflow.name, triggerPayload)
      onTriggered(res.executionId)
      onClose()
    } catch (e: unknown) {
      setTriggerError('Failed to start execution. Please try again.')
    } finally {
      setIsTriggering(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-[560px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-base">Trigger Workflow</h3>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{workflow.displayName}</p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 p-1 rounded flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Trigger type badge */}
          <div className={`flex items-start gap-3 p-4 rounded-xl border ${meta.bgColor} ${meta.borderColor}`}>
            <span className={`mt-0.5 flex-shrink-0 ${meta.color}`}>{meta.icon}</span>
            <div>
              <div className={`text-sm font-semibold ${meta.color}`}>{meta.label}</div>
              <div className={`text-xs mt-0.5 ${meta.color} opacity-80`}>{meta.description}</div>
            </div>
            <span className={`ml-auto flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}>
              {workflow.triggerType}
            </span>
          </div>

          {/* Type-specific info */}
          {workflow.triggerType === 'API'   && <ApiInfo   workflow={workflow} />}
          {workflow.triggerType === 'KAFKA' && <KafkaInfo workflow={workflow} />}
          {workflow.triggerType === 'CRON'  && <CronInfo  workflow={workflow} />}

          {/* Data source toggle (when data sync is enabled) */}
          {hasDataSync && (
            <Section title={`Data Source — ${workflow.dataSyncMode} Sync`} defaultOpen>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <RefreshCw size={12} className={workflow.dataSyncMode === 'WRITE' ? 'text-emerald-500' : 'text-cyan-500'} />
                  <span>
                    This workflow has <strong className={workflow.dataSyncMode === 'WRITE' ? 'text-emerald-600' : 'text-cyan-600'}>{workflow.dataSyncMode}</strong> sync enabled.
                    Model data will be loaded into execution context{workflow.dataSyncMode === 'WRITE' ? ' and written back after success' : ''}.
                  </span>
                </div>

                {/* Toggle */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setDataSource('record')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                      dataSource === 'record'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Database size={13} /> Model Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataSource('custom')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${
                      dataSource === 'custom'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Terminal size={13} /> Custom Payload
                  </button>
                </div>

                {/* Model record dropdown */}
                {dataSource === 'record' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Model Record</label>
                    {loadingRecords ? (
                      <p className="text-xs text-gray-400">Loading records...</p>
                    ) : modelRecords.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">
                        No records found. Create one in the Models page first.
                      </p>
                    ) : (
                      <select
                        value={selectedRecordId}
                        onChange={e => setSelectedRecordId(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">— Select a record —</option>
                        {modelRecords.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({Object.keys(r.data).length} fields)
                          </option>
                        ))}
                      </select>
                    )}
                    {selectedRecordId && (
                      <div className="mt-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                        <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wide mb-1">Record Data Preview</p>
                        <pre className="text-[10px] font-mono text-indigo-800 max-h-32 overflow-auto">
                          {JSON.stringify(
                            modelRecords.find(r => r.id === selectedRecordId)?.data ?? {},
                            null, 2
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {dataSource === 'custom' && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                    A new model record will be auto-created from the payload below.
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Manual trigger payload */}
          <Section title="Run Now — Input Payload" defaultOpen={!hasDataSync || dataSource === 'custom'}>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Provide the JSON input that will be available as <code className="font-mono bg-gray-100 px-1 rounded">$&#x7B;input.*&#x7D;</code> within step expressions.
              </p>
              <textarea
                rows={10}
                value={payload}
                onChange={e => setPayload(e.target.value)}
                spellCheck={false}
                className={`w-full font-mono text-xs border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 ${payloadError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
              />
              {payloadError && (
                <p className="flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={13} /> {payloadError}
                </p>
              )}
            </div>
          </Section>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-lg font-bold text-gray-800">v{workflow.version}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active version</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-lg font-bold text-gray-800">{workflow.steps.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Steps</p>
            </div>
            <div className={`rounded-xl p-3 border ${workflow.status === 'PUBLISHED' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-sm font-bold ${workflow.status === 'PUBLISHED' ? 'text-green-700' : 'text-amber-700'}`}>
                {workflow.status}
              </p>
              <p className={`text-xs mt-0.5 ${workflow.status === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600'}`}>
                Workflow status
              </p>
            </div>
          </div>

          {/* Not published warning */}
          {workflow.status !== 'PUBLISHED' && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-200">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              This workflow is not published. Publish it first to enable automatic triggers. Manual runs will still execute the current draft.
            </div>
          )}

          {/* Trigger error */}
          {triggerError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2.5 border border-red-200">
              <AlertCircle size={13} className="flex-shrink-0" /> {triggerError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleTrigger}
            disabled={isTriggering}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 rounded-xl transition-colors shadow-sm"
          >
            {isTriggering
              ? <><Loader2 size={15} className="animate-spin" /> Starting...</>
              : <><Play size={15} fill="currentColor" /> Run Now</>}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Sample payload generator ─────────────────────────────────────────────────

function samplePayloadFor(wf: Workflow): Record<string, unknown> {
  const samples: Record<string, Record<string, unknown>> = {
    'order-processing': { customerId: 'CUST-001', orderId: 'ORD-2026-9921', items: [{ sku: 'SKU-A', qty: 2 }], totalAmount: 149.99 },
    'payment-flow':     { amount: 249.99, currency: 'USD', cardToken: 'tok_visa_xxxx4242', orderId: 'ORD-2026-9921' },
    'user-onboarding':  { userId: 'USR-12345', email: 'new.user@example.com', source: 'WEB', plan: 'PRO' },
    'refund-processor': { batchDate: new Date().toISOString().split('T')[0], dryRun: false },
    'email-campaign':   { segmentId: 'seg_newsletter_march', templateId: 'tmpl_spring_promo', sendAt: new Date().toISOString() },
    'fraud-detection':  { transactionId: 'TXN-0099', amount: 4999.0, cardLast4: '1337', country: 'US', merchantId: 'MER-88' },
  }
  return samples[wf.name] || { input: { key: 'value' } }
}
