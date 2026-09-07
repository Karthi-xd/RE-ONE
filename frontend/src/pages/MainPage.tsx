import { useRef, useState } from 'react'
import YearWindow from '../components/YearWindow'
import Notepad from '../components/Notepad'
import Calculator from '../components/Calculator'
import Paint from '../components/Paint'
import styles from './MainPage.module.css'

const YEARS = ['2015', '2016', '2017', '2018', '2019', '2020']

type AppId = 'notepad' | 'calculator' | 'paint'

interface OpenApp {
  id: AppId
  zIndex: number
  x: number
  y: number
}

const APPS: { id: AppId; icon: string; label: string }[] = [
  { id: 'notepad', icon: '📝', label: 'Notepad' },
  { id: 'paint', icon: '🎨', label: 'Paint' },
  { id: 'calculator', icon: '🧮', label: 'Calculator' },
]

export default function MainPage() {
  const [openYear, setOpenYear] = useState<string | null>(null)
  const [openApps, setOpenApps] = useState<OpenApp[]>([])
  const zCounter = useRef(1)

  function nextZ() {
    zCounter.current += 1
    return zCounter.current
  }

  function openApp(id: AppId) {
    setOpenApps((prev) => {
      const existing = prev.find((a) => a.id === id)
      if (existing) {
        return prev.map((a) => (a.id === id ? { ...a, zIndex: nextZ() } : a))
      }
      const offset = prev.length * 28
      return [...prev, { id, zIndex: nextZ(), x: 140 + offset, y: 90 + offset }]
    })
  }

  function focusApp(id: AppId) {
    setOpenApps((prev) => prev.map((a) => (a.id === id ? { ...a, zIndex: nextZ() } : a)))
  }

  function closeApp(id: AppId) {
    setOpenApps((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className={styles.desktop}>
      <div className={styles.iconGrid}>
        {YEARS.map((year) => (
          <button
            key={year}
            className={styles.yearIcon}
            onDoubleClick={() => setOpenYear(year)}
          >
            <div className={styles.folderGlyph}>📁</div>
            <div className={styles.yearLabel}>{year}</div>
          </button>
        ))}

        {APPS.map((app) => (
          <button
            key={app.id}
            className={styles.yearIcon}
            onDoubleClick={() => openApp(app.id)}
          >
            <div className={styles.folderGlyph}>{app.icon}</div>
            <div className={styles.yearLabel}>{app.label}</div>
          </button>
        ))}
      </div>

      {openYear && (
        <YearWindow year={openYear} onClose={() => setOpenYear(null)} />
      )}

      {openApps.map((app) => {
        const shared = {
          key: app.id,
          zIndex: app.zIndex,
          initialX: app.x,
          initialY: app.y,
          onClose: () => closeApp(app.id),
          onFocus: () => focusApp(app.id),
        }
        if (app.id === 'notepad') return <Notepad {...shared} />
        if (app.id === 'calculator') return <Calculator {...shared} />
        return <Paint {...shared} />
      })}
    </div>
  )
}