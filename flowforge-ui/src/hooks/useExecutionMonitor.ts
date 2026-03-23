import { useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type { StepExecution } from '../types'
import { getExecutionSteps } from '../api/executions'

const isDummyMode = import.meta.env.VITE_DUMMY_MODE === 'true'

interface ExecutionMonitorState {
  steps: StepExecution[]
  status: string
  isConnected: boolean
  error: string | null
}

export function useExecutionMonitor(executionId: string | null) {
  const [state, setState] = useState<ExecutionMonitorState>({
    steps: [],
    status: 'UNKNOWN',
    isConnected: false,
    error: null,
  })

  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)

  const loadInitialSteps = useCallback(async () => {
    if (!executionId) return
    try {
      const steps = await getExecutionSteps(executionId)
      setState((prev) => ({ ...prev, steps }))
    } catch (err) {
      console.error('Failed to load initial steps', err)
    }
  }, [executionId])

  useEffect(() => {
    if (!executionId) return

    loadInitialSteps()

    // In dummy mode there is no real WebSocket server — skip the STOMP connection
    // entirely to avoid noisy connection errors in the console.
    if (isDummyMode) return

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        setState((prev) => ({ ...prev, isConnected: true, error: null }))

        const sub = client.subscribe(`/topic/executions/${executionId}`, (message) => {
          try {
            const payload = JSON.parse(message.body)
            if (payload.type === 'STEP_UPDATE') {
              const updatedStep: StepExecution = payload.step
              setState((prev) => ({
                ...prev,
                steps: prev.steps.some((s) => s.id === updatedStep.id)
                  ? prev.steps.map((s) => (s.id === updatedStep.id ? updatedStep : s))
                  : [...prev.steps, updatedStep],
              }))
            } else if (payload.type === 'EXECUTION_STATUS') {
              setState((prev) => ({ ...prev, status: payload.status }))
            }
          } catch (e) {
            console.error('Failed to parse WS message', e)
          }
        })

        subscriptionRef.current = sub
      },
      onDisconnect: () => {
        setState((prev) => ({ ...prev, isConnected: false }))
      },
      onStompError: (frame) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: frame.headers['message'] || 'WebSocket error',
        }))
      },
    })

    client.activate()
    clientRef.current = client

    return () => {
      subscriptionRef.current?.unsubscribe()
      client.deactivate()
      clientRef.current = null
    }
  }, [executionId, loadInitialSteps])

  return state
}
