import api from './axios'
import { unwrap } from './utils'
import type { DlqMessage } from '../types'
import type { PageResponse } from './workflows'

export interface DlqListParams {
  workflowName?: string
  status?: string
  page?: number
  size?: number
}

export const listDlqMessages = async (params?: DlqListParams): Promise<PageResponse<DlqMessage>> => {
  const res = await api.get('/dlq', { params })
  return unwrap<PageResponse<DlqMessage>>(res.data)
}

export const getDlqMessage = async (id: string): Promise<DlqMessage> => {
  const res = await api.get(`/dlq/${id}`)
  return unwrap<DlqMessage>(res.data)
}

/**
 * Replay a DLQ message.
 * @param executionContext  When provided (ADMIN / dlq:write only), replaces the stored
 *                         execution context snapshot so the step runs with patched variables.
 */
export const replayDlqMessage = async (
  id: string,
  executionContext?: Record<string, unknown>,
): Promise<DlqMessage> => {
  const body = executionContext ? { executionContext } : undefined
  const res = await api.post(`/dlq/${id}/replay`, body)
  return unwrap<DlqMessage>(res.data)
}

export const replayAllDlqMessages = async (): Promise<{
  total: number
  succeeded: number
  failed: number
  messages: DlqMessage[]
}> => {
  const res = await api.post('/dlq/replay-batch')
  return unwrap(res.data)
}

/** Discard a DLQ message — marks it DISCARDED, no further replay possible. */
export const discardDlqMessage = async (id: string): Promise<DlqMessage> => {
  const res = await api.delete(`/dlq/${id}`)
  return unwrap<DlqMessage>(res.data)
}

export interface DlqStats {
  pending: number
  replaying: number
  resolved: number
  discarded: number
}

export const getDlqStats = async (): Promise<DlqStats> => {
  const res = await api.get('/dlq/stats')
  return unwrap<DlqStats>(res.data)
}
