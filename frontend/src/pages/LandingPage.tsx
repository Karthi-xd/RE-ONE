import deskScene from '../assets/desk-scene.png'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  return (
    <div className={styles.root}>
      <img
        src={deskScene}
        alt="A leather diary labeled 2015-2020 resting on a wooden desk"
        className={styles.scene}
      />
    </div>
  )
}
