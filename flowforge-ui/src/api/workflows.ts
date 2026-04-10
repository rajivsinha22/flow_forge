import api from './axios'
import { unwrap } from './utils'
import type { Workflow, WorkflowVersion } from '../types'

export interface WorkflowListParams {
  status?: string
  triggerType?: string
  search?: string
  page?: number
  size?: number
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface CreateWorkflowRequest {
  name: string
  displayName: string
  triggerType: string
  description?: string
  cronExpression?: string
  kafkaTopic?: string
  inputModelId?: string
  dataSyncMode?: 'READ' | 'WRITE'
}


export const listWorkflows = async (params?: WorkflowListParams): Promise<PageResponse<Workflow>> => {
  const res = await api.get('/workflows', { params })
  return unwrap<PageResponse<Workflow>>(res.data)
}

export const getWorkflow = async (name: string): Promise<Workflow> => {
  const res = await api.get(`/workflows/${name}`)
  return unwrap<Workflow>(res.data)
}

export const createWorkflow = async (data: CreateWorkflowRequest): Promise<Workflow> => {
  const res = await api.post('/workflows', data)
  return unwrap<Workflow>(res.data)
}

export const updateWorkflow = async (name: string, data: Partial<Workflow>): Promise<Workflow> => {
  const res = await api.put(`/workflows/${name}`, data)
  return unwrap<Workflow>(res.data)
}

export const deleteWorkflow = async (name: string): Promise<void> => {
  await api.delete(`/workflows/${name}`)
}

export const publishWorkflow = async (name: string): Promise<Workflow> => {
  const res = await api.post(`/workflows/${name}/publish`)
  return unwrap<Workflow>(res.data)
}

export const rollbackWorkflow = async (name: string, version: number): Promise<Workflow> => {
  const res = await api.post(`/workflows/${name}/rollback`, { version })
  return unwrap<Workflow>(res.data)
}

export const getWorkflowVersions = async (name: string): Promise<WorkflowVersion[]> => {
  const res = await api.get(`/workflows/${name}/versions`)
  return unwrap<WorkflowVersion[]>(res.data)
}

export const getWorkflowVersion = async (name: string, version: number): Promise<Workflow> => {
  const res = await api.get(`/workflows/${name}/versions/${version}`)
  return unwrap<Workflow>(res.data)
}

export const validateWorkflow = async (name: string): Promise<{ valid: boolean; errors: string[] }> => {
  const res = await api.post(`/workflows/${name}/validate`)
  return unwrap<{ valid: boolean; errors: string[] }>(res.data)
}

export const cloneWorkflow = async (name: string, newName: string): Promise<Workflow> => {
  const res = await api.post(`/workflows/${name}/clone`, { newName })
  return unwrap<Workflow>(res.data)
}

export const triggerWorkflow = async (name: string, payload?: unknown): Promise<{ executionId: string }> => {
  const res = await api.post(`/workflows/${name}/trigger`, payload)
  return unwrap<{ executionId: string }>(res.data)
}
