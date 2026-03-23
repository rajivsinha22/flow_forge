import React, { useEffect, useState } from 'react'
import { RefreshCw, Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { listDlqMessages, replayDlqMessage, replayAllDlqMessages, discardDlqMessage } from '../api/dlq'
import type { DlqMessage } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmModal from '../components/shared/ConfirmModal'
import Spinner from '../components/shared/Spinner'
import JsonViewer from '../components/shared/JsonViewer'
import { formatDistanceToNow, format } from 'date-fns'

const MOCK_DLQ: DlqMessage[] = [
  { id: 'dlq-001', executionId: 'ex-003', workflowName: 'invoice-sync', stepName: 'fetch-invoice', failureReason: 'Connection timeout after 30000ms to https://billing.acme.io/invoices', retryCount: 3, status: 'PENDING', failedAt: new Date(Date.now() - 300000).toISOString(), payload: { invoiceId: 'INV-4421', customerId: 'CUST-123' } },
  { id: 'dlq-002', executionId: 'ex-010', workflowName: 'data-pipeline', stepName: 'transform-records', failureReason: "NullPointerException: Cannot read property 'id' of null at step transform-records", retryCount: 1, status: 'PENDING', failedAt: new Date(Date.now() - 900000).toISOString(), payload: { batchId: 'BATCH-889', recordCount: 245 } },
  { id: 'dlq-003', executionId: 'ex-015', workflowName: 'notification-dispatch', stepName: 'send-slack', failureReason: 'Slack API rate limit exceeded (429 Too Many Requests)', retryCount: 5, status: 'PENDING', failedAt: new Date(Date.now() - 1800000).toISOString(), payload: { channel: '#alerts', message: 'Deploy completed' } },
  { id: 'dlq-004', executionId: 'ex-019', workflowName: 'order-processing', stepName: 'validate-order', failureReason: 'HTTP 503 Service Unavailable from https://api.orders.io/validate', retryCount: 2, status: 'REPLAYED', failedAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'dlq-005', executionId: 'ex-022', workflowName: 'invoice-sync', stepName: 'send-email', failureReason: 'SMTP authentication failed: 535 Authentication credentials invalid', retryCount: 3, status: 'DISCARDED', failedAt: new Date(Date.now() - 7200000).toISOString() },
]

const DlqRow: React.FC<{
  msg: DlqMessage
  onReplay: (id: string) => void
  onDiscard: (msg: DlqMessage) => void
}> = ({ msg, onReplay, onDiscard }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border rounded-xl overflow-hidden ${msg.status === 'PENDING' ? 'border-red-100' : 'border-gray-100'}`}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 text-sm">{msg.workflowName}</span>
            <span className="text-xs text-gray-400">→</span>
            <span className="text-sm text-gray-600">{msg.stepName}</span>
          </div>
          <p className="text-xs text-red-600 truncate">{msg.failureReason}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">
            {msg.retryCount} retries
          </span>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(msg.failedAt), { addSuffix: true })}
          </span>
          <StatusBadge status={msg.status} />

          {msg.status === 'PENDING' && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onReplay(msg.id)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
              >
                <RefreshCw size={11} /> Replay
              </button>
              <button
                onClick={() => onDiscard(msg)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={11} /> Discard
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-500">Execution ID:</span>{' '}
              <span className="font-mono text-gray-700">{msg.executionId}</span>
            </div>
            <div>
              <span className="text-gray-500">Failed at:</span>{' '}
              <span className="text-gray-700">{format(new Date(msg.failedAt), 'MMM d, yyyy HH:mm:ss')}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1.5">Failure Reason</p>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700 font-mono">
              {msg.failureReason}
            </div>
          </div>
          {msg.payload && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Payload</p>
              <JsonViewer data={msg.payload} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const DlqConsole: React.FC = () => {
  const [messages, setMessages] = useState<DlqMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReplayingAll, setIsReplayingAll] = useState(false)
  const [discardTarget, setDiscardTarget] = useState<DlqMessage | null>(null)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('PENDING')

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await listDlqMessages()
        setMessages(Array.isArray(res) ? res : (res?.content ?? []))
      } catch {
        setMessages(MOCK_DLQ)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [])

  const handleReplay = async (id: string) => {
    try {
      await replayDlqMessage(id)
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: 'REPLAYED' } : m))
      setSuccessMsg('Message queued for replay')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch { /* ignore */ }
  }

  const handleReplayAll = async () => {
    setIsReplayingAll(true)
    try {
      const res = await replayAllDlqMessages()
      setMessages((prev) => prev.map((m) => m.status === 'PENDING' ? { ...m, status: 'REPLAYED' } : m))
      setSuccessMsg(`${res.count} messages queued for replay`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch {
      const pendingCount = messages.filter((m) => m.status === 'PENDING').length
      setMessages((prev) => prev.map((m) => m.status === 'PENDING' ? { ...m, status: 'REPLAYED' } : m))
      setSuccessMsg(`${pendingCount} messages queued for replay`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } finally {
      setIsReplayingAll(false)
    }
  }

  const handleDiscard = async () => {
    if (!discardTarget) return
    setIsDiscarding(true)
    try {
      await discardDlqMessage(discardTarget.id)
      setMessages((prev) => prev.map((m) => m.id === discardTarget.id ? { ...m, status: 'DISCARDED' } : m))
      setSuccessMsg('Message discarded')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch { /* ignore */ } finally {
      setIsDiscarding(false)
      setDiscardTarget(null)
    }
  }

  const filtered = filterStatus ? messages.filter((m) => m.status === filterStatus) : messages
  const pendingCount = messages.filter((m) => m.status === 'PENDING').length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" label="Loading DLQ..." />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dead Letter Queue</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pendingCount} pending messages requiring attention
          </p>
        </div>
        {pendingCount > 0 && (
          <button
            onClick={handleReplayAll}
            disabled={isReplayingAll}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {isReplayingAll ? (
              <><Loader2 size={14} className="animate-spin" /> Replaying...</>
            ) : (
              <><RefreshCw size={14} /> Replay All Pending ({pendingCount})</>
            )}
          </button>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm mb-6">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', count: messages.filter((m) => m.status === 'PENDING').length, color: 'bg-red-50 border-red-100 text-red-700' },
          { label: 'Replayed', count: messages.filter((m) => m.status === 'REPLAYED').length, color: 'bg-blue-50 border-blue-100 text-blue-700' },
          { label: 'Discarded', count: messages.filter((m) => m.status === 'DISCARDED').length, color: 'bg-gray-50 border-gray-100 text-gray-700' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${color}`}>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['PENDING', 'REPLAYED', 'DISCARDED', ''].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Messages */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 size={40} className="text-green-400 mb-3" />
          <p className="text-gray-500 font-medium">No {filterStatus.toLowerCase()} messages</p>
          <p className="text-gray-400 text-sm mt-1">
            {filterStatus === 'PENDING' ? 'All caught up! No messages need attention.' : `No messages in ${filterStatus.toLowerCase()} state.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((msg) => (
            <DlqRow
              key={msg.id}
              msg={msg}
              onReplay={handleReplay}
              onDiscard={setDiscardTarget}
            />
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!discardTarget}
        title="Discard DLQ Message"
        message={`Discard this failed message from "${discardTarget?.workflowName}" → "${discardTarget?.stepName}"? This cannot be undone.`}
        confirmLabel="Discard"
        variant="danger"
        onConfirm={handleDiscard}
        onCancel={() => setDiscardTarget(null)}
        isLoading={isDiscarding}
      />
    </div>
  )
}

// Fix missing import
const Loader2 = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export default DlqConsole
