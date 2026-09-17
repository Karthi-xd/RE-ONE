import type { KeyboardEvent } from 'react'
import styles from './PromptInput.module.css'
import type { ChatStatus } from './useChatStream'

interface PromptInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  status: ChatStatus
}

export function PromptInput({ value, onChange, onSubmit, disabled, placeholder, status }: PromptInputProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  const isBusy = status === 'submitted' || status === 'streaming'

  return (
    <div className={styles.root}>
      <textarea
        className={styles.textarea}
        value={value}
        placeholder={placeholder || 'Ask something…'}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
      />
      <button
        type="button"
        className={styles.submit}
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        aria-label={isBusy ? 'Sending' : 'Send message'}
      >
        {isBusy ? <span className={styles.spinner} /> : '↑'}
      </button>
    </div>
  )
}