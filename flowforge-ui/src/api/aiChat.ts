import api from './axios'
import { unwrap } from './utils'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export type ChatCitation = {
  type: 'execution' | 'workflow'
  id: string
  label: string
}

export type ChatResponse = {
  answer: string
  citations: ChatCitation[]
  usedToday: number
  limitPerDay: number
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<ChatResponse> {
  const res = await api.post('/ai/chat', { message, history })
  return unwrap<ChatResponse>(res.data)
}
