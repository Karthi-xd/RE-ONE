import { useEffect, useState } from 'react'
import shared from './shared.module.css'
import styles from './RagApp.module.css'
import { YEARS as FALLBACK_YEARS } from './ExplorerApp'
import { Conversation, ConversationEmptyState } from './chat/Conversation'
import { Message, MessageContent, MessageSources, MessageError, TypingIndicator } from './chat/Message'
import { PromptInput } from './chat/PromptInput'
import { useChatStream } from './chat/useChatStream'

const API_BASE = 'http://127.0.0.1:8000/api'
const YEARS_API_ENDPOINT = `${API_BASE}/years`

interface RagAppProps {
  prefillYear?: string
}

export default function RagApp({ prefillYear }: RagAppProps) {
  const [input, setInput] = useState('')
  const [year, setYear] = useState(prefillYear || '')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [yearsLoaded, setYearsLoaded] = useState(false)

  // Ask the backend which years actually have ingested data, instead of
  // trusting a hardcoded list that can drift out of sync.
  useEffect(() => {
    let cancelled = false

    async function loadYears() {
      try {
        const response = await fetch(YEARS_API_ENDPOINT)
        if (!response.ok) throw new Error(`status ${response.status}`)
        const data = await response.json()
        const years: string[] = (data.years || []).map((y: number) => String(y))

        if (cancelled) return

        if (years.length > 0) {
          setAvailableYears(years)
          setYear((current) => (current && years.includes(current) ? current : (prefillYear && years.includes(prefillYear) ? prefillYear : years[0])))
        } else {
          setAvailableYears([])
        }
      } catch {
        if (cancelled) return
        setAvailableYears(FALLBACK_YEARS)
        setYear((current) => current || prefillYear || FALLBACK_YEARS[0])
      } finally {
        if (!cancelled) setYearsLoaded(true)
      }
    }

    loadYears()
    return () => {
      cancelled = true
    }
  }, [prefillYear])

  const { messages, sendMessage, status } = useChatStream(year)

  function handleSubmit() {
    const text = input.trim()
    if (!text || !year) return
    sendMessage(text)
    setInput('')
  }

  const statusLabel =
    status === 'submitted' ? 'Thinking…' : status === 'streaming' ? 'Typing…' : status === 'error' ? 'Error.' : 'Ready'

  return (
    <>
      <div className={shared.menubar}>
        <span>File</span>
        <span>Edit</span>
        <span>Chat</span>
        <span>Help</span>
      </div>

      <div className={`${shared.winBody} ${styles.chatBody}`}>
        <div className={styles.chatHeader}>
          <label htmlFor="rag-year">Year:</label>
          <select
            id="rag-year"
            className={shared.winSelect}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!yearsLoaded || availableYears.length === 0}
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <Conversation>
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon="💬"
              title="Start a conversation"
              description={year ? `Ask CGK something about ${year}.` : 'Pick a year to begin.'}
            />
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent>
                  {m.role === 'assistant' && m.text === '' && !m.error ? <TypingIndicator /> : m.text}
                </MessageContent>
                {m.error && <MessageError text={m.error} />}
                {m.sources && m.sources.length > 0 && <MessageSources sources={m.sources} />}
              </Message>
            ))
          )}
        </Conversation>

        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={status === 'submitted' || status === 'streaming' || !year}
          placeholder={year ? `Ask CGK about ${year}…` : 'Select a year first…'}
          status={status}
        />
      </div>

      <div className={shared.statusbar}>
        <span>{statusLabel}</span>
      </div>
    </>
  )
}