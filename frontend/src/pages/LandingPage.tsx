import { useState, useEffect, useCallback } from 'react'
import styles from './LandingPage.module.css'
import MountainCanvas from '../components/MountainCanvas'

export default function LandingPage() {
  const [entered, setEntered] = useState(false)

  const handleEnter = useCallback(() => setEntered(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') handleEnter() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleEnter])

  return (
    <div className={styles.root}>
      <MountainCanvas />

      {entered && (
        <div className={styles.machineOverlay}>
          <TimeMachine />
        </div>
      )}

      {!entered && (
        <main className={styles.content}>
          <h1 className={styles.title}>
            RE<span className={styles.colon}>:</span>ONE
          </h1>
          <p className={styles.subtitle}>
            A personal time machine. Ask anything. Live it again.
          </p>
          <button className={styles.enterBtn} onClick={handleEnter}>
            Enter the Archive
          </button>
        </main>
      )}
    </div>
  )
}

function TimeMachine() {
  return (
    <>
      <svg
        className={styles.gear}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeDasharray="10 5" />
        <circle cx="100" cy="100" r="65" stroke="rgba(255,255,255,0.6)" strokeWidth="5" fill="rgba(180,220,255,0.08)" />
        <circle cx="100" cy="100" r="30" stroke="rgba(180,220,255,0.7)" strokeWidth="2" fill="none" />
        <circle cx="100" cy="100" r="10" fill="rgba(255,255,255,0.8)" />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          const x1 = 100 + 65 * Math.cos(angle)
          const y1 = 100 + 65 * Math.sin(angle)
          const x2 = 100 + 82 * Math.cos(angle)
          const y2 = 100 + 82 * Math.sin(angle)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.75)" strokeWidth="10" strokeLinecap="round" />
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 * Math.PI) / 180
          const x2 = 100 + 55 * Math.cos(angle)
          const y2 = 100 + 55 * Math.sin(angle)
          return <line key={i} x1="100" y1="100" x2={x2} y2={y2} stroke="rgba(180,220,255,0.6)" strokeWidth="2" />
        })}
      </svg>
      <p className={styles.machineLabel}>Stepping through time...</p>
    </>
  )
}
