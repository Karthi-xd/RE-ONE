import { useEffect, useState } from 'react'
import DesktopWindow from './DesktopWindow'
import styles from './Notepad.module.css'

interface NotepadProps {
  zIndex: number
  initialX?: number
  initialY?: number
  onClose: () => void
  onFocus: () => void
}

const STORAGE_KEY = 're-one-notepad-content'

export default function Notepad({ zIndex, initialX, initialY, onClose, onFocus }: NotepadProps) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setText(saved)
  }, [])

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, text)
    setStatus('Saved')
    setTimeout(() => setStatus(''), 1500)
  }

  return (
    <DesktopWindow
      title="Untitled - Notepad"
      icon="📝"
      width={460}
      zIndex={zIndex}
      initialX={initialX}
      initialY={initialY}
      onClose={onClose}
      onFocus={onFocus}
    >
      <div className={styles.menubar}>
        <span>File</span>
        <span>Edit</span>
        <span>Format</span>
        <span>View</span>
      </div>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something..."
      />
      <div className={styles.footer}>
        <button className={styles.saveBtn} onClick={handleSave}>
          Save
        </button>
        {status && <span className={styles.status}>{status}</span>}
      </div>
    </DesktopWindow>
  )
}