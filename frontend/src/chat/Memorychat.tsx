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
 * Full-screen AI chat, styled like the major chat products (ChatGPT /
 * Claude / Gemini): no avatars, no window frame, no launcher step, no
 * close affordance of its own - it's simply there the moment this year's
 * memory opens, for as long as you're on that photo. Composer starts
 * centered low over the photo and migrates to a pinned bottom bar once
 * the conversation begins.
 */
export default function MemoryChat({ year }: MemoryChatProps) {
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

  function submit() {
    const value = input.trim()
    if (!value || isBusy) return
    sendMessage(value)
    setInput('')
  }

  return (
    <div className={styles.overlay} role="dialog" aria-label={`Conversation about ${year}`}>
      <div className={styles.shell}>
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
                  onSubmit={submit}
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