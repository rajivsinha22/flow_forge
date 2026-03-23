import api from './axios'
import type { User } from '../types'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  orgName: string
  name: string
  email: string
  password: string
  plan: string
  webhookUrl?: string
}

export interface AuthResponse {
  user: User
  token: string
  expiresIn: number
}

// POST /api/v1/clients/login  ← ClientController
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const res = await api.post('/clients/login', data)
  return (res.data?.data ?? res.data) as AuthResponse
}

// POST /api/v1/clients/register  ← ClientController
export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const res = await api.post('/clients/register', data)
  return (res.data?.data ?? res.data) as AuthResponse
}

// POST /api/v1/auth/logout  ← ClientController
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout')
}

// POST /api/v1/auth/refresh  ← ClientController
export const refreshToken = async (): Promise<AuthResponse> => {
  const res = await api.post('/auth/refresh')
  return (res.data?.data ?? res.data) as AuthResponse
}

// GET /api/v1/clients/me  ← ClientController
export const getMe = async (): Promise<User> => {
  const res = await api.get('/clients/me')
  return (res.data?.data ?? res.data) as User
}
