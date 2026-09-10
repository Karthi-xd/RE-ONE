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

interface MemoryPageProps {
  year: string
  onBack: () => void
}

export default function MemoryPage({ year, onBack }: MemoryPageProps) {
  const image = YEAR_IMAGES[year]

  return (
    <div className={styles.root}>
      <img src={image} alt={`A memory from ${year}`} className={styles.photo} />
      <button type="button" className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>
    </div>
  )
}