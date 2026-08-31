import { useState, useEffect, useCallback } from 'react'
import styles from './LandingPage.module.css'

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
      <Sky />
      <Horizon />
      <TreeLine />
      <Ground />

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

// ── Sky with drifting clouds ──────────────────────────────────────────────────

function Sky() {
  return (
    <div className={styles.sky}>
      <div className={styles.cloud} />
      <div className={styles.cloud} />
      <div className={styles.cloud} />
      <div className={styles.cloud} />
    </div>
  )
}

// ── Soft horizon glow ─────────────────────────────────────────────────────────

function Horizon() {
  return <div className={styles.horizon} />
}

// ── Distant blurred tree line ─────────────────────────────────────────────────

const TREES = Array.from({ length: 38 }, (_, i) => ({
  id: i,
  left: i * 2.8 + (Math.sin(i * 1.7) * 1.2),
  width: 18 + Math.abs(Math.sin(i * 0.9)) * 24,
  height: 40 + Math.abs(Math.sin(i * 1.3)) * 44,
  shade: `hsl(${110 + Math.sin(i) * 14}deg, ${48 + Math.sin(i * 2) * 12}%, ${22 + Math.sin(i * 1.1) * 8}%)`,
}))

function TreeLine() {
  return (
    <div className={styles.trees}>
      {TREES.map(t => (
        <div
          key={t.id}
          className={styles.tree}
          style={{
            left: `${t.left}%`,
            borderLeftWidth: `${t.width / 2}px`,
            borderRightWidth: `${t.width / 2}px`,
            borderBottomWidth: `${t.height}px`,
            borderBottomColor: t.shade,
          }}
        />
      ))}
    </div>
  )
}

// ── Ground: grass blades + wildflowers + wind ripples ────────────────────────

const BLADES = Array.from({ length: 180 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  bottom: Math.random() * 60,
  height: 18 + Math.random() * 55,
  width: 2 + Math.random() * 3,
  hue: 90 + Math.random() * 30,
  lightness: 28 + Math.random() * 22,
  swayFrom: `${-4 - Math.random() * 6}deg`,
  swayTo: `${4 + Math.random() * 6}deg`,
  duration: `${2.5 + Math.random() * 2.5}s`,
  delay: `${-Math.random() * 4}s`,
}))

const FLOWERS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  bottom: 2 + Math.random() * 55,
  size: 4 + Math.random() * 7,
  hue: [50, 280, 0, 35, 190][Math.floor(Math.random() * 5)],
  saturation: 70 + Math.random() * 30,
  lightness: 65 + Math.random() * 20,
  swayFrom: `${-5 - Math.random() * 4}deg`,
  swayTo: `${5 + Math.random() * 4}deg`,
  duration: `${2 + Math.random() * 3}s`,
  delay: `${-Math.random() * 4}s`,
}))

const RIPPLES = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  top: `${15 + i * 14}%`,
  duration: `${5 + i * 1.8}s`,
  delay: `${-i * 2.1}s`,
  opacity: 0.6 - i * 0.08,
}))

function Ground() {
  return (
    <div className={styles.ground}>
      <div className={styles.sunlight} />

      {RIPPLES.map(r => (
        <div
          key={r.id}
          className={styles.windRipple}
          style={{
            top: r.top,
            animationDuration: r.duration,
            animationDelay: r.delay,
            opacity: r.opacity,
          }}
        />
      ))}

      {BLADES.map(b => (
        <div
          key={b.id}
          className={styles.blade}
          style={{
            left: `${b.left}%`,
            bottom: `${b.bottom}%`,
            height: `${b.height}px`,
            width: `${b.width}px`,
            background: `hsl(${b.hue}deg, 55%, ${b.lightness}%)`,
            '--sway-from': b.swayFrom,
            '--sway-to': b.swayTo,
            animationDuration: b.duration,
            animationDelay: b.delay,
          } as React.CSSProperties}
        />
      ))}

      {FLOWERS.map(f => (
        <div
          key={f.id}
          className={styles.flower}
          style={{
            left: `${f.left}%`,
            bottom: `${f.bottom}%`,
            width: `${f.size}px`,
            height: `${f.size}px`,
            background: `hsl(${f.hue}deg, ${f.saturation}%, ${f.lightness}%)`,
            '--sway-from': f.swayFrom,
            '--sway-to': f.swayTo,
            animationDuration: f.duration,
            animationDelay: f.delay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// ── Time Machine ──────────────────────────────────────────────────────────────

function TimeMachine() {
  return (
    <>
      <svg
        className={styles.gear}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="90" stroke="#4a7820" strokeWidth="2" strokeDasharray="10 5" opacity="0.4" />
        <circle cx="100" cy="100" r="65" stroke="#5a8f28" strokeWidth="5" fill="rgba(200,232,122,0.15)" />
        <circle cx="100" cy="100" r="30" stroke="#7aab52" strokeWidth="2" fill="none" opacity="0.7" />
        <circle cx="100" cy="100" r="10" fill="#5a8f28" opacity="0.9" />
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          const x1 = 100 + 65 * Math.cos(angle)
          const y1 = 100 + 65 * Math.sin(angle)
          const x2 = 100 + 82 * Math.cos(angle)
          const y2 = 100 + 82 * Math.sin(angle)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a8f28" strokeWidth="10" strokeLinecap="round" />
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 60 * Math.PI) / 180
          const x2 = 100 + 55 * Math.cos(angle)
          const y2 = 100 + 55 * Math.sin(angle)
          return <line key={i} x1="100" y1="100" x2={x2} y2={y2} stroke="#7aab52" strokeWidth="2" opacity="0.6" />
        })}
      </svg>
      <p className={styles.machineLabel}>Stepping through time...</p>
    </>
  )
}
