import type { ReactNode } from 'react'
import styles from './Message.module.css'
import type { ChatSource } from './useChatStream'

interface MessageProps {
  from: 'user' | 'assistant'
  children: ReactNode
}

export function Message({ from, children }: MessageProps) {
  return (
    <div className={`${styles.row} ${from === 'user' ? styles.fromUser : styles.fromAssistant}`}>
      <div className={styles.bubble}>{children}</div>
    </div>
  )
}

export function MessageContent({ children }: { children: ReactNode }) {
  return <div className={styles.content}>{children}</div>
}

export function TypingIndicator() {
  return (
    <span className={styles.typing} aria-label="Typing">
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  )
}

export function MessageSources({ sources }: { sources: ChatSource[] }) {
  if (!sources.length) return null
  return (
    <div className={styles.sources}>
      <div className={styles.sourcesLabel}>Sources</div>
      <ul>
        {sources.map((s, i) => (
          <li key={i}>
            <span className={styles.sourceTitle}>{s.title || 'Untitled'}</span>
            {s.date && <span className={styles.sourceMeta}> · {s.date}</span>}
            {(s.category || s.source) && (
              <span className={styles.sourceMeta}> · {s.category || s.source}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function MessageError({ text }: { text: string }) {
  return <div className={styles.error}>⚠ {text}</div>
}