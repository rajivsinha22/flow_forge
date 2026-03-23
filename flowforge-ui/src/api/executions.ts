import api from './axios'
import { unwrap } from './utils'
import type { Execution, StepExecution, ExecutionTraceDto, WaitToken } from '../types'
import type { PageResponse } from './workflows'

export interface ExecutionListParams {
  workflowName?: string
  status?: string
  triggerType?: string
  from?: string
  to?: string
  page?: number
  size?: number
}

export const listExecutions = async (params?: ExecutionListParams): Promise<PageResponse<Execution>> => {
  const res = await api.get('/executions', { params })
  return unwrap<PageResponse<Execution>>(res.data)
}

export const getExecution = async (id: string): Promise<Execution> => {
  const res = await api.get(`/executions/${id}`)
  return unwrap<Execution>(res.data)
}

export const getExecutionSteps = async (id: string): Promise<StepExecution[]> => {
  const res = await api.get(`/executions/${id}/steps`)
  return unwrap<StepExecution[]>(res.data)
}

export const triggerExecution = async (workflowName: string, payload?: unknown): Promise<Execution> => {
  const res = await api.post(`/executions/trigger/${workflowName}`, payload)
  return unwrap<Execution>(res.data)
}

export const pauseExecution = async (id: string): Promise<Execution> => {
  const res = await api.post(`/executions/${id}/pause`)
  return unwrap<Execution>(res.data)
}

export const resumeExecution = async (id: string): Promise<Execution> => {
  const res = await api.post(`/executions/${id}/resume`)
  return unwrap<Execution>(res.data)
}

export const retryExecution = async (id: string): Promise<Execution> => {
  const res = await api.post(`/executions/${id}/retry`)
  return unwrap<Execution>(res.data)
}

export const cancelExecution = async (id: string): Promise<Execution> => {
  const res = await api.post(`/executions/${id}/cancel`)
  return unwrap<Execution>(res.data)
}

export const getExecutionContext = async (id: string): Promise<Record<string, unknown>> => {
  const res = await api.get(`/executions/${id}/context`)
  return unwrap<Record<string, unknown>>(res.data)
}

export const getExecutionTrace = async (id: string): Promise<ExecutionTraceDto> => {
  const res = await api.get(`/executions/${id}/trace`)
  return unwrap<ExecutionTraceDto>(res.data)
}

export const getWaitTokens = async (executionId: string): Promise<WaitToken[]> => {
  const res = await api.get(`/executions/${executionId}/wait-tokens`)
  return unwrap<WaitToken[]>(res.data)
}

export const resumeWaitState = async (executionId: string, stepId: string, data?: Record<string, unknown>): Promise<WaitToken> => {
  const res = await api.post(`/executions/${executionId}/steps/${stepId}/resume`, { data })
  return unwrap<WaitToken>(res.data)
}

export const resumeByToken = async (token: string, data?: Record<string, unknown>): Promise<WaitToken> => {
  const res = await api.post(`/executions/resume-by-token/${token}`, { data })
  return unwrap<WaitToken>(res.data)
}
