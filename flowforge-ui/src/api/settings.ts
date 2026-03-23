import api from './axios'
import { unwrap } from './utils'
import type { ApiKey, AuditLog, RateLimit, AnalyticsSummary } from '../types'
import type { PageResponse } from './workflows'

export interface OrgSettings {
  orgName: string
  webhookEnabled?: boolean
  webhookUrl?: string
  webhookSecret?: string
  notificationEmail?: string
  timezone: string
}

export interface EnvVar {
  key: string
  value: string
  encrypted: boolean
}

export const getOrgSettings = async (): Promise<OrgSettings> => {
  const res = await api.get('/settings/org')
  return unwrap<OrgSettings>(res.data)
}

export const updateOrgSettings = async (data: Partial<OrgSettings>): Promise<OrgSettings> => {
  const res = await api.put('/settings/org', data)
  return unwrap<OrgSettings>(res.data)
}

export const listEnvVars = async (): Promise<EnvVar[]> => {
  const res = await api.get('/settings/env-vars')
  return unwrap<EnvVar[]>(res.data)
}

export const setEnvVar = async (key: string, value: string, encrypted: boolean): Promise<EnvVar> => {
  const res = await api.put(`/settings/env-vars/${key}`, { value, encrypted })
  return unwrap<EnvVar>(res.data)
}

export const deleteEnvVar = async (key: string): Promise<void> => {
  await api.delete(`/settings/env-vars/${key}`)
}

export const getRateLimits = async (): Promise<RateLimit[]> => {
  const res = await api.get('/settings/rate-limits')
  return unwrap<RateLimit[]>(res.data)
}

export const updateRateLimit = async (data: Partial<RateLimit>): Promise<RateLimit> => {
  const res = await api.put('/settings/rate-limits', data)
  return unwrap<RateLimit>(res.data)
}

export const getRateLimitUsage = async (): Promise<{ used: number; limit: number; percentage: number }> => {
  const res = await api.get('/settings/rate-limits/usage')
  return unwrap<{ used: number; limit: number; percentage: number }>(res.data)
}

export const listApiKeys = async (): Promise<ApiKey[]> => {
  const res = await api.get('/settings/api-keys')
  return unwrap<ApiKey[]>(res.data)
}

export const createApiKey = async (data: { name: string; scopes: string[]; expiresAt?: string }): Promise<ApiKey & { secret: string }> => {
  const res = await api.post('/settings/api-keys', data)
  return unwrap<ApiKey & { secret: string }>(res.data)
}

export const revokeApiKey = async (id: string): Promise<void> => {
  await api.delete(`/settings/api-keys/${id}`)
}

export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const res = await api.get('/analytics/summary')
  return unwrap<AnalyticsSummary>(res.data)
}

export const listAuditLogs = async (params?: {
  action?: string
  actor?: string
  resource?: string
  from?: string
  to?: string
  page?: number
  size?: number
}): Promise<PageResponse<AuditLog>> => {
  const res = await api.get('/audit-logs', { params })
  return unwrap<PageResponse<AuditLog>>(res.data)
}
