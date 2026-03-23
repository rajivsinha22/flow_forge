import api from './axios'
import { unwrap } from './utils'
import type { WebhookDelivery } from '../types'
import type { PageResponse } from './workflows'

export interface WebhookStats {
  totalDeliveries: number
  successRate: number
  failedCount: number
  pendingCount: number
  avgResponseTimeMs: number
}

export interface WebhookAttempt {
  attemptNumber: number
  status: string
  httpStatus?: number
  responseBody?: string
  attemptedAt: string
  durationMs?: number
}

export const listWebhookDeliveries = async (params?: {
  workflowName?: string
  status?: string
  page?: number
  size?: number
}): Promise<PageResponse<WebhookDelivery>> => {
  const res = await api.get('/webhooks/deliveries', { params })
  return unwrap<PageResponse<WebhookDelivery>>(res.data)
}

export const getWebhookDelivery = async (id: string): Promise<WebhookDelivery> => {
  const res = await api.get(`/webhooks/deliveries/${id}`)
  return unwrap<WebhookDelivery>(res.data)
}

export const getWebhookAttempts = async (id: string): Promise<WebhookAttempt[]> => {
  const res = await api.get(`/webhooks/deliveries/${id}/attempts`)
  return unwrap<WebhookAttempt[]>(res.data)
}

export const retryWebhookDelivery = async (id: string): Promise<WebhookDelivery> => {
  const res = await api.post(`/webhooks/deliveries/${id}/retry`)
  return unwrap<WebhookDelivery>(res.data)
}

export const getWebhookStats = async (): Promise<WebhookStats> => {
  const res = await api.get('/webhooks/stats')
  return unwrap<WebhookStats>(res.data)
}
