import { useEffect, useRef } from 'react'
import deskScene from '../assets/desk-scene-extended.png'
import styles from './LandingPage.module.css'

export default function LandingPage() {
  const imgWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const imgWrap = imgWrapRef.current!
    const canvas  = canvasRef.current!
    const ctx     = canvas.getContext('2d')!

    let W = window.innerWidth
    let H = window.innerHeight

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width  = W
      canvas.height = H
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Mouse parallax ──
    let targetMX = 0, targetMY = 0
    let curMX = 0, curMY = 0

    function onMouseMove(e: MouseEvent) {
      targetMX = (e.clientX / W - 0.5)
      targetMY = (e.clientY / H - 0.5)
    }
    window.addEventListener('mousemove', onMouseMove)

    // ── Dust motes — sparse, confined to the window light region (upper-left) ──
    interface Dust {
      x: number; y: number
      vx: number; vy: number
      size: number
      life: number; maxLife: number
      baseAlpha: number
      phase: number
    }

    function spawnDust(): Dust {
      return {
        x: W * (Math.random() * 0.42),
        y: H * (Math.random() * 0.55),
        vx: (Math.random() - 0.3) * 0.10,
        vy: -0.05 - Math.random() * 0.10,
        size: 0.6 + Math.random() * 1.3,
        life: Math.random() * 600,
        maxLife: 500 + Math.random() * 500,
        baseAlpha: 0.25 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      }
    }

    const dust: Dust[] = Array.from({ length: 22 }, spawnDust)

    // ── Animation loop ──
    let raf = 0
    let t = 0

    function tick() {
      t += 1

      // Smooth parallax + slow independent drift ("Ken Burns" breathing)
      curMX += (targetMX - curMX) * 0.04
      curMY += (targetMY - curMY) * 0.04

      const driftX = Math.sin(t * 0.0018) * 0.7
      const driftY = Math.cos(t * 0.0013) * 0.5
      const scale  = 1 + 0.012 * (1 + Math.sin(t * 0.0009))

      const parX = curMX * 16
      const parY = curMY * 11

      imgWrap.style.transform =
        `translate3d(calc(${driftX}% + ${parX}px), calc(${driftY}% + ${parY}px), 0) scale(${scale})`

      // Dust canvas — moves slightly more than background for depth
      canvas.style.transform =
        `translate3d(${curMX * 26}px, ${curMY * 18}px, 0)`

      // ── Draw dust ──
      ctx.clearRect(0, 0, W, H)
      for (const p of dust) {
        p.life += 1
        if (p.life > p.maxLife) Object.assign(p, spawnDust(), { life: 0 })

        const lt = p.life / p.maxLife
        const fadeIn  = Math.min(lt / 0.15, 1)
        const fadeOut = Math.min((1 - lt) / 0.15, 1)
        const alpha = fadeIn * fadeOut * p.baseAlpha

        p.x += p.vx + Math.sin(p.life * 0.02 + p.phase) * 0.05
        p.y += p.vy

        if (alpha < 0.01) continue

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
        grad.addColorStop(0, `rgba(255, 240, 205, ${alpha})`)
        grad.addColorStop(1, 'rgba(255, 240, 205, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <div className={styles.viewport}>
      <div ref={imgWrapRef} className={styles.imgWrap}>
        <img
          src={deskScene}
          alt="A leather diary labeled 2015-2020 resting on a wooden desk"
          className={styles.scene}
        />
      </div>

      <canvas ref={canvasRef} className={styles.dustCanvas} />

      <div className={`${styles.lightFlicker} ${styles.flickerA}`} />
      <div className={`${styles.lightFlicker} ${styles.flickerB}`} />
    </div>
  )
}
