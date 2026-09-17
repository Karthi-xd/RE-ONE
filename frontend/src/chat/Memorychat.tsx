import { useEffect, useRef, useState } from 'react'
import styles from './MemoryChat.module.css'
import { Message, MessageContent, MessageSources, MessageError, TypingIndicator } from './Message'
import { PromptInput } from './PromptInput'
import { useChatStream } from './useChatStream'

interface MemoryChatProps {
  /** The year whose knowledge base this conversation is scoped to. */
  year: string
}

/**
 * Full-screen AI chat takeover for a single year, styled like the major
 * chat products (ChatGPT / Claude / Gemini) rather than a chrome-heavy
 * "app": no avatars, no window frame, a centered composer that starts in
 * the middle of the screen and migrates to the bottom once the
 * conversation begins. Launches from a small pill over the photo and
 * takes over the full viewport - this is the point of the project, not a
 * bolted-on widget.
 */
export default function MemoryChat({ year }: MemoryChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChatStream(year)
  const hasMessages = messages.length > 0
  const isBusy = status === 'submitted' || status === 'streaming'

  // Auto-scroll to the latest message as the answer streams in.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Lock page scroll while the takeover is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function submit() {
    const value = input.trim()
    if (!value || isBusy) return
    sendMessage(value)
    setInput('')
  }

  if (!open) {
    return (
      <button type="button" className={styles.launcher} onClick={() => setOpen(true)}>
        <span className={styles.sparkle}>✦</span>
        Ask about {year}
      </button>
    )
  }

  return (
    <div className={styles.overlay} role="dialog" aria-label={`Conversation about ${year}`}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.yearBadge}>{year}</span>
          <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close">
            ✕
          </button>
        </header>

        {!hasMessages ? (
          <div className={styles.hero}>
            <div className={styles.heroInput}>
              <PromptInput
                value={input}
                onChange={setInput}
                onSubmit={submit}
                disabled={isBusy}
                placeholder={`Ask about ${year}…`}
                status={status}
              />
            </div>
          </div>
        ) : (
          <>
            <div className={styles.thread} ref={scrollRef}>
              <div className={styles.threadInner}>
                {messages.map((m) => (
                  <Message from={m.role} key={m.id}>
                    <MessageContent>
                      {m.role === 'assistant' && m.text === '' && !m.error ? <TypingIndicator /> : m.text}
                    </MessageContent>
                    {m.error && <MessageError text={m.error} />}
                    {m.sources && m.sources.length > 0 && <MessageSources sources={m.sources} />}
                  </Message>
                ))}
              </div>
            </div>

            <div className={styles.composerBar}>
              <div className={styles.composerInner}>
                <PromptInput
                  value={input}
                  onChange={setInput}
                  onSubmit={() => submit()}
                  disabled={isBusy}
                  placeholder={`Ask about ${year}…`}
                  status={status}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}