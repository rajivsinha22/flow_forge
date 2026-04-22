import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Send, Loader2, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { sendChatMessage, type ChatMessage, type ChatCitation } from '../api/aiChat'
import { useChatMessageLimit } from '../hooks/usePlanEnforcement'

type Thread = {
  role: 'user' | 'assistant'
  content: string
  citations?: ChatCitation[]
}

const AiChat: React.FC = () => {
  const [messages, setMessages] = useState<Thread[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [usedToday, setUsedToday] = useState(0)
  const [limitPerDay, setLimitPerDay] = useState<number>(-1)
  const [limitReached, setLimitReached] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { canSendChatMessage } = useChatMessageLimit()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isLoading])

  const atLimit = limitPerDay !== -1 && usedToday >= limitPerDay

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const check = canSendChatMessage(usedToday)
    if (!check.allowed) {
      setLimitReached(true)
      setError(check.reason ?? 'Limit reached')
      return
    }

    setError(null)
    const userMsg: Thread = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const history: ChatMessage[] = messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await sendChatMessage(trimmed, history)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer, citations: res.citations },
      ])
      setUsedToday(res.usedToday)
      setLimitPerDay(res.limitPerDay)
    } catch (err: any) {
      const status = err?.response?.status
      const code = err?.response?.data?.code
      if (status === 403 && (code === 'PLAN_LIMIT_EXCEEDED' || /limit/i.test(err?.response?.data?.message || ''))) {
        setLimitReached(true)
        setError('You have reached your daily AI chat limit. Upgrade your plan to continue.')
      } else {
        setError(err?.response?.data?.message || 'Unable to send message right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const usageLabel = limitPerDay === -1 ? 'Unlimited' : `${usedToday} / ${limitPerDay} messages today`

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-2">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI Insights</h1>
            <p className="text-xs text-gray-500">
              Ask about your executions, workflows, and failures in plain English.
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
          {usageLabel}
        </div>
      </div>

      {limitReached && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle size={16} />
            <span>{error ?? 'Daily AI chat limit reached.'}</span>
          </div>
          <Link
            to="/billing"
            className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg"
          >
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 mb-4">
                <Sparkles size={24} className="text-violet-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ask FlowForge AI anything</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Try: "Why did the order-processing workflow fail last night?" or "Show me my slowest workflows."
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {msg.citations.map((c, i) => {
                      const to = c.type === 'execution' ? `/executions/${c.id}` : `/workflows/${c.id}/designer`
                      return (
                        <Link
                          key={i}
                          to={to}
                          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition-colors"
                        >
                          {c.label}
                          <ArrowUpRight size={11} />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          {error && !limitReached && (
            <div className="flex justify-center">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2 text-xs">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 sm:px-8 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={atLimit ? 'Daily limit reached — upgrade to continue' : 'Ask about your workflows, executions, or failures...'}
              disabled={atLimit || isLoading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 max-h-40"
              style={{ minHeight: '48px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || atLimit}
              className="flex items-center justify-center gap-1.5 px-4 h-12 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Send
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Press Enter to send, Shift + Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AiChat
