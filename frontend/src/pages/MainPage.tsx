import { useState } from 'react'
import YearWindow from '../components/YearWindow'
import styles from './MainPage.module.css'

const YEARS = ['2015', '2016', '2017', '2018', '2019', '2020']

export default function MainPage() {
  const [openYear, setOpenYear] = useState<string | null>(null)

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
      </div>

      {openYear && (
        <YearWindow year={openYear} onClose={() => setOpenYear(null)} />
      )}
    </div>
  )
}