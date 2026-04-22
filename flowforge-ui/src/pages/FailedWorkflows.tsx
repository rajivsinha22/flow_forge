import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw, Trash2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, ExternalLink, History, Loader2, Info, XCircle, RotateCcw,
  AlertCircle, Play, Edit3, ShieldAlert, Pencil, Lock, Repeat, Skull,
} from 'lucide-react'
import {
  listFailedWorkflows, replayFailedWorkflow, replayAllFailedWorkflows,
  discardFailedWorkflow, getFailedWorkflowStats, type FailedWorkflowStats,
} from '../api/failedWorkflows'
import type { FailedWorkflow, ReplayAttempt, StepRetryAttempt } from '../types'
import { useAuthStore } from '../store/authStore'
import { useNamespaceStore } from '../store/namespaceStore'
import StatusBadge from '../components/shared/StatusBadge'
import ConfirmModal from '../components/shared/ConfirmModal'
import Spinner from '../components/shared/Spinner'
import JsonViewer from '../components/shared/JsonViewer'
import { formatDistanceToNow, format } from 'date-fns'

const isDummy = import.meta.env.VITE_DUMMY_MODE === 'true'

// ─────────────────────────────────────────────────────────────────────────────
// Permission helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the current user is allowed to edit execution context before replay.
 * Gate: user must have ADMIN role OR the fine-grained failed-workflows:write permission.
 */
function canEditContext(roles: string[]): boolean {
  return roles.includes('CLIENT_ADMIN') || roles.includes('failed-workflows:write')
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data (demo / dummy mode)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_FAILED_WORKFLOWS: FailedWorkflow[] = [
  {
    id: 'dlq-001', clientId: 'client-1', executionId: 'ex-003',
    workflowId: 'wf-1', workflowName: 'invoice-sync',
    stepId: 'fetch-invoice', stepName: 'Fetch Invoice', stepType: 'HTTP',
    failureReason: 'Connection timeout after 30000ms to https://billing.acme.io/invoices',
    retryCount: 3, status: 'PENDING',
    failedAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: 'Connection timeout after 30000ms', failedAt: new Date(Date.now() - 420000).toISOString(), durationMs: 30012 },
      { attemptNumber: 2, errorMessage: 'Connection timeout after 30000ms', failedAt: new Date(Date.now() - 380000).toISOString(), durationMs: 30008 },
      { attemptNumber: 3, errorMessage: 'Connection timeout after 30000ms', failedAt: new Date(Date.now() - 340000).toISOString(), durationMs: 30015 },
    ],
    replayHistory: [],
    executionContext: { stepOutputs: { 'validate-order': { valid: true } }, variables: { env: 'prod' }, input: { invoiceId: 'INV-4421' } },
    payload: { invoiceId: 'INV-4421', customerId: 'CUST-123' },
  },
  {
    id: 'dlq-002', clientId: 'client-1', executionId: 'ex-010',
    workflowId: 'wf-2', workflowName: 'data-pipeline',
    stepId: 'transform-records', stepName: 'Transform Records', stepType: 'SCRIPT',
    failureReason: "NullPointerException: Cannot read property 'id' of null at transform-records",
    retryCount: 1, status: 'PENDING',
    failedAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: "NullPointerException: Cannot read property 'id' of null", failedAt: new Date(Date.now() - 900000).toISOString(), durationMs: 124 },
    ],
    replayHistory: [],
    payload: { batchId: 'BATCH-889', recordCount: 245 },
  },
  {
    id: 'dlq-003', clientId: 'client-1', executionId: 'ex-015',
    workflowId: 'wf-4', workflowName: 'notification-dispatch',
    stepId: 'send-slack', stepName: 'Send Slack Alert', stepType: 'HTTP',
    failureReason: 'Slack API rate limit exceeded (429 Too Many Requests)',
    retryCount: 5, status: 'REPLAYING',
    failedAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 30000).toISOString(),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: '429 Too Many Requests', failedAt: new Date(Date.now() - 1900000).toISOString(), durationMs: 340 },
      { attemptNumber: 2, errorMessage: '429 Too Many Requests', failedAt: new Date(Date.now() - 1860000).toISOString(), durationMs: 310 },
      { attemptNumber: 3, errorMessage: '429 Too Many Requests — retry-after: 60s', failedAt: new Date(Date.now() - 1800000).toISOString(), durationMs: 295 },
    ],
    replayHistory: [
      { replayedBy: 'admin@acme.io', result: 'FAILED', errorMessage: '429 rate limit', replayedAt: new Date(Date.now() - 60000).toISOString(), contextWasModified: false },
    ],
    payload: { channel: '#alerts', message: 'Deploy completed' },
  },
  {
    id: 'dlq-004', clientId: 'client-1', executionId: 'ex-019',
    workflowId: 'wf-1', workflowName: 'order-processing',
    stepId: 'validate-order', stepName: 'Validate Order', stepType: 'HTTP',
    failureReason: 'HTTP 503 Service Unavailable from https://api.orders.io/validate',
    retryCount: 2, status: 'RESOLVED',
    failedAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3000000).toISOString(),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: '503 Service Unavailable', failedAt: new Date(Date.now() - 3700000).toISOString(), durationMs: 502 },
      { attemptNumber: 2, errorMessage: '503 Service Unavailable', failedAt: new Date(Date.now() - 3650000).toISOString(), durationMs: 489 },
    ],
    replayHistory: [
      { replayedBy: 'system', result: 'FAILED', errorMessage: '503 again', replayedAt: new Date(Date.now() - 3300000).toISOString(), contextWasModified: false },
      { replayedBy: 'admin@acme.io', result: 'SUCCESS', replayedAt: new Date(Date.now() - 3000000).toISOString(), contextWasModified: false },
    ],
  },
  {
    id: 'dlq-005', clientId: 'client-1', executionId: 'ex-022',
    workflowId: 'wf-1', workflowName: 'invoice-sync',
    stepId: 'send-email', stepName: 'Send Email', stepType: 'HTTP',
    failureReason: 'SMTP authentication failed: 535 Authentication credentials invalid',
    retryCount: 3, status: 'DISCARDED',
    failedAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7000000).toISOString(),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: '535 Authentication credentials invalid', failedAt: new Date(Date.now() - 7300000).toISOString(), durationMs: 612 },
      { attemptNumber: 2, errorMessage: '535 Authentication credentials invalid', failedAt: new Date(Date.now() - 7250000).toISOString(), durationMs: 598 },
      { attemptNumber: 3, errorMessage: '535 Authentication credentials invalid', failedAt: new Date(Date.now() - 7200000).toISOString(), durationMs: 601 },
    ],
    replayHistory: [
      { replayedBy: 'admin@acme.io', result: 'FAILED', errorMessage: 'SMTP auth still failing', replayedAt: new Date(Date.now() - 7100000).toISOString(), contextWasModified: false },
    ],
  },
  {
    // All-failed demo — every replay attempt also failed, last one used modified context
    id: 'dlq-006', clientId: 'client-1', executionId: 'ex-029',
    workflowId: 'wf-2', workflowName: 'payment-flow',
    stepId: 'charge-card', stepName: 'Charge Card', stepType: 'HTTP',
    failureReason: 'SSL certificate verification failed: certificate has expired for billing.acme.io',
    retryCount: 5, status: 'PENDING',
    failedAt: new Date(Date.now() - 4320000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    retryAttempts: [
      { attemptNumber: 1, errorMessage: 'SSL certificate verification failed', failedAt: new Date(Date.now() - 4420000).toISOString(), durationMs: 1520 },
      { attemptNumber: 2, errorMessage: 'SSL certificate verification failed', failedAt: new Date(Date.now() - 4370000).toISOString(), durationMs: 1488 },
      { attemptNumber: 3, errorMessage: 'certificate has expired — CN=billing.acme.io, expired 2026-01-01', failedAt: new Date(Date.now() - 4320000).toISOString(), durationMs: 1510 },
    ],
    replayHistory: [
      { replayedBy: 'admin@acme.io', result: 'FAILED', errorMessage: 'SSL certificate verification failed', replayedAt: new Date(Date.now() - 4200000).toISOString(), contextWasModified: false },
      { replayedBy: 'system', result: 'FAILED', errorMessage: 'SSL certificate verification failed', replayedAt: new Date(Date.now() - 3600000).toISOString(), contextWasModified: false },
      { replayedBy: 'admin@acme.io', result: 'FAILED', errorMessage: 'certificate has expired — CN=billing.acme.io', replayedAt: new Date(Date.now() - 1800000).toISOString(), contextWasModified: true },
    ],
    executionContext: {
      stepOutputs: { 'validate-card': { valid: true, last4: '4242' } },
      variables: { paymentGatewayUrl: 'https://billing.acme.io/charge', currency: 'USD' },
      input: { orderId: 'ORD-8821', amount: 249.99 },
    },
    payload: { orderId: 'ORD-8821', amount: 249.99, currency: 'USD' },
  },
]

const MOCK_STATS: FailedWorkflowStats = { pending: 3, replaying: 1, resolved: 1, discarded: 1 }

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; icon: React.ReactNode; rowBorder: string
  badgeBg: string; badgeText: string
}> = {
  PENDING: {
    label: 'Pending', icon: <AlertCircle size={14} />,
    rowBorder: 'border-red-200',
    badgeBg: 'bg-red-50', badgeText: 'text-red-700',
  },
  REPLAYING: {
    label: 'Replaying', icon: <Loader2 size={14} className="animate-spin" />,
    rowBorder: 'border-amber-200',
    badgeBg: 'bg-amber-50', badgeText: 'text-amber-700',
  },
  RESOLVED: {
    label: 'Resolved', icon: <CheckCircle2 size={14} />,
    rowBorder: 'border-green-100',
    badgeBg: 'bg-green-50', badgeText: 'text-green-700',
  },
  DISCARDED: {
    label: 'Discarded', icon: <XCircle size={14} />,
    rowBorder: 'border-gray-100',
    badgeBg: 'bg-gray-100', badgeText: 'text-gray-500',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ContextEditModal
// ─────────────────────────────────────────────────────────────────────────────

interface ContextEditModalProps {
  msg: FailedWorkflow
  isLoading: boolean
  onReplay: (context: Record<string, unknown>) => void
  onClose: () => void
}

const ContextEditModal: React.FC<ContextEditModalProps> = ({ msg, isLoading, onReplay, onClose }) => {
  const original = JSON.stringify(msg.executionContext ?? {}, null, 2)
  const [json, setJson] = useState(original)
  const [jsonError, setJsonError] = useState('')
  const [isModified, setIsModified] = useState(false)

  const handleChange = (val: string) => {
    setJson(val)
    setIsModified(val !== original)
    try {
      JSON.parse(val)
      setJsonError('')
    } catch (e) {
      setJsonError((e as Error).message)
    }
  }

  const handleReplay = () => {
    if (jsonError) return
    try {
      onReplay(JSON.parse(json))
    } catch {
      setJsonError('Invalid JSON — cannot replay')
    }
  }

  const handleReset = () => {
    setJson(original)
    setIsModified(false)
    setJsonError('')
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Edit3 size={16} className="text-amber-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Edit Context &amp; Replay</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {msg.workflowName} → <span className="font-medium">{msg.stepName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <XCircle size={16} />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <ShieldAlert size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Admin-only action.</strong> Edit the execution context JSON that will be passed to the step.
            You can fix variables, step outputs, or input values before replaying.
            The original context is preserved — your changes only apply to this replay attempt.
            All edits are recorded in the replay audit history.
          </p>
        </div>

        {/* Structure guide */}
        <div className="mx-6 mt-3 grid grid-cols-3 gap-2">
          {[
            { key: 'input', desc: 'Workflow trigger payload' },
            { key: 'variables', desc: 'Workflow-level variables' },
            { key: 'stepOutputs', desc: 'Outputs of completed steps' },
          ].map(({ key, desc }) => (
            <div key={key} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <code className="text-[11px] font-mono font-semibold text-blue-700">{key}</code>
              <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-700">Execution Context JSON</label>
            <div className="flex items-center gap-2">
              {isModified && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                  Modified
                </span>
              )}
              {isModified && (
                <button
                  onClick={handleReset}
                  className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Reset to original
                </button>
              )}
            </div>
          </div>
          <textarea
            value={json}
            onChange={e => handleChange(e.target.value)}
            className={`w-full h-64 font-mono text-xs border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 resize-none leading-relaxed ${
              jsonError
                ? 'border-red-400 focus:ring-red-400 bg-red-50'
                : isModified
                ? 'border-amber-400 focus:ring-amber-400 bg-amber-50/30'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            spellCheck={false}
          />
          {jsonError && (
            <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
              <AlertCircle size={12} /> {jsonError}
            </p>
          )}
          {!jsonError && isModified && (
            <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1.5">
              <Pencil size={11} /> Context will be overridden for this replay — change is recorded in audit history.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReplay(JSON.parse(original))}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
              title="Replay with the original stored context, ignoring any edits"
            >
              <RotateCcw size={12} /> Replay with original
            </button>
            <button
              onClick={handleReplay}
              disabled={isLoading || !!jsonError}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading
                ? <><Loader2 size={13} className="animate-spin" /> Replaying…</>
                : <><Play size={13} /> {isModified ? 'Replay with modified context' : 'Replay'}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ReplayHistoryRow
// ─────────────────────────────────────────────────────────────────────────────

const ReplayHistoryRow: React.FC<{ attempt: ReplayAttempt; index: number; total: number }> = ({
  attempt, index, total,
}) => (
  <div className="flex items-start gap-3">
    {/* Timeline dot + connector */}
    <div className="flex flex-col items-center flex-shrink-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
        attempt.result === 'SUCCESS' ? 'bg-green-500' : 'bg-red-400'
      }`}>
        {index + 1}
      </div>
      {index < total - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />}
    </div>

    <div className="flex-1 pb-3">
      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
        <span className={`text-xs font-semibold ${attempt.result === 'SUCCESS' ? 'text-green-700' : 'text-red-600'}`}>
          {attempt.result === 'SUCCESS' ? 'Succeeded' : 'Failed'}
        </span>
        <span className="text-[10px] text-gray-400">by {attempt.replayedBy}</span>
        {attempt.contextWasModified && (
          <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
            <Pencil size={8} /> modified context
          </span>
        )}
        <span className="text-[10px] text-gray-300 ml-auto">
          {formatDistanceToNow(new Date(attempt.replayedAt), { addSuffix: true })}
        </span>
      </div>
      {attempt.errorMessage && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 font-mono mt-1 break-all">
          {attempt.errorMessage}
        </p>
      )}
    </div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// FullErrorTimeline
// Shows the complete error trail: execution auto-retries → dead-lettered →
// manual replay attempts. Each phase is visually separated.
// ─────────────────────────────────────────────────────────────────────────────

interface FullErrorTimelineProps {
  retryAttempts: StepRetryAttempt[]
  replayHistory: ReplayAttempt[]
  maxAutoRetries: number
}

const FullErrorTimeline: React.FC<FullErrorTimelineProps> = ({
  retryAttempts, replayHistory, maxAutoRetries,
}) => {
  const totalItems = retryAttempts.length + replayHistory.length
  if (totalItems === 0) return null

  let globalIdx = 0

  return (
    <div className="space-y-0">
      {/* ── Phase 1: execution engine auto-retries ─────────────────────────── */}
      {retryAttempts.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Repeat size={10} className="text-orange-500" />
            <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-widest">
              Execution Retry History ({retryAttempts.length}/{maxAutoRetries} attempts)
            </span>
          </div>
          {retryAttempts.map((a, i) => {
            const isLast = i === retryAttempts.length - 1
            const itemIdx = globalIdx++
            return (
              <div key={`retry-${i}`} className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold bg-orange-400 flex-shrink-0">
                    {a.attemptNumber}
                  </div>
                  {itemIdx < totalItems - 1 && (
                    <div className={`w-px flex-1 mt-1 min-h-[14px] ${
                      isLast && replayHistory.length > 0 ? 'bg-gray-300 border-dashed' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
                <div className="flex-1 pb-2.5">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-semibold text-orange-700">
                      Auto-retry {a.attemptNumber}/{maxAutoRetries}
                      {isLast ? <span className="ml-1 text-red-600">→ Failed</span> : ''}
                    </span>
                    {a.durationMs != null && a.durationMs > 0 && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <Clock size={9} />{a.durationMs}ms
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300 ml-auto">
                      {formatDistanceToNow(new Date(a.failedAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-700 bg-orange-50 border border-orange-100 rounded px-2 py-1 font-mono break-all">
                    {a.errorMessage}
                  </p>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* Phase divider */}
      {retryAttempts.length > 0 && replayHistory.length > 0 && (
        <div className="flex items-center gap-2 my-3">
          <div className="flex-1 border-t border-dashed border-gray-200" />
          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
            <Skull size={9} /> Moved to Failed Workflows · manual replays below
          </span>
          <div className="flex-1 border-t border-dashed border-gray-200" />
        </div>
      )}

      {/* ── Phase 2: manual replay attempts ──────────────────────────────────── */}
      {replayHistory.length > 0 && (
        <>
          {retryAttempts.length === 0 && (
            <div className="flex items-center gap-2 mb-2">
              <History size={10} className="text-blue-500" />
              <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest">
                Manual Replay History
              </span>
            </div>
          )}
          {replayHistory.map((attempt, i) => {
            const itemIdx = globalIdx++
            return (
              <div key={`replay-${i}`} className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                    attempt.result === 'SUCCESS' ? 'bg-green-500' : 'bg-red-400'
                  }`}>
                    {i + 1}
                  </div>
                  {itemIdx < totalItems - 1 && (
                    <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[14px]" />
                  )}
                </div>
                <div className="flex-1 pb-2.5">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-xs font-semibold ${attempt.result === 'SUCCESS' ? 'text-green-700' : 'text-red-600'}`}>
                      {attempt.result === 'SUCCESS' ? 'Replay succeeded' : 'Replay failed'}
                    </span>
                    <span className="text-[10px] text-gray-400">by {attempt.replayedBy}</span>
                    {attempt.contextWasModified && (
                      <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                        <Pencil size={8} /> modified context
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300 ml-auto">
                      {formatDistanceToNow(new Date(attempt.replayedAt), { addSuffix: true })}
                    </span>
                  </div>
                  {attempt.errorMessage && (
                    <p className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1 font-mono mt-0.5 break-all">
                      {attempt.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FailedWorkflowRow
// ─────────────────────────────────────────────────────────────────────────────

interface FailedWorkflowRowProps {
  msg: FailedWorkflow
  replayingId: string | null
  hasEditPermission: boolean
  onReplay: (msg: FailedWorkflow) => void
  onEditReplay: (msg: FailedWorkflow) => void
  onDiscard: (msg: FailedWorkflow) => void
}

const FailedWorkflowRow: React.FC<FailedWorkflowRowProps> = ({
  msg, replayingId, hasEditPermission, onReplay, onEditReplay, onDiscard,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const cfg = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.PENDING
  const isReplaying = replayingId === msg.id

  const replayHistory = msg.replayHistory ?? []
  const retryAttempts = msg.retryAttempts ?? []
  const allReplaysFailed = replayHistory.length > 0 && replayHistory.every(a => a.result === 'FAILED')
  const failedReplayCount = replayHistory.filter(a => a.result === 'FAILED').length
  const allFailed = allReplaysFailed
  const failedCount = failedReplayCount
  const hasHistory = retryAttempts.length > 0 || replayHistory.length > 0

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-all shadow-sm ${
      expanded ? `${cfg.rowBorder} shadow-md` : `border-gray-100 hover:border-gray-200`
    }`}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-300 flex-shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        <span className={`flex-shrink-0 ${cfg.badgeText}`}>{cfg.icon}</span>

        {/* Workflow / step info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{msg.workflowName}</span>
            <ChevronRight size={11} className="text-gray-300 flex-shrink-0" />
            <span className="text-sm text-gray-600 truncate">{msg.stepName}</span>
            {msg.stepType && (
              <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded flex-shrink-0">
                {msg.stepType}
              </span>
            )}
            {allFailed && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex-shrink-0">
                <AlertTriangle size={9} /> {failedCount} failed attempt{failedCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-red-500 truncate mt-0.5">{msg.failureReason}</p>
        </div>

        {/* Right meta + actions */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <span className="hidden sm:block text-[11px] text-gray-400">{msg.retryCount} retries</span>
          <span className="hidden md:block text-[11px] text-gray-400">
            {formatDistanceToNow(new Date(msg.failedAt), { addSuffix: true })}
          </span>

          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${cfg.badgeBg} ${cfg.badgeText}`}>
            {msg.status === 'REPLAYING' ? <Loader2 size={10} className="animate-spin" /> : null}
            {cfg.label}
          </span>

          {msg.status === 'PENDING' && (
            <>
              <button
                onClick={() => onReplay(msg)}
                disabled={isReplaying}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                title="Replay with original context"
              >
                {isReplaying ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                Replay
              </button>

              {hasEditPermission ? (
                <button
                  onClick={() => onEditReplay(msg)}
                  disabled={isReplaying}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                  title="Edit execution context before replaying"
                >
                  <Edit3 size={11} /> Edit &amp; Replay
                </button>
              ) : (
                <span
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg cursor-not-allowed"
                  title="Requires ADMIN role or failed-workflows:write permission"
                >
                  <Lock size={11} /> Edit &amp; Replay
                </span>
              )}

              <button
                onClick={() => onDiscard(msg)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                title="Discard — no further replay"
              >
                <Trash2 size={11} /> Discard
              </button>
            </>
          )}

          {msg.status === 'REPLAYING' && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> In progress…
            </span>
          )}
        </div>
      </div>

      {/* ── Expanded detail ─────────────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">

          {/* All-failed warning banner */}
          {allFailed && msg.status === 'PENDING' && (
            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2.5">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700">
                <span className="font-semibold">All {failedCount} replay attempt{failedCount !== 1 ? 's' : ''} failed.</span>
                {' '}The root cause has persisted across every retry.
                {hasEditPermission
                  ? ' Consider editing the execution context to patch variables or step outputs before attempting again.'
                  : ' An admin with ADMIN role or failed-workflows:write permission can edit the context to patch variables before retrying.'
                }
              </div>
            </div>
          )}

          {/* Meta grid */}
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-gray-400 block mb-0.5">Execution</span>
              <Link
                to={`/executions/${msg.executionId}`}
                className="font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate"
                onClick={e => e.stopPropagation()}
              >
                {msg.executionId.slice(0, 12)}…
                <ExternalLink size={10} className="flex-shrink-0" />
              </Link>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Step ID</span>
              <span className="font-mono text-gray-700">{msg.stepId || msg.stepName}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Failed at</span>
              <span className="text-gray-700">{format(new Date(msg.failedAt), 'MMM d HH:mm:ss')}</span>
            </div>
            <div>
              <span className="text-gray-400 block mb-0.5">Retry attempts</span>
              <span className={`font-semibold ${allFailed ? 'text-red-600' : 'text-gray-700'}`}>{msg.retryCount}</span>
            </div>
          </div>

          {/* Failure reason */}
          <div className="px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
              <AlertTriangle size={11} className="text-red-400" /> Failure Reason
            </p>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700 font-mono leading-relaxed break-all">
              {msg.failureReason}
            </div>
          </div>

          {/* ── Full error history timeline ───────────────────────────────────── */}
          {hasHistory && (
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                  <History size={11} />
                  Full Error History
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    allFailed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {retryAttempts.length + replayHistory.length} total
                  </span>
                </p>
                {/* Summary pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {retryAttempts.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      <Repeat size={9} /> {retryAttempts.length} auto-retries
                    </span>
                  )}
                  {failedCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      <XCircle size={9} /> {failedCount} replay failed
                    </span>
                  )}
                  {replayHistory.filter(a => a.result === 'SUCCESS').length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                      <CheckCircle2 size={9} /> resolved
                    </span>
                  )}
                  {replayHistory.some(a => a.contextWasModified) && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                      <Pencil size={9} /> context edited
                    </span>
                  )}
                </div>
              </div>

              <FullErrorTimeline
                retryAttempts={retryAttempts}
                replayHistory={replayHistory}
                maxAutoRetries={msg.retryCount}
              />
            </div>
          )}

          {/* Execution context toggle */}
          {msg.executionContext && (
            <div className="px-4 py-3">
              <button
                className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 hover:text-gray-700 mb-2"
                onClick={() => setShowContext(!showContext)}
              >
                <Info size={11} />
                Execution Context at Failure
                {showContext ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <span className="text-gray-400 font-normal">(variables, step outputs, input)</span>
              </button>
              {showContext && <JsonViewer data={msg.executionContext} />}
            </div>
          )}

          {/* Payload */}
          {msg.payload && (
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Original Payload</p>
              <JsonViewer data={msg.payload} />
            </div>
          )}

          {/* Footer actions */}
          {msg.status === 'PENDING' && (
            <div className="px-4 py-3 flex items-center gap-3 bg-white flex-wrap">
              <button
                onClick={e => { e.stopPropagation(); onReplay(msg) }}
                disabled={isReplaying}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                <Play size={11} /> Replay Step &amp; Continue Workflow
              </button>

              {hasEditPermission && (
                <button
                  onClick={e => { e.stopPropagation(); onEditReplay(msg) }}
                  disabled={isReplaying}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg disabled:opacity-50"
                >
                  <Edit3 size={11} /> Edit Context &amp; Replay
                </button>
              )}

              <button
                onClick={e => { e.stopPropagation(); onDiscard(msg) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
              >
                <Trash2 size={11} /> Discard
              </button>

              <p className="text-[10px] text-gray-400 ml-auto hidden sm:block">
                Replay resumes the original execution from this step, then continues downstream.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FailedWorkflows
// ─────────────────────────────────────────────────────────────────────────────

type FilterStatus = 'PENDING' | 'REPLAYING' | 'RESOLVED' | 'DISCARDED' | ''

const FailedWorkflows: React.FC = () => {
  const { user } = useAuthStore()
  const userRoles: string[] = user?.roles ?? []
  const hasEditPermission = canEditContext(userRoles)

  const [messages, setMessages] = useState<FailedWorkflow[]>([])
  const [stats, setStats] = useState<FailedWorkflowStats>({ pending: 0, replaying: 0, resolved: 0, discarded: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isReplayingAll, setIsReplayingAll] = useState(false)
  const [replayingId, setReplayingId] = useState<string | null>(null)
  const [discardTarget, setDiscardTarget] = useState<FailedWorkflow | null>(null)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('PENDING')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Context editor modal
  const [editReplayTarget, setEditReplayTarget] = useState<FailedWorkflow | null>(null)
  const [editReplayLoading, setEditReplayLoading] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4500)
  }

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)
    try {
      const [msgs, statsData] = await Promise.all([listFailedWorkflows(), getFailedWorkflowStats()])
      setMessages(Array.isArray(msgs) ? msgs : (msgs?.content ?? []))
      setStats(statsData)
    } catch {
      if (isDummy || !silent) {
        setMessages(MOCK_FAILED_WORKFLOWS)
        setStats(MOCK_STATS)
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const currentNamespace = useNamespaceStore(s => s.currentNamespace)
  useEffect(() => { loadData() }, [loadData, currentNamespace])

  // ── Replay (original context) ───────────────────────────────────────────────

  const handleReplay = async (msg: FailedWorkflow, contextOverride?: Record<string, unknown>) => {
    setReplayingId(msg.id)
    try {
      const updated = await replayFailedWorkflow(msg.id, contextOverride)
      setMessages(prev => prev.map(m => m.id === msg.id ? updated : m))
      try { const s = await getFailedWorkflowStats(); setStats(s) } catch { /* ignore */ }
      const label = contextOverride ? 'with modified context' : ''
      showToast(`"${msg.stepName}" queued for replay ${label}`.trim())
    } catch (e: unknown) {
      if (isDummy) {
        const contextWasModified = !!contextOverride
        setMessages(prev => prev.map(m => m.id === msg.id ? {
          ...m, status: 'REPLAYING',
          replayHistory: [...(m.replayHistory ?? []), {
            replayedBy: user?.name ?? 'demo-user',
            result: 'SUCCESS' as const,
            replayedAt: new Date().toISOString(),
            contextWasModified,
          }]
        } : m))
        setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), replaying: prev.replaying + 1 }))
        const label = contextOverride ? ' with modified context' : ''
        showToast(`Replay triggered for "${msg.stepName}"${label} (demo mode)`)
      } else {
        showToast(`Failed to replay: ${(e as Error).message}`, 'error')
      }
    } finally {
      setReplayingId(null)
    }
  }

  // ── Replay with edited context ──────────────────────────────────────────────

  const handleEditReplay = async (context: Record<string, unknown>) => {
    if (!editReplayTarget) return
    setEditReplayLoading(true)
    try {
      await handleReplay(editReplayTarget, context)
      setEditReplayTarget(null)
    } finally {
      setEditReplayLoading(false)
    }
  }

  // ── Replay all pending ──────────────────────────────────────────────────────

  const handleReplayAll = async () => {
    const pendingCount = messages.filter(m => m.status === 'PENDING').length
    if (pendingCount === 0) return

    setIsReplayingAll(true)
    try {
      const res = await replayAllFailedWorkflows()
      setMessages(prev => {
        const updatedMap = new Map((res.messages ?? []).map(m => [m.id, m]))
        return prev.map(m => updatedMap.get(m.id) ?? m)
      })
      try { const s = await getFailedWorkflowStats(); setStats(s) } catch { /* ignore */ }
      showToast(`${res.succeeded} of ${res.total} replayed${res.failed > 0 ? `, ${res.failed} failed` : ''}`)
    } catch {
      if (isDummy) {
        setMessages(prev => prev.map(m => m.status === 'PENDING'
          ? { ...m, status: 'REPLAYING', replayHistory: [...(m.replayHistory ?? []), { replayedBy: 'batch', result: 'SUCCESS' as const, replayedAt: new Date().toISOString(), contextWasModified: false }] }
          : m
        ))
        setStats(prev => ({ ...prev, pending: 0, replaying: prev.replaying + pendingCount }))
        showToast(`${pendingCount} entries queued for replay (demo mode)`)
      } else {
        showToast('Batch replay failed — check logs', 'error')
      }
    } finally {
      setIsReplayingAll(false)
    }
  }

  // ── Discard ─────────────────────────────────────────────────────────────────

  const handleDiscard = async () => {
    if (!discardTarget) return
    setIsDiscarding(true)
    try {
      const updated = await discardFailedWorkflow(discardTarget.id)
      setMessages(prev => prev.map(m => m.id === discardTarget.id ? updated : m))
      try { const s = await getFailedWorkflowStats(); setStats(s) } catch { /* ignore */ }
      showToast(`"${discardTarget.stepName}" discarded`)
    } catch {
      if (isDummy) {
        setMessages(prev => prev.map(m => m.id === discardTarget.id ? { ...m, status: 'DISCARDED' } : m))
        setStats(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1), discarded: prev.discarded + 1 }))
        showToast(`"${discardTarget.stepName}" discarded (demo mode)`)
      } else {
        showToast('Failed to discard entry', 'error')
      }
    } finally {
      setIsDiscarding(false)
      setDiscardTarget(null)
    }
  }

  const filtered = filterStatus ? messages.filter(m => m.status === filterStatus) : messages
  const pendingCount = stats.pending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" label="Loading…" />
      </div>
    )
  }

  const FILTER_TABS: { label: string; value: FilterStatus; count: number }[] = [
    { label: 'All', value: '', count: messages.length },
    { label: 'Pending', value: 'PENDING', count: stats.pending },
    { label: 'Replaying', value: 'REPLAYING', count: stats.replaying },
    { label: 'Resolved', value: 'RESOLVED', count: stats.resolved },
    { label: 'Discarded', value: 'DISCARDED', count: stats.discarded },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
          {toast.message}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Failed Workflows</h1>
          <p className="text-gray-500 text-sm mt-1">
            Steps that exhausted all retries — replay to resume or discard to acknowledge
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          {pendingCount > 0 && (
            <button
              onClick={handleReplayAll}
              disabled={isReplayingAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {isReplayingAll
                ? <><Loader2 size={14} className="animate-spin" /> Replaying…</>
                : <><RotateCcw size={14} /> Replay All Pending ({pendingCount})</>
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Permission notice ──────────────────────────────────────────────── */}
      <div className={`rounded-xl px-4 py-3 mb-4 flex items-start gap-3 border ${
        hasEditPermission
          ? 'bg-amber-50 border-amber-100'
          : 'bg-gray-50 border-gray-100'
      }`}>
        {hasEditPermission
          ? <Edit3 size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          : <Lock size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
        }
        <p className="text-xs leading-relaxed">
          {hasEditPermission ? (
            <span className="text-amber-800">
              <strong>Admin access active.</strong> You can edit the execution context before replaying any entry.
              Use <strong>Edit &amp; Replay</strong> to patch variables or step outputs when the original context
              is causing the failure.
            </span>
          ) : (
            <span className="text-gray-500">
              <strong>Standard access.</strong> You can replay entries with their original context.
              Editing the execution context requires the <code className="bg-gray-100 px-1 rounded text-gray-700">ADMIN</code> role
              or <code className="bg-gray-100 px-1 rounded text-gray-700">failed-workflows:write</code> permission.
            </span>
          )}
        </p>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Pending',   value: stats.pending,   color: 'text-red-600',   bg: 'bg-red-50 border-red-100',     icon: <AlertCircle size={16} className="text-red-400" /> },
          { label: 'Replaying', value: stats.replaying, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', icon: <Loader2 size={16} className="text-amber-400" /> },
          { label: 'Resolved',  value: stats.resolved,  color: 'text-green-600', bg: 'bg-green-50 border-green-100', icon: <CheckCircle2 size={16} className="text-green-400" /> },
          { label: 'Discarded', value: stats.discarded, color: 'text-gray-500',  bg: 'bg-gray-50 border-gray-100',   icon: <XCircle size={16} className="text-gray-300" /> },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setFilterStatus(s.label.toUpperCase() as FilterStatus)}
            className={`text-left rounded-2xl border p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${s.bg} ${
              filterStatus === s.label.toUpperCase() ? 'ring-2 ring-blue-400 ring-offset-1' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">{s.icon}</div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── How replay works ──────────────────────────────────────────────── */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
        <Info size={15} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <strong>How replay works:</strong> Clicking <em>Replay</em> re-executes the exact failed step inside
          the original execution using the context captured at the point of failure.
          If the step succeeds, the workflow continues routing through downstream steps automatically.
          If it fails again, the entry returns to <strong>Pending</strong> for another attempt.
          {hasEditPermission && <> Admins can also <strong>Edit &amp; Replay</strong> to patch variables or step outputs before retrying.</>}
        </div>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => setFilterStatus(tab.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterStatus === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              filterStatus === tab.value ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Message list ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-2xl text-center">
          {filterStatus === 'PENDING'
            ? <CheckCircle2 size={40} className="text-green-400 mb-3" />
            : <Clock size={40} className="text-gray-200 mb-3" />
          }
          <p className="text-gray-600 font-semibold">
            {filterStatus === 'PENDING' ? 'All clear! No pending entries.' : `No ${filterStatus?.toLowerCase() || ''} entries.`}
          </p>
          {filterStatus === 'PENDING' && (
            <p className="text-gray-400 text-sm mt-1">Failed steps will appear here when they exhaust all retries.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(msg => (
            <FailedWorkflowRow
              key={msg.id}
              msg={msg}
              replayingId={replayingId}
              hasEditPermission={hasEditPermission}
              onReplay={handleReplay}
              onEditReplay={setEditReplayTarget}
              onDiscard={setDiscardTarget}
            />
          ))}
        </div>
      )}

      {/* ── Context edit modal ─────────────────────────────────────────────── */}
      {editReplayTarget && (
        <ContextEditModal
          msg={editReplayTarget}
          isLoading={editReplayLoading}
          onReplay={handleEditReplay}
          onClose={() => setEditReplayTarget(null)}
        />
      )}

      {/* ── Discard confirm ───────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={!!discardTarget}
        title="Discard Entry"
        message={`Discard the failed step "${discardTarget?.stepName}" from "${discardTarget?.workflowName}"? The original execution will remain FAILED and this entry cannot be replayed.`}
        confirmLabel="Discard"
        variant="danger"
        onConfirm={handleDiscard}
        onCancel={() => setDiscardTarget(null)}
        isLoading={isDiscarding}
      />
    </div>
  )
}

export default FailedWorkflows
