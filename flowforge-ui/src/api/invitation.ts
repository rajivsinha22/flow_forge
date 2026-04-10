import api from './axios'

export interface InvitationDetails {
  token: string
  email: string
  name: string
  orgName: string
  status: string
  expiresAt: string
  createdAt: string
}

export interface PendingInvitation {
  id: string
  token: string
  email: string
  name: string
  roles: string[]
  status: string
  expiresAt: string
  createdAt: string
}

export const validateInvitation = async (token: string): Promise<InvitationDetails> => {
  const res = await api.get(`/auth/invite/${token}`)
  return (res.data?.data ?? res.data) as InvitationDetails
}

export const acceptInvitation = async (token: string, password: string): Promise<{ user: any; token: string; expiresIn: number }> => {
  const res = await api.post('/auth/accept-invite', { token, password })
  return (res.data?.data ?? res.data)
}

export const listPendingInvitations = async (): Promise<PendingInvitation[]> => {
  const res = await api.get('/users/invitations')
  return (res.data?.data ?? res.data) as PendingInvitation[]
}

export const resendInvitation = async (id: string): Promise<void> => {
  await api.post(`/users/invitations/${id}/resend`)
}

export const revokeInvitation = async (id: string): Promise<void> => {
  await api.delete(`/users/invitations/${id}`)
}
