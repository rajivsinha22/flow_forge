import React, { useState } from 'react';
import { X, Clock, RotateCcw, Pause, AlertTriangle, XCircle } from 'lucide-react';
import { StepExecutionDetail, WaitToken } from '../../types';
import HttpCallLogViewer from './HttpCallLogViewer';
import JsonViewer from '../shared/JsonViewer';
import StatusBadge from '../shared/StatusBadge';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  step: StepExecutionDetail | null;
  waitToken?: WaitToken;
  onClose: () => void;
  onResumeWait?: (stepId: string, data: Record<string, unknown>) => void;
}

export default function StepDetailPanel({ step, waitToken, onClose, onResumeWait }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'input' | 'output' | 'http' | 'config'>('overview');
  const [resumePayload, setResumePayload] = useState('{}');
  const [resumePayloadError, setResumePayloadError] = useState('');

  if (!step) return null;

  const hasRetryHistory = (step.retryAttempts?.length ?? 0) > 0
  const allRetriesFailed = hasRetryHistory && step.retryAttempts!.every(() => true) // all are failures by definition

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'input', label: 'Input' },
    { id: 'output', label: 'Output' },
    ...(hasRetryHistory ? [{ id: 'retries', label: `Retries (${step.retryAttempts!.length})` }] : []),
    ...(step.httpCallLog ? [{ id: 'http', label: 'HTTP Log' }] : []),
    { id: 'config', label: 'Config' },
  ] as const;

  const handleResume = () => {
    try {
      const data = JSON.parse(resumePayload);
      setResumePayloadError('');
      onResumeWait?.(step.stepId, data);
    } catch {
      setResumePayloadError('Invalid JSON');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[520px] bg-white border-l border-gray-200 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">{step.stepName}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500 font-mono">{step.stepType}</span>
              <StatusBadge status={step.status} />
              {step.durationMs != null && step.durationMs > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={11} />{step.durationMs}ms
                </span>
              )}
              {(step.totalAttempts || step.attemptNumber || 1) > 1 && (
                <span className="flex items-center gap-1 text-xs text-orange-500">
                  <RotateCcw size={11} />Attempt {step.attemptNumber}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
          <X size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-5 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'http' && step.httpCallLog && !step.httpCallLog.success && (
              <span className="ml-1 w-2 h-2 rounded-full bg-red-500 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* WAIT state resume UI */}
        {step.status === 'WAITING' && waitToken && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Pause size={16} className="text-amber-600" />
              <span className="font-semibold text-amber-800 text-sm">Waiting for Resume</span>
            </div>
            <div className="text-xs text-amber-700 mb-1">Token: <code className="font-mono bg-amber-100 px-1 rounded">{waitToken.token}</code></div>
            {waitToken.expiresAt && (
              <div className="text-xs text-amber-600 mb-3">Expires: {new Date(waitToken.expiresAt).toLocaleString()}</div>
            )}
            <div className="mb-2">
              <label className="block text-xs font-medium text-amber-700 mb-1">Resume Payload (JSON)</label>
              <textarea
                value={resumePayload}
                onChange={e => setResumePayload(e.target.value)}
                rows={3}
                className={`w-full font-mono text-xs border rounded p-2 ${resumePayloadError ? 'border-red-400' : 'border-amber-300'}`}
              />
              {resumePayloadError && <p className="text-red-500 text-xs mt-1">{resumePayloadError}</p>}
            </div>
            <button
              onClick={handleResume}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded"
            >
              ▶ Resume Execution
            </button>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-3 text-sm">
            <Row label="Step ID" value={step.stepId} mono />
            <Row label="Status" value={<StatusBadge status={step.status} />} />
            <Row label="Type" value={step.stepType} mono />
            <Row label="Attempt" value={`${step.attemptNumber || 1}`} />
            {step.durationMs != null && step.durationMs > 0 && <Row label="Duration" value={`${step.durationMs}ms`} />}
            {step.startedAt && <Row label="Started" value={new Date(step.startedAt).toLocaleString()} />}
            {step.completedAt && <Row label="Completed" value={new Date(step.completedAt).toLocaleString()} />}
            {step.errorMessage && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-xs font-semibold text-red-700 mb-1">Error</div>
                <div className="text-xs text-red-700 font-mono">{step.errorMessage}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'input' && (
          <div>
            {step.input && Object.keys(step.input).length > 0
              ? <JsonViewer data={step.input} />
              : <Empty label="No input data recorded" />}
          </div>
        )}

        {activeTab === 'output' && (
          <div>
            {step.output && typeof step.output === 'object' && step.output !== null && Object.keys(step.output as object).length > 0
              ? <JsonViewer data={step.output} />
              : <Empty label="No output data recorded" />}
          </div>
        )}

        {activeTab === 'retries' && hasRetryHistory && (
          <div className="space-y-1">
            {/* All-failed warning */}
            {step.status === 'FAILED' && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-3">
                <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  <strong>All {step.retryAttempts!.length} attempt{step.retryAttempts!.length !== 1 ? 's' : ''} failed.</strong>
                  {' '}Step was dead-lettered and moved to the DLQ for manual review.
                </p>
              </div>
            )}

            {step.retryAttempts!.map((attempt, i) => {
              const isLast = i === step.retryAttempts!.length - 1
              return (
                <div key={i} className="flex items-start gap-3">
                  {/* Timeline */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-7 h-7 rounded-full bg-orange-100 border-2 border-orange-400 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                      {attempt.attemptNumber}
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[16px]" />}
                    {isLast && step.status === 'FAILED' && (
                      <div className="w-px flex-1 bg-red-200 mt-1 min-h-[16px]" />
                    )}
                  </div>

                  <div className={`flex-1 pb-3 ${i < step.retryAttempts!.length - 1 ? '' : ''}`}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-orange-700">
                        Attempt {attempt.attemptNumber}
                        {attempt.attemptNumber === 1 ? ' (initial)' : ` (retry ${attempt.attemptNumber - 1})`}
                        {isLast && step.status === 'FAILED' ? ' → Dead-lettered' : ''}
                      </span>
                      {attempt.durationMs != null && attempt.durationMs > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Clock size={10} />{attempt.durationMs}ms
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400 ml-auto">
                        {formatDistanceToNow(new Date(attempt.failedAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2">
                      <XCircle size={11} className="text-red-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-red-700 font-mono leading-relaxed break-all">
                        {attempt.errorMessage}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* DLQ badge at the bottom */}
            {step.status === 'FAILED' && (
              <div className="flex items-center gap-2 pt-1 pl-10">
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                  <AlertTriangle size={11} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  Moved to Dead Letter Queue
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'http' && step.httpCallLog && (
          <HttpCallLogViewer log={step.httpCallLog} />
        )}

        {activeTab === 'config' && (
          <div>
            {step.resolvedConfig && Object.keys(step.resolvedConfig).length > 0
              ? <JsonViewer data={step.resolvedConfig} />
              : <Empty label="No config recorded" />}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-gray-900 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center py-8 text-gray-400 text-sm">{label}</div>;
}
