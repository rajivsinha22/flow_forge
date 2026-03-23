import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { Globe, GitBranch, RefreshCw, Clock, Code2, Bell, Layers, CheckCircle2, XCircle, Loader2, Circle, Pause, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import type { WorkflowNodeData } from '../../store/workflowStore'

const stepTypeConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
  HTTP_REQUEST: {
    icon: <Globe size={14} />,
    color: 'text-blue-700',
    bg: 'bg-blue-600',
    border: 'border-blue-200',
  },
  HTTP: {
    icon: <Globe size={14} />,
    color: 'text-blue-700',
    bg: 'bg-blue-600',
    border: 'border-blue-200',
  },
  CONDITION: {
    icon: <GitBranch size={14} />,
    color: 'text-purple-700',
    bg: 'bg-purple-600',
    border: 'border-purple-200',
  },
  LOOP: {
    icon: <RefreshCw size={14} />,
    color: 'text-orange-700',
    bg: 'bg-orange-500',
    border: 'border-orange-200',
  },
  DELAY: {
    icon: <Clock size={14} />,
    color: 'text-gray-700',
    bg: 'bg-gray-500',
    border: 'border-gray-200',
  },
  SCRIPT: {
    icon: <Code2 size={14} />,
    color: 'text-green-700',
    bg: 'bg-green-600',
    border: 'border-green-200',
  },
  NOTIFY: {
    icon: <Bell size={14} />,
    color: 'text-yellow-700',
    bg: 'bg-yellow-500',
    border: 'border-yellow-200',
  },
  SUB_WORKFLOW: {
    icon: <Layers size={14} />,
    color: 'text-teal-700',
    bg: 'bg-teal-600',
    border: 'border-teal-200',
  },
  WAIT: {
    icon: <Pause size={14} />,
    color: 'text-amber-700',
    bg: 'bg-amber-500',
    border: 'border-amber-200',
  },
  AI_CALL: {
    icon: <Sparkles size={14} />,
    color: 'text-indigo-700',
    bg: 'bg-indigo-600',
    border: 'border-indigo-200',
  },
}

const statusIcon: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 size={12} className="text-green-500" />,
  COMPLETED: <CheckCircle2 size={12} className="text-green-500" />,
  FAILED: <XCircle size={12} className="text-red-500" />,
  RUNNING: <Loader2 size={12} className="text-blue-500 animate-spin" />,
  IN_PROGRESS: <Loader2 size={12} className="text-blue-500 animate-spin" />,
  PENDING: <Circle size={12} className="text-gray-400" />,
}

const StepNode: React.FC<NodeProps<WorkflowNodeData>> = memo(({ data, selected }) => {
  const typeKey = (data.type || 'HTTP').toUpperCase()
  const config = stepTypeConfig[typeKey] ?? stepTypeConfig['HTTP_REQUEST']

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border-2 shadow-sm min-w-[160px] max-w-[200px] transition-all',
        selected ? 'border-blue-500 shadow-blue-100 shadow-md' : config.border,
        'hover:shadow-md'
      )}
    >
      {/* Header */}
      <div className={clsx('rounded-t-[10px] px-3 py-2 flex items-center gap-2', config.bg)}>
        <span className="text-white">{config.icon}</span>
        <span className="text-white text-xs font-semibold uppercase tracking-wide truncate">
          {data.type?.replace(/_/g, ' ') || 'STEP'}
        </span>
        {data.status && (
          <span className="ml-auto">{statusIcon[data.status.toUpperCase()] ?? null}</span>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-sm font-semibold text-gray-900 truncate">{data.name || 'Unnamed Step'}</p>
        {data.stepId && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{data.stepId}</p>
        )}
        {data.config?.url && (
          <p className="text-xs text-gray-500 truncate mt-1 font-mono">
            {String(data.config.url).slice(0, 30)}...
          </p>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-white"
        style={{ left: '35%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="failure"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-white"
        style={{ left: '65%' }}
      />
    </div>
  )
})

StepNode.displayName = 'StepNode'

export default StepNode
