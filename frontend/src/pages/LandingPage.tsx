import { useEffect, useRef, useState } from 'react'
import { createScene } from '../components/SceneCanvas'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const mountRef  = useRef<HTMLDivElement>(null)
  const [lifted, setLifted] = useState(false)

  useEffect(() => {
    if (!mountRef.current) return
    const scene = createScene(mountRef.current)
    scene.onCardLifted(() => setLifted(true))
    return () => scene.destroy()
  }, [])

  return (
    <div className={styles.root}>
      {/* Pixi canvas mounts here */}
      <div ref={mountRef} className={styles.canvas} />

      {/* "Next screen" fade — triggered when card is dragged off */}
      {lifted && <div className={styles.nextScreen} />}
    </div>
  )
}
