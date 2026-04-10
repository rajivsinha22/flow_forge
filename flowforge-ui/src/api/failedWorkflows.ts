import api from './axios'
import { unwrap } from './utils'
import type { FailedWorkflow } from '../types'
import type { PageResponse } from './workflows'

export interface FailedWorkflowListParams {
  workflowName?: string
  status?: string
  page?: number
  size?: number
}

export const listFailedWorkflows = async (params?: FailedWorkflowListParams): Promise<PageResponse<FailedWorkflow>> => {
  const res = await api.get('/failed-workflows', { params })
  return unwrap<PageResponse<FailedWorkflow>>(res.data)
}

export const getFailedWorkflow = async (id: string): Promise<FailedWorkflow> => {
  const res = await api.get(`/failed-workflows/${id}`)
  return unwrap<FailedWorkflow>(res.data)
}

/**
 * Replay a failed workflow entry.
 * @param executionContext  When provided (ADMIN / failed-workflows:write only), replaces the stored
 *                         execution context snapshot so the step runs with patched variables.
 */
export const replayFailedWorkflow = async (
  id: string,
  executionContext?: Record<string, unknown>,
): Promise<FailedWorkflow> => {
  const body = executionContext ? { executionContext } : undefined
  const res = await api.post(`/failed-workflows/${id}/replay`, body)
  return unwrap<FailedWorkflow>(res.data)
}

export const replayAllFailedWorkflows = async (): Promise<{
  total: number
  succeeded: number
  failed: number
  messages: FailedWorkflow[]
}> => {
  const res = await api.post('/failed-workflows/replay-batch')
  return unwrap(res.data)
}

/** Discard a failed workflow entry — marks it DISCARDED, no further replay possible. */
export const discardFailedWorkflow = async (id: string): Promise<FailedWorkflow> => {
  const res = await api.delete(`/failed-workflows/${id}`)
  return unwrap<FailedWorkflow>(res.data)
}

export interface FailedWorkflowStats {
  pending: number
  replaying: number
  resolved: number
  discarded: number
}

export const getFailedWorkflowStats = async (): Promise<FailedWorkflowStats> => {
  const res = await api.get('/failed-workflows/stats')
  return unwrap<FailedWorkflowStats>(res.data)
}
