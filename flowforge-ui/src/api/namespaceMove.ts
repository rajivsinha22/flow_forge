import api from './axios'

export async function moveWorkflowNamespace(id: string, namespace: string): Promise<void> {
  await api.patch(`/workflows/${id}/namespace`, { namespace })
}

export async function moveModelNamespace(id: string, namespace: string): Promise<void> {
  await api.patch(`/models/${id}/namespace`, { namespace })
}

export async function moveModelRecordNamespace(id: string, namespace: string): Promise<void> {
  await api.patch(`/model-records/${id}/namespace`, { namespace })
}

export async function moveTriggerNamespace(id: string, namespace: string): Promise<void> {
  await api.patch(`/triggers/${id}/namespace`, { namespace })
}
