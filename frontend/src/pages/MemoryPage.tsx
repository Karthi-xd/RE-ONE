import { useEffect, useState } from 'react'
import styles from './MemoryPage.module.css'

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

// Minimum time the loading screen stays up, even if the image is cached
// and loads instantly — keeps the transition feeling intentional rather
// than like a flicker.
const MIN_LOADING_MS = 700

interface MemoryPageProps {
  year: string
  onBack: () => void
}

export default function MemoryPage({ year, onBack }: MemoryPageProps) {
  const image = YEAR_IMAGES[year]
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setLoaded(false)
    let cancelled = false

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADING_MS))
    const imageReady = new Promise<void>((resolve) => {
      const preload = new window.Image()
      preload.src = image
      if (preload.complete) {
        resolve()
      } else {
        preload.onload = () => resolve()
        preload.onerror = () => resolve()
      }
    })

    Promise.all([minDelay, imageReady]).then(() => {
      if (!cancelled) setLoaded(true)
    })

    return () => {
      cancelled = true
    }
  }, [image])

  return (
    <div className={styles.root}>
      <div className={`${styles.loading} ${loaded ? styles.loadingHidden : ''}`}>
        <div className={styles.spinner} />
        <div className={styles.loadingText}>Loading {year}…</div>
      </div>

      <img
        src={image}
        alt={`A memory from ${year}`}
        className={`${styles.photo} ${loaded ? styles.photoVisible : ''}`}
      />

      <button
        type="button"
        className={styles.backBtn}
        onClick={onBack}
        style={{ opacity: loaded ? 1 : 0, pointerEvents: loaded ? 'auto' : 'none' }}
      >
        ← Back
      </button>
    </div>
  )
}