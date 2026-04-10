import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Square, Pause, Play, Globe, BarChart2, Clock, CheckCircle, XCircle, AlertCircle, Sparkles, X } from 'lucide-react';
import { getExecutionTrace, getWaitTokens, resumeWaitState, pauseExecution, cancelExecution, resumeExecution } from '../api/executions';
import { analyzeExecution, type AiAnalysisResult } from '../api/ai';
import { ExecutionTraceDto, StepExecutionDetail, WaitToken } from '../types';
import StatusBadge from '../components/shared/StatusBadge';
import Spinner from '../components/shared/Spinner';
import ExecutionFlowDiagram from '../components/execution/ExecutionFlowDiagram';
import StepDetailPanel from '../components/execution/StepDetailPanel';
import JsonViewer from '../components/shared/JsonViewer';
import { useExecutionMonitor } from '../hooks/useExecutionMonitor';

export default function ExecutionDetail() {
  const { executionId } = useParams<{ executionId: string }>();
  const id = executionId;
  const [trace, setTrace] = useState<ExecutionTraceDto | null>(null);
  const [waitTokens, setWaitTokens] = useState<WaitToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'diagram' | 'timeline' | 'context' | 'modelData'>('diagram');
  const [actionLoading, setActionLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AiAnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);

  // Real-time WebSocket updates
  const { steps: liveSteps, status: liveStatus } = useExecutionMonitor(id || null);

  const loadTrace = useCallback(async () => {
    if (!id) return;
    try {
      const [traceData, tokens] = await Promise.all([
        getExecutionTrace(id),
        getWaitTokens(id),
      ]);
      setTrace(traceData);
      setWaitTokens(tokens || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load execution trace');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadTrace(); }, [loadTrace]);

  // Merge live WebSocket step updates into trace
  useEffect(() => {
    if (!trace || liveSteps.length === 0) return;
    setTrace(prev => {
      if (!prev) return prev;
      const merged = [...prev.stepExecutions];
      liveSteps.forEach((ls: any) => {
        const idx = merged.findIndex(s => s.stepId === ls.stepId);
        if (idx >= 0) merged[idx] = { ...merged[idx], ...ls };
        else merged.push(ls);
      });
      return { ...prev, stepExecutions: merged };
    });
  }, [liveSteps]);

  // Find step execution data; if none exists (step not yet reached), synthesise a
  // minimal PENDING record from the workflow definition so the panel still opens.
  const selectedStep = (() => {
    if (!selectedStepId) return null
    const found = trace?.stepExecutions.find(s => s.stepId === selectedStepId)
    if (found) return found
    const def = trace?.workflowDefinition?.steps.find(s => s.stepId === selectedStepId)
    if (!def) return null
    return {
      id: `pending_${def.stepId}`,
      stepId: def.stepId,
      stepName: def.name,
      stepType: def.type,
      status: 'PENDING',
      startedAt: '',
      resolvedConfig: def.config,
    }
  })()
  const selectedWaitToken = selectedStep
    ? waitTokens.find(t => t.stepId === selectedStep.stepId && t.status === 'WAITING')
    : undefined;

  const handleResumeWait = async (stepId: string, data: Record<string, unknown>) => {
    if (!id) return;
    await resumeWaitState(id, stepId, data);
    await loadTrace();
  };

  const handlePause = async () => {
    if (!id) return;
    setActionLoading(true);
    try { await pauseExecution(id); await loadTrace(); } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    try { await cancelExecution(id); await loadTrace(); } finally { setActionLoading(false); }
  };

  const handleResume = async () => {
    if (!id) return;
    setActionLoading(true);
    try { await resumeExecution(id); await loadTrace(); } finally { setActionLoading(false); }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzeLoading(true);
    setAnalyzeError('');
    try {
      const result = await analyzeExecution(id);
      setAnalyzeResult(result);
      setShowAnalysisPanel(true);
    } catch (e: any) {
      setAnalyzeError(e.message || 'Analysis failed');
    } finally {
      setAnalyzeLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  if (error || !trace) return <div className="p-8 text-red-600">{error || 'Not found'}</div>;

  const exec = trace.execution;
  const stats = trace.stats;
  const isRunning = exec.status === 'RUNNING';
  const isPaused = exec.status === 'PAUSED';
  const hasDiagram = (trace.workflowDefinition?.steps?.length ?? 0) > 0;

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className={`flex-1 min-w-0 overflow-y-auto ${selectedStepId ? 'mr-[520px]' : ''}`}>
        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/executions" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-mono text-sm font-semibold text-gray-700 truncate">{exec.id}</h1>
                  <StatusBadge status={exec.status} />
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {exec.workflowName} v{exec.workflowVersion} · Triggered by {exec.triggerType}
                  {exec.triggeredBy && ` · ${exec.triggeredBy}`}
                  {exec.startedAt && ` · ${new Date(exec.startedAt).toLocaleString()}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={loadTrace} className="p-2 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                <RefreshCw size={16} />
              </button>
              {exec.status === 'FAILED' && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  title="Use Claude AI to explain why this execution failed"
                >
                  <Sparkles size={14} className={analyzeLoading ? 'animate-pulse' : ''} />
                  {analyzeLoading ? 'Analyzing…' : 'Explain Failure'}
                </button>
              )}
              {isRunning && (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-sm rounded"
                >
                  <Pause size={14} /> Pause
                </button>
              )}
              {isPaused && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded"
                >
                  <Play size={14} /> Resume
                </button>
              )}
              {(isRunning || isPaused) && (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded"
                >
                  <Square size={14} /> Cancel
                </button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: 'Total',    value: stats.totalSteps,      color: 'text-gray-700'   },
              { label: 'Success',  value: stats.successSteps,    color: 'text-green-600'  },
              { label: 'Failed',   value: stats.failedSteps,     color: 'text-red-600'    },
              { label: 'Skipped',  value: stats.skippedSteps,    color: 'text-gray-400'   },
              { label: 'Pending',  value: stats.pendingSteps,    color: 'text-gray-400'   },
              { label: 'Waiting',  value: stats.waitingSteps,    color: 'text-yellow-600' },
              { label: 'HTTP',     value: stats.totalHttpCalls,  color: 'text-blue-600'   },
              { label: 'Duration', value: `${stats.totalDurationMs}ms`, color: 'text-gray-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* AI Error analysis */}
          {analyzeError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <XCircle size={14} className="shrink-0" />
              {analyzeError}
              <button onClick={() => setAnalyzeError('')} className="ml-auto text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </div>
          )}
          {showAnalysisPanel && analyzeResult && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-indigo-900">AI Failure Analysis</h3>
                    <p className="text-xs text-indigo-500">Powered by Claude</p>
                  </div>
                </div>
                <button onClick={() => setShowAnalysisPanel(false)} className="text-indigo-300 hover:text-indigo-600 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mb-1.5">Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{analyzeResult.summary}</p>
                </div>
                <div className="border-t border-indigo-100 pt-3">
                  <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mb-1.5">Root Cause</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{analyzeResult.rootCause}</p>
                </div>
                {analyzeResult.suggestions?.length > 0 && (
                  <div className="border-t border-indigo-100 pt-3">
                    <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mb-2">Suggested Fixes</p>
                    <ol className="space-y-2">
                      {analyzeResult.suggestions.map((s, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-700">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs: Diagram | Timeline | Context */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200 px-4">
              {([
                'diagram', 'timeline', 'context',
                ...(exec.modelRecordId || exec.modelDataSnapshot ? ['modelData'] as const : []),
              ] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMainTab(tab as any)}
                  className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 capitalize transition-colors ${
                    activeMainTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'diagram' ? '🗺 Diagram' : tab === 'timeline' ? '⏱ Timeline' : tab === 'context' ? '🔤 Context' : '📦 Model Data'}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeMainTab === 'diagram' && hasDiagram && (
                <ExecutionFlowDiagram
                  stepDefs={trace.workflowDefinition!.steps}
                  edgeDefs={trace.workflowDefinition!.edges || []}
                  stepExecutions={trace.stepExecutions}
                  onSelectStep={setSelectedStepId}
                  selectedStepId={selectedStepId || undefined}
                />
              )}
              {activeMainTab === 'diagram' && !hasDiagram && (
                <div className="text-center py-12 text-gray-400">
                  <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                  <div>No workflow definition available for this execution.</div>
                  <div className="text-xs mt-1">Switch to Timeline view to see step details.</div>
                </div>
              )}

              {activeMainTab === 'timeline' && (
                <div className="space-y-2">
                  {trace.stepExecutions.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No steps recorded yet.</div>
                  )}
                  {trace.stepExecutions.map(step => (
                    <StepTimelineRow
                      key={step.id}
                      step={step}
                      isSelected={selectedStepId === step.stepId}
                      hasWaitToken={!!waitTokens.find(t => t.stepId === step.stepId && t.status === 'WAITING')}
                      onClick={() => setSelectedStepId(selectedStepId === step.stepId ? null : step.stepId)}
                    />
                  ))}
                </div>
              )}

              {activeMainTab === 'context' && (
                <div>
                  {trace.executionContext && Object.keys(trace.executionContext).length > 0
                    ? <JsonViewer data={trace.executionContext} />
                    : <div className="text-center py-8 text-gray-400">No execution context available.</div>}
                </div>
              )}

              {activeMainTab === 'modelData' && (
                <ModelDataTab
                  modelRecordId={exec.modelRecordId}
                  dataSyncMode={exec.dataSyncMode}
                  modelDataSnapshot={exec.modelDataSnapshot}
                  modelDataAfter={exec.modelDataAfter}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Step detail panel */}
      {selectedStepId && (
        <StepDetailPanel
          step={selectedStep}
          waitToken={selectedWaitToken}
          onClose={() => setSelectedStepId(null)}
          onResumeWait={handleResumeWait}
        />
      )}
    </div>
  );
}

// Step timeline row component
function StepTimelineRow({
  step, isSelected, hasWaitToken, onClick
}: {
  step: StepExecutionDetail;
  isSelected: boolean;
  hasWaitToken: boolean;
  onClick: () => void;
}) {
  const statusIcon: Record<string, React.ReactNode> = {
    SUCCESS: <CheckCircle size={16} className="text-green-500 shrink-0" />,
    FAILED:  <XCircle size={16} className="text-red-500 shrink-0" />,
    RUNNING: <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />,
    WAITING: <Pause size={16} className="text-yellow-500 shrink-0" />,
    SKIPPED: <AlertCircle size={16} className="text-gray-300 shrink-0" />,
    PENDING: <Clock size={16} className="text-gray-300 shrink-0" />,
  };

  const icon = statusIcon[step.status] ?? <Clock size={16} className="text-gray-300 shrink-0" />;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-300 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900 truncate">{step.stepName}</span>
            <span className="text-xs text-gray-400 font-mono shrink-0">{step.stepType}</span>
            {hasWaitToken && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">WAITING</span>
            )}
            {(step.totalAttempts ?? step.attemptNumber ?? 1) > 1 && (
              <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                step.status === 'FAILED'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-orange-100 text-orange-600'
              }`}>
                {step.totalAttempts ?? step.attemptNumber} attempts
              </span>
            )}
          </div>
          {step.errorMessage && (
            <div className="text-xs text-red-500 truncate mt-0.5">{step.errorMessage}</div>
          )}
          {/* Retry exhausted hint */}
          {step.status === 'FAILED' && (step.totalAttempts ?? 0) > 1 && (
            <div className="text-[10px] text-orange-600 mt-0.5 flex items-center gap-1">
              <AlertCircle size={10} />
              {step.totalAttempts} attempts exhausted — check Retries tab for full error trail
            </div>
          )}
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          {step.durationMs != null && step.durationMs > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400 justify-end">
              <Clock size={11} />{step.durationMs}ms
            </div>
          )}
          {step.httpCallLog && (
            <div className="flex items-center gap-1 text-xs justify-end">
              <Globe size={11} className="text-gray-400" />
              <span className={step.httpCallLog.success ? 'text-green-600' : 'text-red-500'}>
                {step.httpCallLog.responseStatus}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Data Tab — shows before/after snapshots and diff for model-linked executions
// ─────────────────────────────────────────────────────────────────────────────

function ModelDataTab({
  modelRecordId, dataSyncMode, modelDataSnapshot, modelDataAfter,
}: {
  modelRecordId?: string;
  dataSyncMode?: 'READ' | 'WRITE';
  modelDataSnapshot?: Record<string, unknown>;
  modelDataAfter?: Record<string, unknown>;
}) {
  if (!modelRecordId && !modelDataSnapshot) {
    return <div className="text-center py-8 text-gray-400">No model data linked to this execution.</div>;
  }

  // Compute simple diff for WRITE scope
  const changes: { key: string; before: unknown; after: unknown; type: 'added' | 'changed' | 'removed' }[] = [];
  if (dataSyncMode === 'WRITE' && modelDataSnapshot && modelDataAfter) {
    const allKeys = new Set([...Object.keys(modelDataSnapshot), ...Object.keys(modelDataAfter)]);
    for (const key of allKeys) {
      const before = modelDataSnapshot[key];
      const after = modelDataAfter[key];
      if (before === undefined && after !== undefined) {
        changes.push({ key, before, after, type: 'added' });
      } else if (before !== undefined && after === undefined) {
        changes.push({ key, before, after, type: 'removed' });
      } else if (JSON.stringify(before) !== JSON.stringify(after)) {
        changes.push({ key, before, after, type: 'changed' });
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        {modelRecordId && (
          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
            ID: {modelRecordId}
          </span>
        )}
        {dataSyncMode && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
            dataSyncMode === 'WRITE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-cyan-100 text-cyan-700'
          }`}>
            {dataSyncMode} Sync
          </span>
        )}
      </div>

      {/* Before Execution */}
      {modelDataSnapshot && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Before Execution
          </h4>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(modelDataSnapshot, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* After Execution (WRITE scope only) */}
      {dataSyncMode === 'WRITE' && modelDataAfter && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            After Execution
          </h4>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <pre className="text-xs font-mono text-emerald-800 whitespace-pre-wrap overflow-auto max-h-64">
              {JSON.stringify(modelDataAfter, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Changes Diff */}
      {changes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Changes ({changes.length})
          </h4>
          <div className="space-y-1.5">
            {changes.map(c => (
              <div key={c.key} className={`flex items-start gap-3 rounded-xl px-3 py-2 text-xs border ${
                c.type === 'added'   ? 'bg-green-50 border-green-200' :
                c.type === 'removed' ? 'bg-red-50 border-red-200' :
                                       'bg-amber-50 border-amber-200'
              }`}>
                <span className={`font-mono font-bold flex-shrink-0 ${
                  c.type === 'added' ? 'text-green-700' : c.type === 'removed' ? 'text-red-700' : 'text-amber-700'
                }`}>
                  {c.type === 'added' ? '+' : c.type === 'removed' ? '-' : '~'} {c.key}
                </span>
                <div className="flex-1 min-w-0">
                  {c.type !== 'added' && (
                    <div className="text-red-600 font-mono line-through truncate">
                      {JSON.stringify(c.before)}
                    </div>
                  )}
                  {c.type !== 'removed' && (
                    <div className="text-green-700 font-mono truncate">
                      {JSON.stringify(c.after)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dataSyncMode === 'WRITE' && !modelDataAfter && (
        <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
          Write-back data not yet available. The execution may still be running, or it may have failed before write-back could occur.
        </div>
      )}
    </div>
  );
}
