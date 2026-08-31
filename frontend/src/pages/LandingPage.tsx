import { useState, useEffect, useCallback } from 'react'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const [entered, setEntered] = useState(false)
  const [glitch, setGlitch] = useState(false)

  // Random scanline flicker
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitch(true)
        setTimeout(() => setGlitch(false), 120)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleEnter = useCallback(() => {
    setEntered(true)
  }, [])

  // Keyboard: press Enter to enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleEnter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleEnter])

  return (
    <div className={`${styles.root} ${glitch ? styles.glitch : ''}`}>
      {/* Fog / gradient background layers */}
      <div className={styles.fogLayer} />
      <div className={styles.gridLayer} />
      <div className={styles.scanlines} />

      {/* Rain streaks */}
      <Rain />

      {/* Time machine / gear — shown after Enter */}
      {entered && (
        <div className={styles.machineOverlay}>
          <TimeMachine />
        </div>
      )}

      {/* Main content */}
      {!entered && (
        <main className={styles.content}>
          <p className={styles.eyebrow}>MEMORY ARCHIVE // INITIALIZING</p>

          <h1 className={styles.title}>
            RE<span className={styles.colon}>:</span>ONE
          </h1>

          <p className={styles.subtitle}>
            A personal time machine.<br />
            Ask anything. Live it again.
          </p>

          <button className={styles.enterBtn} onClick={handleEnter}>
            ENTER THE ARCHIVE
          </button>

          <p className={styles.hint}>or press <kbd className={styles.kbd}>ENTER</kbd></p>
        </main>
      )}
    </div>
  )
}

// ── Rain ──────────────────────────────────────────────────────────────────────

function Rain() {
  const drops = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 4,
    duration: 0.6 + Math.random() * 1.2,
    opacity: 0.08 + Math.random() * 0.18,
    height: 40 + Math.random() * 80,
  }))

  return (
    <div className={styles.rain} aria-hidden>
      {drops.map(d => (
        <span
          key={d.id}
          className={styles.drop}
          style={{
            left: `${d.left}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            opacity: d.opacity,
            height: `${d.height}px`,
          }}
        />
      ))}
    </div>
  )
}

// ── Time Machine (giant spinning gear) ───────────────────────────────────────

function TimeMachine() {
  return (
    <div className={styles.timeMachine}>
      <svg
        className={styles.gear}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Time machine activating"
      >
        {/* Outer ring */}
        <circle cx="100" cy="100" r="90" stroke="#f5a623" strokeWidth="3" strokeDasharray="12 6" opacity="0.6" />
        {/* Gear body */}
        <circle cx="100" cy="100" r="65" stroke="#f5a623" strokeWidth="6" fill="rgba(15,10,3,0.9)" />
        {/* Inner ring */}
        <circle cx="100" cy="100" r="30" stroke="#00c8c8" strokeWidth="2" fill="none" opacity="0.8" />
        {/* Hub */}
        <circle cx="100" cy="100" r="10" fill="#f5a623" opacity="0.9" />
        {/* Gear teeth — 12 teeth */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          const x1 = 100 + 65 * Math.cos(angle)
          const y1 = 100 + 65 * Math.sin(angle)
          const x2 = 100 + 82 * Math.cos(angle)
          const y2 = 100 + 82 * Math.sin(angle)
          return (
            <line
              key={i}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke="#f5a623"
              strokeWidth="10"
              strokeLinecap="round"
            />
          )
        })}
        {/* Spokes */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 * Math.PI) / 180
          const x2 = 100 + 55 * Math.cos(angle)
          const y2 = 100 + 55 * Math.sin(angle)
          return (
            <line
              key={i}
              x1="100" y1="100"
              x2={x2} y2={y2}
              stroke="#00c8c8"
              strokeWidth="2"
              opacity="0.7"
            />
          )
        })}
      </svg>

      <p className={styles.machineLabel}>INITIALIZING ARCHIVE...</p>
    </div>
  )
}
