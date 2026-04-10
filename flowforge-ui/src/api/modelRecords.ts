import api from './axios'
import { unwrap } from './utils'
import type { ModelRecord } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ModelRecordRequest {
  dataModelId: string
  name: string
  data: Record<string, unknown>
}

// ─────────────────────────────────────────────────────────────────────────────
// API helpers
// ─────────────────────────────────────────────────────────────────────────────

export const listModelRecords = async (dataModelId?: string): Promise<ModelRecord[]> => {
  const res = await api.get('/model-records', { params: dataModelId ? { dataModelId } : {} })
  return unwrap<ModelRecord[]>(res.data)
}

export const getModelRecord = async (id: string): Promise<ModelRecord> => {
  const res = await api.get(`/model-records/${id}`)
  return unwrap<ModelRecord>(res.data)
}

export const createModelRecord = async (data: ModelRecordRequest): Promise<ModelRecord> => {
  const res = await api.post('/model-records', data)
  return unwrap<ModelRecord>(res.data)
}

export const updateModelRecord = async (id: string, data: ModelRecordRequest): Promise<ModelRecord> => {
  const res = await api.put(`/model-records/${id}`, data)
  return unwrap<ModelRecord>(res.data)
}

export const deleteModelRecord = async (id: string): Promise<void> => {
  await api.delete(`/model-records/${id}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data re-exported from mocks/data.ts (avoids circular: axios → handlers → modelRecords → axios)
// ─────────────────────────────────────────────────────────────────────────────

// Lazy re-export so consumers that only need mock records can import from here
export { DUMMY_MODEL_RECORDS as MOCK_MODEL_RECORDS } from '../mocks/data'
