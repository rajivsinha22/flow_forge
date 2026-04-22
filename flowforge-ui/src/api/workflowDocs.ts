import api from './axios'
import { unwrap } from './utils'

export type WorkflowDoc = {
  workflowId: string
  workflowVersion: number
  markdown: string
  generatedAt: string
  editedBy?: string
  editedAt?: string
}

export async function getDocs(workflowId: string): Promise<WorkflowDoc | null> {
  try {
    const res = await api.get(`/workflows/${workflowId}/docs`)
    return unwrap<WorkflowDoc>(res.data)
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

export async function generateDocs(workflowId: string): Promise<WorkflowDoc> {
  const res = await api.post(`/workflows/${workflowId}/docs/generate`)
  return unwrap<WorkflowDoc>(res.data)
}

export async function updateDocs(workflowId: string, markdown: string): Promise<WorkflowDoc> {
  const res = await api.put(`/workflows/${workflowId}/docs`, { markdown })
  return unwrap<WorkflowDoc>(res.data)
}
