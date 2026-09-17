import type { CSSProperties } from 'react'
import styles from './MemoryPage.module.css'
import SeasonalOverlay from './SeasonalOverlay'
import MemoryChat from '../chat/MemoryChat'

// Static imports so Vite bundles + hashes these correctly.
import img2015 from '../assets/years/2015.jpg'
import img2016 from '../assets/years/2016.jpg'
import img2017 from '../assets/years/2017.jpg'
import img2018 from '../assets/years/2018.jpg'
import img2019 from '../assets/years/2019.jpg'
import img2020 from '../assets/years/2020.jpg'

const YEAR_IMAGES: Record<string, string> = {
  '2015': img2015,
  '2016': img2016,
  '2017': img2017,
  '2018': img2018,
  '2019': img2019,
  '2020': img2020,
}

interface MemoryPageProps {
  year: string
  origin?: DOMRect | null
  onBack: () => void
}

export default function MemoryPage({ year, origin, onBack }: MemoryPageProps) {
  const image = YEAR_IMAGES[year]

  // Anchors the zoom-in animation to the exact spot the user double-clicked,
  // so the page expands from that point instead of just cutting to a new
  // screen. Falls back to center when we don't have a click origin (e.g. a
  // future keyboard-only path).
  const originStyle = origin
    ? ({
        '--origin-x': `${origin.left + origin.width / 2}px`,
        '--origin-y': `${origin.top + origin.height / 2}px`,
      } as CSSProperties)
    : undefined

  return (
    <div className={styles.root} style={originStyle}>
      <div className={styles.scene}>
        <img src={image} alt={`A memory from ${year}`} className={styles.photo} />
        <SeasonalOverlay year={year} />
      </div>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>
      {/* Same chat for every year; `year` scopes it to that knowledge base. */}
      <MemoryChat year={year} />
    </div>
  )
}