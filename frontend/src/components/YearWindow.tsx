import { useState } from 'react'
import styles from './YearWindow.module.css'

interface YearWindowProps {
  year: string
  onClose: () => void
}

interface ResultCard {
  title: string
  year: string | number
  snippet: string
  source: string
}

export default function YearWindow({ year, onClose }: YearWindowProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResultCard[]>([])
  const [status, setStatus] = useState('Ask something and press Search.')
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    if (!query.trim()) {
      setStatus('Please enter a question first.')
      return
    }
    setLoading(true)
    setStatus('Searching...')
    try {
      const response = await fetch('http://127.0.0.1:8000/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, year }),
      })
      const data = await response.json()
      setResults(data.results || [])
      setStatus(`Found ${data.results?.length ?? 0} result(s).`)
    } catch {
      setStatus('Search failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.window}>
        <div className={styles.titlebar}>
          <span>{year}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="text"
              placeholder={`Ask something about ${year}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className={styles.searchBtn} onClick={handleSearch} disabled={loading}>
              Search
            </button>
          </div>

          <div className={styles.status}>{status}</div>

          <div className={styles.results}>
            {results.map((r, i) => (
              <div key={i} className={styles.card}>
                <h4>{r.title}</h4>
                {r.year && <div className={styles.meta}>Year: {r.year}</div>}
                <div className={styles.snippet}>{r.snippet}</div>
                {r.source && <div className={styles.source}>Source: {r.source}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}