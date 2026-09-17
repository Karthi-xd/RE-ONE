import { useEffect, useState } from 'react'
import shared from './shared.module.css'
import styles from './RagApp.module.css'
import { YEARS as FALLBACK_YEARS } from './ExplorerApp'

const API_BASE = 'http://127.0.0.1:8000/api'
const YEARS_API_ENDPOINT = `${API_BASE}/years`
const RAG_API_ENDPOINT = `${API_BASE}/chat`

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
  const [year, setYear] = useState(prefillYear || '')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [yearsLoaded, setYearsLoaded] = useState(false)
  const [status, setStatus] = useState('Enter a question and press Search.')
  const [statusBar, setStatusBar] = useState('Ready')
  const [isError, setIsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ResultCard[] | null>(null)

  // Ask the backend which years actually have ingested data, instead of
  // trusting a hardcoded list that can drift out of sync (e.g. showing
  // 2019/2020 in the UI when only 2015-2018 were ever ingested).
  useEffect(() => {
    let cancelled = false

    async function loadYears() {
      try {
        const response = await fetch(YEARS_API_ENDPOINT)
        if (!response.ok) throw new Error(`status ${response.status}`)
        const data = await response.json()
        const years: string[] = (data.years || []).map((y: number) => String(y))

        if (cancelled) return

        if (years.length > 0) {
          setAvailableYears(years)
          setYear((current) => (current && years.includes(current) ? current : (prefillYear && years.includes(prefillYear) ? prefillYear : years[0])))
        } else {
          // Backend is up but nothing has been ingested yet.
          setAvailableYears([])
        }
      } catch {
        if (cancelled) return
        // Backend unreachable (e.g. not started yet) - fall back to the
        // static list so the UI is still browsable, but a real search
        // will simply fail with a clear error until the backend is up.
        setAvailableYears(FALLBACK_YEARS)
        setYear((current) => current || prefillYear || FALLBACK_YEARS[0])
      } finally {
        if (!cancelled) setYearsLoaded(true)
      }
    }

    loadYears()
    return () => {
      cancelled = true
    }
  }, [prefillYear])

  async function runSearch() {
    const q = query.trim()
    if (!q) {
      setIsError(false)
      setStatus('Please enter a question first.')
      return
    }
    if (!year) {
      setIsError(true)
      setStatus('No years are available yet. Ingest some data first.')
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
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.detail || `RAG backend returned ${response.status}: ${response.statusText}`)
      }
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
                disabled={!yearsLoaded || availableYears.length === 0}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button className={shared.winBtn} disabled={loading || !year} onClick={runSearch}>
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