import { create } from 'zustand'
import { addEdge, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react'
import type { Workflow, StepDef } from '../types'

export interface WorkflowNodeData {
  stepId: string
  name: string
  type: string
  config: Record<string, unknown>
  retryPolicy?: {
    maxRetries: number
    strategy: string
    initialDelayMs: number
    maxDelayMs: number
  }
  onSuccess?: string
  onFailure?: string
  status?: string
  [key: string]: unknown
}

interface WorkflowStoreState {
  workflow: Workflow | null
  nodes: Node<WorkflowNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  isDirty: boolean
  history: Array<{ nodes: Node<WorkflowNodeData>[]; edges: Edge[] }>
  historyIndex: number

  setWorkflow: (workflow: Workflow) => void
  setNodes: (nodes: Node<WorkflowNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  selectNode: (nodeId: string | null) => void
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void
  addNode: (node: Node<WorkflowNodeData>) => void
  deleteNode: (nodeId: string) => void
  undo: () => void
  redo: () => void
  pushHistory: () => void
  markDirty: () => void
  clearDirty: () => void
  reset: () => void
}

const MAX_HISTORY = 50

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  workflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,
  history: [],
  historyIndex: -1,

  setWorkflow: (workflow: Workflow) => {
    const nodes: Node<WorkflowNodeData>[] = workflow.steps.map((step: StepDef) => ({
      id: step.stepId,
      type: 'stepNode',
      position: { x: step.positionX, y: step.positionY },
      data: {
        stepId: step.stepId,
        name: step.name,
        type: step.type,
        config: step.config,
        retryPolicy: step.retryPolicy,
        onSuccess: step.onSuccess,
        onFailure: step.onFailure,
      },
    }))
    const edges: Edge[] = workflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: false,
    }))
    set({ workflow, nodes, edges, isDirty: false, history: [], historyIndex: -1 })
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes: NodeChange[]) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<WorkflowNodeData>[],
      isDirty: true,
    }))
  },

  onEdgesChange: (changes: EdgeChange[]) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      isDirty: true,
    }))
  },

  onConnect: (connection: Connection) => {
    set((state) => ({
      edges: addEdge({ ...connection, type: 'smoothstep', animated: false }, state.edges),
      isDirty: true,
    }))
  },

  selectNode: (nodeId: string | null) => set({ selectedNodeId: nodeId }),

  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
      ),
      isDirty: true,
    }))
  },

  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    }))
  },

  addNode: (node: Node<WorkflowNodeData>) => {
    get().pushHistory()
    set((state) => ({ nodes: [...state.nodes, node], isDirty: true }))
  },

  deleteNode: (nodeId: string) => {
    get().pushHistory()
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    }))
  },

  pushHistory: () => {
    const { nodes, edges, history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({ nodes: prev.nodes, edges: prev.edges, historyIndex: historyIndex - 1, isDirty: true })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({ nodes: next.nodes, edges: next.edges, historyIndex: historyIndex + 1, isDirty: true })
  },

  markDirty: () => set({ isDirty: true }),
  clearDirty: () => set({ isDirty: false }),

  reset: () => set({
    workflow: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    isDirty: false,
    history: [],
    historyIndex: -1,
  }),
}))
