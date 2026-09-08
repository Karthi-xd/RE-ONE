import { useEffect, useState } from 'react'
import shared from './shared.module.css'
import styles from './NotepadApp.module.css'

const STORAGE_KEY = 're-one-notepad-content'

export default function NotepadApp() {
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
    <>
      <div className={shared.menubar}>
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
        <button className={shared.winBtn} onClick={handleSave}>
          Save
        </button>
        {status && <span className={styles.status}>{status}</span>}
      </div>
    </>
  )
}
