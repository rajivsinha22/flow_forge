import api from './axios'
import { unwrap } from './utils'
import type { Trigger, TriggerCondition } from '../types'
import type { PageResponse } from './workflows'

export interface CreateTriggerRequest {
  name: string
  sourceType: string
  workflowId?: string
  workflowName: string
  topic?: string
  url?: string
  filterExpression?: string
  condition?: TriggerCondition | null
  payloadMapping?: string
  triggerAction?: 'FIRE_WORKFLOW' | 'RESUME_WAIT'
  resumeTokenPath?: string
  resumeExecutionId?: string
  resumeStepId?: string
}

export interface TriggerLog {
  id: string
  triggerId: string
  status: string
  payload?: unknown
  executionId?: string
  errorMessage?: string
  timestamp: string
}

export const listTriggers = async (): Promise<PageResponse<Trigger>> => {
  const res = await api.get('/triggers')
  return unwrap<PageResponse<Trigger>>(res.data)
}

export const getTrigger = async (id: string): Promise<Trigger> => {
  const res = await api.get(`/triggers/${id}`)
  return unwrap<Trigger>(res.data)
}

export const createTrigger = async (data: CreateTriggerRequest): Promise<Trigger> => {
  const res = await api.post('/triggers', data)
  return unwrap<Trigger>(res.data)
}

export const updateTrigger = async (id: string, data: Partial<CreateTriggerRequest>): Promise<Trigger> => {
  const res = await api.put(`/triggers/${id}`, data)
  return unwrap<Trigger>(res.data)
}

export const deleteTrigger = async (id: string): Promise<void> => {
  await api.delete(`/triggers/${id}`)
}

export const enableTrigger = async (id: string): Promise<Trigger> => {
  const res = await api.post(`/triggers/${id}/enable`)
  return unwrap<Trigger>(res.data)
}

export const disableTrigger = async (id: string): Promise<Trigger> => {
  const res = await api.post(`/triggers/${id}/disable`)
  return unwrap<Trigger>(res.data)
}

export const getTriggerLogs = async (id: string): Promise<TriggerLog[]> => {
  const res = await api.get(`/triggers/${id}/logs`)
  return unwrap<TriggerLog[]>(res.data)
}
