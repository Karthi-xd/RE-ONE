import { useRef, useState } from 'react'
import styles from './MemoryApp.module.css'

// Static imports so Vite bundles + hashes these correctly.
import img2015 from '../../assets/years/2015.jpg'
import img2016 from '../../assets/years/2016.jpg'
import img2017 from '../../assets/years/2017.jpg'
import img2018 from '../../assets/years/2018.jpg'
import img2019 from '../../assets/years/2019.jpg'
import img2020 from '../../assets/years/2020.jpg'

const YEAR_IMAGES: Record<string, string> = {
  '2015': img2015,
  '2016': img2016,
  '2017': img2017,
  '2018': img2018,
  '2019': img2019,
  '2020': img2020,
}

// Swap this in later for the real backend call — same shape as RagApp's fetch.
// const RAG_API_ENDPOINT = 'http://127.0.0.1:8000/api/chat'

interface Message {
  id: number
  role: 'assistant' | 'user'
  text: string
}

interface MemoryAppProps {
  year: string
}

function openingLine(year: string) {
  return `You're back in ${year}. Ask me anything about it, or just sit with the photo for a moment.`
}

export default function MemoryApp({ year }: MemoryAppProps) {
  const image = YEAR_IMAGES[year]
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', text: openingLine(year) },
  ])
  const [draft, setDraft] = useState('')
  const idRef = useRef(1)

  function send() {
    const text = draft.trim()
    if (!text) return
    const userMsg: Message = { id: idRef.current++, role: 'user', text }

    // Placeholder reply until this is wired to the real RAG/chat backend.
    // Replace this block with a fetch(RAG_API_ENDPOINT, { question: text, year }) call.
    const reply: Message = {
      id: idRef.current++,
      role: 'assistant',
      text: `(Not connected to the archive yet — but I heard you ask about "${text}".)`,
    }

    setMessages((m) => [...m, userMsg, reply])
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') send()
  }

  return (
    <div className={styles.root}>
      <div className={styles.imgWrap}>
        <img src={image} alt={`A memory from ${year}`} className={styles.photo} />
      </div>
      <div className={styles.vignette} />
      <div className={styles.grain} />

      <div className={styles.tag}>
        <span className={styles.tagYear}>{year}</span>
        <span className={styles.tagLabel}>Historical Archive</span>
      </div>

      <div className={styles.chatDock}>
        <div className={styles.chatLog}>
          {messages.map((m) => (
            <div key={m.id} className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAi}`}>
              {m.text}
            </div>
          ))}
        </div>
        <div className={styles.chatInputRow}>
          <input
            className={styles.chatInput}
            type="text"
            placeholder={`Say something to ${year}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className={styles.chatSend} onClick={send}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}