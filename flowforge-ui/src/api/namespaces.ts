import api from './axios'
import type { Namespace } from '../types'

export const listNamespaces = async (): Promise<Namespace[]> => {
  const res = await api.get('/namespaces')
  return (res.data?.data ?? res.data) as Namespace[]
}

export const createNamespace = async (data: { name: string; displayName: string; description?: string }): Promise<Namespace> => {
  const res = await api.post('/namespaces', data)
  return (res.data?.data ?? res.data) as Namespace
}

export const deleteNamespace = async (name: string): Promise<void> => {
  await api.delete(`/namespaces/${name}`)
}

export const assignUserNamespaces = async (userId: string, namespaces: string[]): Promise<void> => {
  await api.put(`/users/${userId}/namespaces`, namespaces)
}

export const getUserNamespaces = async (userId: string): Promise<string[]> => {
  const res = await api.get(`/users/${userId}/namespaces`)
  return (res.data?.data ?? res.data) as string[]
}
