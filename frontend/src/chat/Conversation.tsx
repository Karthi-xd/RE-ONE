import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Conversation.module.css'

interface ConversationProps {
  children: ReactNode
  className?: string
}

/**
 * Scrollable message list that sticks to the bottom as new content streams
 * in, but stops auto-scrolling the moment the user scrolls up to read
 * something earlier - and shows a button to jump back down. Mirrors the
 * behavior of AI Elements' <Conversation />.
 */
export function Conversation({ children, className }: ConversationProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // No dependency array on purpose: this should re-check "should we stick
  // to the bottom" after every render, since streamed tokens arrive as
  // frequent re-renders and we want to track the last one.
  useEffect(() => {
    const el = contentRef.current
    if (!el || !isAtBottom) return
    el.scrollTop = el.scrollHeight
  })

  function handleScroll() {
    const el = contentRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setIsAtBottom(distanceFromBottom < 48)
  }

  function scrollToBottom() {
    const el = contentRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    setIsAtBottom(true)
  }

  return (
    <div className={`${styles.root} ${className || ''}`}>
      <div className={styles.content} ref={contentRef} onScroll={handleScroll}>
        {children}
      </div>
      {!isAtBottom && (
        <button
          type="button"
          className={styles.scrollButton}
          onClick={scrollToBottom}
          aria-label="Scroll to latest message"
        >
          ↓ New messages
        </button>
      )}
    </div>
  )
}

export function ConversationEmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode
  title: string
  description?: string
}) {
  return (
    <div className={styles.emptyState}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <div className={styles.emptyTitle}>{title}</div>
      {description && <div className={styles.emptyDescription}>{description}</div>}
    </div>
  )
}