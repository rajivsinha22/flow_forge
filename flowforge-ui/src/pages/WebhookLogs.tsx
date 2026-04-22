import React, { useEffect, useState } from 'react'
import { RefreshCw, ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, Webhook } from 'lucide-react'
import { listWebhookDeliveries, retryWebhookDelivery, getWebhookStats } from '../api/webhooks'
import type { WebhookDelivery } from '../types'
import type { WebhookStats } from '../api/webhooks'
import { useNamespaceStore } from '../store/namespaceStore'
import StatusBadge from '../components/shared/StatusBadge'
import Spinner from '../components/shared/Spinner'
import JsonViewer from '../components/shared/JsonViewer'
import { formatDistanceToNow, format } from 'date-fns'

const MOCK_STATS: WebhookStats = { totalDeliveries: 1284, successRate: 94.7, failedCount: 68, pendingCount: 12, avgResponseTimeMs: 342 }

const MOCK_DELIVERIES: WebhookDelivery[] = [
  { id: 'wh-001', workflowName: 'order-processing', url: 'https://app.acme.io/hooks/orders', status: 'SUCCESS', httpStatus: 200, attempts: 1, createdAt: new Date(Date.now() - 60000).toISOString(), lastAttemptAt: new Date(Date.now() - 59000).toISOString(), payload: { event: 'order.completed', orderId: 'ORD-8821' } },
  { id: 'wh-002', workflowName: 'user-onboarding', url: 'https://crm.company.io/webhooks/users', status: 'FAILED', httpStatus: 503, attempts: 3, createdAt: new Date(Date.now() - 300000).toISOString(), lastAttemptAt: new Date(Date.now() - 60000).toISOString(), payload: { event: 'user.created', userId: 'USR-552' } },
  { id: 'wh-003', workflowName: 'invoice-sync', url: 'https://billing.io/webhooks/invoices', status: 'PENDING', attempts: 0, createdAt: new Date(Date.now() - 30000).toISOString(), payload: { event: 'invoice.generated', invoiceId: 'INV-990' } },
  { id: 'wh-004', workflowName: 'notification-dispatch', url: 'https://notify.acme.io/hooks', status: 'SUCCESS', httpStatus: 201, attempts: 1, createdAt: new Date(Date.now() - 600000).toISOString(), lastAttemptAt: new Date(Date.now() - 599000).toISOString() },
  { id: 'wh-005', workflowName: 'order-processing', url: 'https://app.acme.io/hooks/orders', status: 'FAILED', httpStatus: 404, attempts: 3, createdAt: new Date(Date.now() - 900000).toISOString(), lastAttemptAt: new Date(Date.now() - 800000).toISOString(), payload: { event: 'order.failed', orderId: 'ORD-8819' } },
]

const DeliveryRow: React.FC<{ delivery: WebhookDelivery; onRetry: (id: string) => void }> = ({ delivery, onRetry }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-gray-900 text-sm">{delivery.workflowName}</span>
            {delivery.httpStatus && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${delivery.httpStatus >= 200 && delivery.httpStatus < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {delivery.httpStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-mono truncate">{delivery.url}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-gray-400">{delivery.attempts} attempt{delivery.attempts !== 1 ? 's' : ''}</span>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(delivery.createdAt), { addSuffix: true })}
          </span>
          <StatusBadge status={delivery.status} />
          {delivery.status === 'FAILED' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(delivery.id) }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <RefreshCw size={11} /> Retry
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-gray-500">ID:</span> <span className="font-mono text-gray-700">{delivery.id}</span></div>
            <div><span className="text-gray-500">Created:</span> <span className="text-gray-700">{format(new Date(delivery.createdAt), 'MMM d, yyyy HH:mm:ss')}</span></div>
            {delivery.lastAttemptAt && (
              <div><span className="text-gray-500">Last attempt:</span> <span className="text-gray-700">{format(new Date(delivery.lastAttemptAt), 'HH:mm:ss')}</span></div>
            )}
            <div><span className="text-gray-500">Endpoint:</span> <span className="font-mono text-gray-700 break-all">{delivery.url}</span></div>
          </div>
          {delivery.payload && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Payload</p>
              <JsonViewer data={delivery.payload} />
            </div>
          )}
          {delivery.responseBody && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Response Body</p>
              <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono text-gray-700 max-h-32 overflow-auto">
                {delivery.responseBody}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const WebhookLogs: React.FC = () => {
  const currentNamespace = useNamespaceStore(s => s.currentNamespace)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true)
      try {
        const [d, s] = await Promise.all([listWebhookDeliveries(), getWebhookStats()])
        setDeliveries(Array.isArray(d) ? d : (d?.content ?? []))
        setStats(s)
      } catch {
        setDeliveries(MOCK_DELIVERIES)
        setStats(MOCK_STATS)
      } finally {
        setIsLoading(false)
      }
    }
    fetch()
  }, [currentNamespace])

  const handleRetry = async (id: string) => {
    try {
      await retryWebhookDelivery(id)
      setDeliveries((prev) => prev.map((d) => d.id === id ? { ...d, status: 'PENDING', attempts: d.attempts + 1 } : d))
    } catch { /* ignore */ }
  }

  const filtered = statusFilter ? deliveries.filter((d) => d.status === statusFilter) : deliveries

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><Spinner size="lg" label="Loading webhook logs..." /></div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Delivery history and retry management</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Deliveries', value: stats.totalDeliveries.toLocaleString(), icon: <Webhook size={16} />, color: 'text-blue-600' },
            { label: 'Success Rate', value: `${stats.successRate}%`, icon: <CheckCircle2 size={16} />, color: 'text-green-600' },
            { label: 'Failed', value: stats.failedCount, icon: <XCircle size={16} />, color: 'text-red-600' },
            { label: 'Pending', value: stats.pendingCount, icon: <Clock size={16} />, color: 'text-yellow-600' },
            { label: 'Avg Response', value: `${stats.avgResponseTimeMs}ms`, icon: <Clock size={16} />, color: 'text-purple-600' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className={`mb-2 ${color}`}>{icon}</div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['', 'SUCCESS', 'FAILED', 'PENDING'].map((status) => (
          <button
            key={status || 'all'}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === status ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Deliveries */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Webhook size={40} className="text-gray-300 mb-3" />
          <p className="text-gray-400">No webhook deliveries found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DeliveryRow key={d.id} delivery={d} onRetry={handleRetry} />
          ))}
        </div>
      )}
    </div>
  )
}

export default WebhookLogs
