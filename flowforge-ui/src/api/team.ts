import api from './axios'
import { unwrap } from './utils'
import type { TeamMember, Role } from '../types'

export interface InviteUserRequest {
  email: string
  name: string
  roles: string[]
}

export const listUsers = async (): Promise<TeamMember[]> => {
  const res = await api.get('/team/users')
  return unwrap<TeamMember[]>(res.data)
}

export const inviteUser = async (data: InviteUserRequest): Promise<TeamMember> => {
  const res = await api.post('/team/users/invite', data)
  return unwrap<TeamMember>(res.data)
}

export const updateUserRoles = async (userId: string, roles: string[]): Promise<TeamMember> => {
  const res = await api.put(`/team/users/${userId}/roles`, { roles })
  return unwrap<TeamMember>(res.data)
}

export const removeUser = async (userId: string): Promise<void> => {
  await api.delete(`/team/users/${userId}`)
}

export const listRoles = async (): Promise<Role[]> => {
  const res = await api.get('/team/roles')
  return unwrap<Role[]>(res.data)
}

export const getRole = async (id: string): Promise<Role> => {
  const res = await api.get(`/team/roles/${id}`)
  return unwrap<Role>(res.data)
}

export const createRole = async (data: Partial<Role>): Promise<Role> => {
  const res = await api.post('/team/roles', data)
  return unwrap<Role>(res.data)
}

export const updateRole = async (id: string, data: Partial<Role>): Promise<Role> => {
  const res = await api.put(`/team/roles/${id}`, data)
  return unwrap<Role>(res.data)
}

export const deleteRole = async (id: string): Promise<void> => {
  await api.delete(`/team/roles/${id}`)
}
