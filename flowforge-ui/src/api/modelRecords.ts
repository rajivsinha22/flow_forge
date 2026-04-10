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
// Mock data (dummy mode)
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_MODEL_RECORDS: ModelRecord[] = [
  {
    id: 'mr-1',
    clientId: 'client-1',
    dataModelId: 'model-1',
    name: 'Order #ORD-2026-0042',
    data: {
      orderId: 'ORD-2026-0042',
      customerId: 'CUST-001',
      amount: 149.99,
      currency: 'USD',
      items: [{ sku: 'SKU-A', qty: 2 }, { sku: 'SKU-B', qty: 1 }],
    },
    createdBy: 'admin',
    createdAt: '2026-03-10T09:00:00',
    updatedAt: '2026-03-10T09:00:00',
  },
  {
    id: 'mr-2',
    clientId: 'client-1',
    dataModelId: 'model-1',
    name: 'Order #ORD-2026-0099',
    data: {
      orderId: 'ORD-2026-0099',
      customerId: 'CUST-007',
      amount: 599.00,
      currency: 'EUR',
      items: [{ sku: 'SKU-X', qty: 5 }],
    },
    createdBy: 'admin',
    createdAt: '2026-03-12T14:30:00',
    updatedAt: '2026-03-15T11:00:00',
  },
  {
    id: 'mr-3',
    clientId: 'client-1',
    dataModelId: 'model-2',
    name: 'New User — jane@example.com',
    data: {
      email: 'jane@example.com',
      name: 'Jane Doe',
      phone: '+12025551234',
      role: 'user',
    },
    createdBy: 'system',
    createdAt: '2026-03-18T08:00:00',
    updatedAt: '2026-03-18T08:00:00',
  },
  {
    id: 'mr-4',
    clientId: 'client-1',
    dataModelId: 'model-2',
    name: 'Admin — bob@example.com',
    data: {
      email: 'bob@example.com',
      name: 'Bob Smith',
      role: 'admin',
    },
    createdBy: 'admin',
    createdAt: '2026-03-20T10:15:00',
    updatedAt: '2026-03-22T16:45:00',
  },
]
