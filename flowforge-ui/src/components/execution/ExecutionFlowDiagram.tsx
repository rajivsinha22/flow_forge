import React, { useMemo } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  Node, Edge, NodeTypes, Handle, Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { StepExecutionDetail, StepDef, EdgeDef } from '../../types';
import { CheckCircle, XCircle, Clock, Pause, Loader } from 'lucide-react';

// --- Status colour config ---
const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  SUCCESS:  { bg: 'bg-green-50',  border: 'border-green-400',  text: 'text-green-700',  icon: <CheckCircle size={14} className="text-green-500" /> },
  FAILED:   { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-700',    icon: <XCircle size={14} className="text-red-500" /> },
  RUNNING:  { bg: 'bg-blue-50',   border: 'border-blue-400',   text: 'text-blue-700',   icon: <Loader size={14} className="text-blue-500 animate-spin" /> },
  WAITING:  { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700', icon: <Pause size={14} className="text-yellow-500" /> },
  PENDING:  { bg: 'bg-gray-50',   border: 'border-gray-300',   text: 'text-gray-500',   icon: <Clock size={14} className="text-gray-400" /> },
  SKIPPED:  { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-400',   icon: <Clock size={14} className="text-gray-300" /> },
  DEFAULT:  { bg: 'bg-white',     border: 'border-gray-200',   text: 'text-gray-600',   icon: <Clock size={14} className="text-gray-300" /> },
};

// Step type → header colour
const STEP_TYPE_COLORS: Record<string, string> = {
  HTTP: 'bg-blue-500', CONDITION: 'bg-purple-500', LOOP: 'bg-orange-500',
  DELAY: 'bg-gray-500', SCRIPT: 'bg-green-500', NOTIFY: 'bg-yellow-500',
  SUB_WORKFLOW: 'bg-teal-500', WAIT: 'bg-amber-500',
};

// Custom execution node
function ExecutionStepNode({ data }: { data: any }) {
  const s = STATUS_STYLES[data.status] || STATUS_STYLES.DEFAULT;
  const typeColor = STEP_TYPE_COLORS[data.stepType] || 'bg-gray-500';

  return (
    <div className={`rounded-lg border-2 ${s.border} ${s.bg} min-w-[160px] max-w-[200px] shadow-sm cursor-pointer transition-shadow hover:shadow-md`}
         onClick={data.onSelect}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      {/* Type header */}
      <div className={`${typeColor} text-white text-[10px] font-semibold px-2 py-1 rounded-t-md flex justify-between`}>
        <span>{data.stepType}</span>
        {data.attemptNumber > 1 && (
          <span className="bg-white/20 rounded px-1">×{data.attemptNumber}</span>
        )}
      </div>
      {/* Body */}
      <div className="px-3 py-2">
        <div className={`font-semibold text-xs ${s.text} truncate`}>{data.label}</div>
        <div className="flex items-center gap-1 mt-1">
          {s.icon}
          <span className={`text-[10px] font-medium ${s.text}`}>{data.status}</span>
          {data.durationMs > 0 && (
            <span className="ml-auto text-[10px] text-gray-400">{data.durationMs}ms</span>
          )}
        </div>
        {data.httpCallLog && (
          <div className={`text-[10px] mt-1 font-mono ${data.httpCallLog.success ? 'text-green-600' : 'text-red-600'}`}>
            {data.httpCallLog.method} → {data.httpCallLog.responseStatus}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} id="success" className="!bg-green-400" style={{ left: '35%' }} />
      <Handle type="source" position={Position.Bottom} id="failure" className="!bg-red-400" style={{ left: '65%' }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { executionStep: ExecutionStepNode };

interface Props {
  stepDefs: StepDef[];
  edgeDefs: EdgeDef[];
  stepExecutions: StepExecutionDetail[];
  onSelectStep: (stepId: string) => void;
  selectedStepId?: string;
}

export default function ExecutionFlowDiagram({ stepDefs, edgeDefs, stepExecutions, onSelectStep, selectedStepId }: Props) {
  // Build a map of stepId → execution result
  const execMap = useMemo(() => {
    const m: Record<string, StepExecutionDetail> = {};
    stepExecutions.forEach(se => { m[se.stepId] = se; });
    return m;
  }, [stepExecutions]);

  const nodes: Node[] = useMemo(() => stepDefs.map(step => {
    const exec = execMap[step.stepId];
    return {
      id: step.stepId,
      type: 'executionStep',
      position: { x: step.positionX || 0, y: step.positionY || 0 },
      data: {
        label: step.name,
        stepType: step.type,
        status: exec?.status || 'PENDING',
        durationMs: exec?.durationMs || 0,
        attemptNumber: exec?.attemptNumber || 1,
        httpCallLog: exec?.httpCallLog,
        onSelect: () => onSelectStep(step.stepId),
        isSelected: step.stepId === selectedStepId,
      },
      selected: step.stepId === selectedStepId,
    };
  }), [stepDefs, execMap, selectedStepId, onSelectStep]);

  const edges: Edge[] = useMemo(() => edgeDefs.map(e => {
    const sourceExec = execMap[e.source];
    // Colour the edge based on whether it was traversed
    const traversed = sourceExec?.status === 'SUCCESS' && e.label !== 'FAILURE'
      || sourceExec?.status === 'FAILED' && e.label === 'FAILURE';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.label === 'FAILURE' ? 'failure' : 'success',
      label: e.label,
      animated: traversed,
      style: { stroke: traversed ? (e.label === 'FAILURE' ? '#ef4444' : '#22c55e') : '#d1d5db', strokeWidth: traversed ? 2 : 1.5 },
      labelStyle: { fontSize: 10, fill: e.label === 'FAILURE' ? '#ef4444' : '#6b7280' },
      labelBgStyle: { fill: 'white', fillOpacity: 0.8 },
    };
  }), [edgeDefs, execMap]);

  return (
    <div style={{ height: 420 }} className="border border-gray-200 rounded-lg overflow-hidden bg-slate-50">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.2 }}>
        <Background color="#e2e8f0" />
        <Controls />
        <MiniMap nodeColor={n => {
          const s = n.data?.status as string;
          return s === 'SUCCESS' ? '#86efac' : s === 'FAILED' ? '#fca5a5' : s === 'RUNNING' ? '#93c5fd' : s === 'WAITING' ? '#fde68a' : '#e2e8f0';
        }} />
      </ReactFlow>
    </div>
  );
}
