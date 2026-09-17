import { useEffect, useRef, useState } from 'react'
import styles from './MemoryChat.module.css'
import { Conversation, ConversationEmptyState } from './Conversation'
import { Message, MessageContent, MessageSources, MessageError, TypingIndicator } from './Message'
import { PromptInput } from './PromptInput'
import { useChatStream } from './useChatStream'

interface MemoryChatProps {
  /** The year whose knowledge base this conversation is scoped to. */
  year: string
}

/**
 * Floating chat panel for a single year's memory scene. Starts collapsed as a
 * pill so the photo stays the focus, and expands into a glass panel once the
 * user opens it. The same component is used for every year - the `year` prop
 * is the only thing that changes.
 */
export default function MemoryChat({ year }: MemoryChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const inputWrapRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChatStream(year)

  // Focus the composer as soon as the panel opens.
  useEffect(() => {
    if (!open) return
    const textarea = inputWrapRef.current?.querySelector('textarea')
    textarea?.focus()
  }, [open])

  // Escape closes the panel, but only when there's nothing streaming.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleSubmit() {
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput('')
  }

  const isBusy = status === 'submitted' || status === 'streaming'

  if (!open) {
    return (
      <button type="button" className={styles.launcher} onClick={() => setOpen(true)}>
        <span className={styles.launcherDot} />
        Ask about {year}
      </button>
    )
  }

  return (
    <div className={styles.panel} role="dialog" aria-label={`Conversation about ${year}`}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span className={styles.yearBadge}>{year}</span>
          <span className={styles.headerLabel}>{isBusy ? 'Thinking…' : 'Ask about this year'}</span>
        </div>
        <button
          type="button"
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Close conversation"
        >
          ✕
        </button>
      </header>

      <Conversation>
        {messages.length === 0 ? (
          <ConversationEmptyState
            title={`What do you want to know about ${year}?`}
            description="Ask about anything from this year and the answer comes back with its sources."
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

      <div ref={inputWrapRef}>
        <PromptInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isBusy}
          placeholder={`Ask about ${year}…`}
          status={status}
        />
      </div>
    </div>
  )
}