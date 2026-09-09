import { useState } from 'react'
import shared from './shared.module.css'
import styles from './RagApp.module.css'
import { YEARS } from './ExplorerApp'

const RAG_API_ENDPOINT = 'http://127.0.0.1:8000/api/chat'

interface ResultCard {
  title?: string
  heading?: string
  year?: string | number
  date?: string
  snippet?: string
  text?: string
  content?: string
  source?: string
  document?: string
  doc?: string
  filename?: string
}

interface RagAppProps {
  prefillYear?: string
}

export default function RagApp({ prefillYear }: RagAppProps) {
  const [query, setQuery] = useState('')
  const [year, setYear] = useState(prefillYear || YEARS[0])
  const [status, setStatus] = useState('Enter a question and press Search.')
  const [statusBar, setStatusBar] = useState('Ready')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResultCard[] | null>(null)

  async function runSearch() {
    const q = query.trim()
    if (!q) {
      setIsError(false)
      setStatus('Please enter a question first.')
      return
    }
    setIsError(false)
    setStatus('Searching the archive…')
    setStatusBar('Searching…')
    setLoading(true)
    setResults(null)

    try {
      const response = await fetch(RAG_API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, year: Number(year) }),
      })
      if (!response.ok) throw new Error(`RAG backend returned ${response.status}: ${response.statusText}`)
      const data = await response.json()
      // Backend /api/chat returns { year, question, answer, sources: [...] }
      const list: ResultCard[] = (data.sources || []).map((s: any) => ({
        title: s.title,
        year: data.year,
        date: s.date,
        snippet: data.answer,
        source: s.source || s.category,
      }))
      setResults(list)
      setStatus(`Found ${list.length} result${list.length === 1 ? '' : 's'}.`)
      setStatusBar('Search complete.')
    } catch (err) {
      setIsError(true)
      setStatus('Search failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setStatusBar('Error.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') runSearch()
  }

  return (
    <>
      <div className={shared.menubar}>
        <span>File</span>
        <span>Edit</span>
        <span>Search</span>
        <span>Help</span>
      </div>
      <div className={shared.winBody}>
        <div className={styles.ragBody}>
          <div className={styles.ragPanel}>
            <div className={styles.ragRow}>
              <label htmlFor="rag-query">Question:</label>
              <input
                id="rag-query"
                className={`${shared.winInput} ${styles.input}`}
                type="text"
                placeholder="Ask something about the historical archive…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className={styles.ragRow}>
              <label htmlFor="rag-year">Year:</label>
              <select
                id="rag-year"
                className={shared.winSelect}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button className={shared.winBtn} disabled={loading} onClick={runSearch}>
                Search
              </button>
            </div>
            <div className={`${styles.ragStatus} ${isError ? styles.error : ''}`}>{status}</div>
          </div>

          {results && (
            <div className={styles.ragPanel}>
              <div className={styles.ragResultsTitle}>Results</div>
              {results.length === 0 && <div className={shared.emptyFolderMsg}>No results found for that question.</div>}
              {results.map((r, i) => {
                const title = r.title || r.heading || 'Untitled result'
                const y = r.year || r.date || ''
                const snippet = r.snippet || r.text || r.content || ''
                const source = r.source || r.document || r.doc || r.filename || ''
                return (
                  <div className={styles.resultCard} key={i}>
                    <h4>{title}</h4>
                    {y && (
                      <div className={styles.resultMeta}>
                        <span>Year: {y}</span>
                      </div>
                    )}
                    <div className={styles.resultSnippet}>{snippet}</div>
                    {source && <div className={styles.resultSource}>Source: {source}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div className={shared.statusbar}>
        <span>{statusBar}</span>
      </div>
    </>
  )
}