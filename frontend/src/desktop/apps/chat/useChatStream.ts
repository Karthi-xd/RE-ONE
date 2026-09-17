import { useCallback, useRef, useState } from 'react'

const API_BASE = 'http://127.0.0.1:8000/api'
const CHAT_STREAM_ENDPOINT = `${API_BASE}/chat/stream`

export interface ChatSource {
  title: string
  date: string
  category: string
  source: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  sources?: ChatSource[]
  error?: string
}

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Reads the raw SSE byte stream ("event: x\ndata: {...}\n\n" blocks) and
// yields parsed { event, data } records as each block completes. Handles
// chunk boundaries that split a block across multiple network reads.
async function* parseSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sep
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)

      let event = 'message'
      let data = ''
      for (const line of rawEvent.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (data) {
        try {
          yield { event, data: JSON.parse(data) }
        } catch {
          // Ignore a malformed frame rather than killing the whole stream.
        }
      }
    }
  }
}

/**
 * Chat state + streaming transport for the RAG endpoint. Shaped like
 * ai-sdk's useChat() ({ messages, sendMessage, status }) so the components
 * in this folder read the same way the AI Elements ones do, even though
 * they're talking to our own FastAPI SSE endpoint instead of the AI SDK's
 * `ai` package.
 */
export function useChatStream(year: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || !year) return

      const userMsg: ChatMessage = { id: makeId(), role: 'user', text: question }
      const assistantId = makeId()
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', text: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStatus('submitted')

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const response = await fetch(CHAT_STREAM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, year: Number(year) }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => null)
          throw new Error(body?.detail || `Server returned ${response.status}`)
        }

        setStatus('streaming')

        for await (const { event, data } of parseSSE(response.body)) {
          if (event === 'sources') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, sources: data.sources } : m))
            )
          } else if (event === 'chunk') {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + data.text } : m))
            )
          } else if (event === 'error') {
            throw new Error(data.detail || 'CGK had trouble answering that.')
          } else if (event === 'done') {
            break
          }
        }

        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Something went wrong.'
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, error: message } : m))
        )
        setStatus('error')
      }
    },
    [year]
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStatus('ready')
  }, [])

  return { messages, sendMessage, status, stop }
}