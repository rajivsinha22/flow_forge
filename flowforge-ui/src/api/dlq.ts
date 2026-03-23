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

export const replayDlqMessage = async (id: string): Promise<{ executionId: string }> => {
  const res = await api.post(`/dlq/${id}/replay`)
  return unwrap<{ executionId: string }>(res.data)
}

export const replayAllDlqMessages = async (workflowName?: string): Promise<{ count: number }> => {
  const res = await api.post('/dlq/replay-all', { workflowName })
  return unwrap<{ count: number }>(res.data)
}

export const discardDlqMessage = async (id: string): Promise<void> => {
  await api.post(`/dlq/${id}/discard`)
}

export const getDlqStats = async (): Promise<{ pending: number; replayed: number; discarded: number }> => {
  const res = await api.get('/dlq/stats')
  return unwrap<{ pending: number; replayed: number; discarded: number }>(res.data)
}
