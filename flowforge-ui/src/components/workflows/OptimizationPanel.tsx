import React, { useEffect, useState } from 'react'
import { X, Sparkles, Loader2, RefreshCw, AlertTriangle, Info, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { optimizeWorkflow, type OptimizationResult, type OptimizationSuggestion } from '../../api/aiOptimize'

interface OptimizationPanelProps {
  open: boolean
  onClose: () => void
  workflowId: string
}

const severityStyles: Record<OptimizationSuggestion['severity'], { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  INFO:     { bg: 'bg-gray-100',  text: 'text-gray-700',  border: 'border-gray-200',  icon: <Info size={12} /> },
  WARN:     { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle size={12} /> },
  CRITICAL: { bg: 'bg-red-100',   text: 'text-red-700',   border: 'border-red-200',   icon: <AlertCircle size={12} /> },
}

const typeLabels: Record<OptimizationSuggestion['type'], string> = {
  RETRY_TUNING:     'Retry Tuning',
  TIMEOUT_TUNING:   'Timeout Tuning',
  PARALLELIZATION:  'Parallelization',
  DEAD_BRANCH:      'Dead Branch',
  RATE_LIMIT_RISK:  'Rate Limit Risk',
  SCHEMA_MISMATCH:  'Schema Mismatch',
}

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({ open, onClose, workflowId }) => {
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const loadOptimization = async () => {
    setIsLoading(true)
    setError(null)
    setDismissed(new Set())
    setExpanded(new Set())
    try {
      const res = await optimizeWorkflow(workflowId)
      setResult(res)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to analyze workflow.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && workflowId) loadOptimization()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workflowId])

  if (!open) return null

  const visibleSuggestions = (result?.suggestions ?? []).filter((_, idx) => !dismissed.has(idx))

  const toggleExpanded = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const dismiss = (idx: number) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(idx)
      return next
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-1.5">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Workflow Optimization</h2>
              <p className="text-[11px] text-gray-500">AI-powered suggestions</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={loadOptimization}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50"
              title="Re-analyze"
            >
              <RefreshCw size={15} className={clsx(isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Loader2 size={28} className="animate-spin mb-3 text-blue-600" />
              <p className="text-sm">Analyzing executions...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="m-5 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && result && (
            <>
              {/* Summary */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
                <p className="text-[11px] text-gray-400 mt-2">
                  Analyzed {result.sampleSize} executions · {new Date(result.analyzedAt).toLocaleString()}
                </p>
              </div>

              {/* Suggestions */}
              <div className="p-5 space-y-3">
                {visibleSuggestions.length === 0 ? (
                  <div className="text-center py-10 text-sm text-gray-400">
                    No suggestions available.
                  </div>
                ) : (
                  result.suggestions.map((s, idx) => {
                    if (dismissed.has(idx)) return null
                    const style = severityStyles[s.severity]
                    const isExpanded = expanded.has(idx)
                    return (
                      <div
                        key={idx}
                        className={clsx('rounded-xl border bg-white p-4', style.border)}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide', style.bg, style.text)}>
                              {style.icon}
                              {s.severity}
                            </span>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                              {typeLabels[s.type]}
                            </span>
                            {s.stepId && (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono text-gray-600 bg-gray-100">
                                {s.stepId}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => dismiss(idx)}
                            className="text-[11px] text-gray-400 hover:text-red-600 font-medium flex-shrink-0"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="text-sm text-gray-800 font-medium mb-1.5">{s.description}</p>
                        <button
                          onClick={() => toggleExpanded(idx)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                        >
                          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {isExpanded ? 'Hide rationale' : 'Show rationale'}
                        </button>
                        {isExpanded && (
                          <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                            {s.rationale}
                          </p>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

export default OptimizationPanel
