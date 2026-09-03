import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import deskScene from '../assets/desk-scene-extended.png'
import styles from './LandingPage.module.css'

interface LandingPageProps {
  onEnter: () => void
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const imgWrapRef  = useRef<HTMLDivElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const lampRef     = useRef<HTMLDivElement>(null)
  const vignetteRef = useRef<HTMLDivElement>(null)
  const sceneRef    = useRef<HTMLDivElement>(null)
  const taglineRef  = useRef<HTMLParagraphElement>(null)
  const buttonRef   = useRef<HTMLButtonElement>(null)
  const flareRef    = useRef<HTMLDivElement>(null)
  const whiteRef    = useRef<HTMLDivElement>(null)

  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const imgWrap  = imgWrapRef.current!
    const canvas   = canvasRef.current!
    const lamp     = lampRef.current!
    const vignette = vignetteRef.current!
    const ctx      = canvas.getContext('2d')!

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

    let targetMX = 0, targetMY = 0
    let curMX = 0, curMY = 0

    let targetPX = W / 2, targetPY = H / 2
    let curPX = targetPX, curPY = targetPY
    let hasMouse = false
    let lastMoveAt = 0
    let curLampOpacity = 0

    function onMouseMove(e: MouseEvent) {
      targetMX = (e.clientX / W - 0.5)
      targetMY = (e.clientY / H - 0.5)
      targetPX = e.clientX
      targetPY = e.clientY
      hasMouse = true
      lastMoveAt = performance.now()
    }
    window.addEventListener('mousemove', onMouseMove)

    function onMouseLeave() { hasMouse = false }
    window.addEventListener('mouseleave', onMouseLeave)

    interface Dust {
      x: number; y: number
      vx: number; vy: number
      size: number
      life: number; maxLife: number
      baseAlpha: number
      phase: number
    }

    function windowLightFactor(x: number, y: number): number {
      const dx = (x - W * 0.16) / W
      const dy = (y - H * 0.20) / H
      const dist = Math.sqrt(dx * dx + dy * dy)
      return Math.max(0.38, 1 - dist * 1.0)
    }

    function spawnDust(): Dust {
      const x = W * Math.random()
      const y = H * Math.random()
      return {
        x,
        y,
        vx: (Math.random() - 0.3) * 0.11,
        vy: -0.06 - Math.random() * 0.11,
        size: 0.9 + Math.random() * 1.9,
        life: Math.random() * 600,
        maxLife: 500 + Math.random() * 500,
        baseAlpha: (0.34 + Math.random() * 0.4) * windowLightFactor(x, y),
        phase: Math.random() * Math.PI * 2,
      }
    }

    const dust: Dust[] = Array.from({ length: 46 }, spawnDust)

    interface Steam {
      x: number; y: number
      vx: number; vy: number
      size: number
      life: number; maxLife: number
      baseAlpha: number
      phase: number
    }

    function spawnSteam(): Steam {
      return {
        x: W * (0.752 + (Math.random() - 0.5) * 0.03),
        y: H * (0.30 + (Math.random() - 0.5) * 0.01),
        vx: (Math.random() - 0.5) * 0.05,
        vy: -0.10 - Math.random() * 0.08,
        size: 2.5 + Math.random() * 2,
        life: Math.random() * 260,
        maxLife: 240 + Math.random() * 200,
        baseAlpha: 0.08 + Math.random() * 0.07,
        phase: Math.random() * Math.PI * 2,
      }
    }

    const steam: Steam[] = Array.from({ length: 7 }, spawnSteam)

    let raf = 0
    let t = 0

    function tick() {
      t += 1

      curMX += (targetMX - curMX) * 0.04
      curMY += (targetMY - curMY) * 0.04

      const driftX = Math.sin(t * 0.0018) * 0.7
      const driftY = Math.cos(t * 0.0013) * 0.5
      const breathe = Math.sin(t * 0.0009)
      const scale   = 1 + 0.012 * (1 + breathe)

      const jitterX = Math.sin(t * 0.021) * 0.3 + Math.sin(t * 0.0073 + 1.3) * 0.2
      const jitterY = Math.cos(t * 0.017) * 0.25 + Math.sin(t * 0.0091 + 0.7) * 0.15

      const parX = curMX * 16 + jitterX
      const parY = curMY * 11 + jitterY

      if (!isTransitioning) {
        imgWrap.style.transform =
          `translate3d(calc(${driftX}% + ${parX}px), calc(${driftY}% + ${parY}px), 0) scale(${scale})`
      }

      canvas.style.transform =
        `translate3d(${curMX * 26}px, ${curMY * 18}px, 0)`

      if (!isTransitioning) {
        vignette.style.opacity = String(0.45 + 0.18 * breathe)
      }

      curPX += (targetPX - curPX) * 0.08
      curPY += (targetPY - curPY) * 0.08
      const idleMs = performance.now() - lastMoveAt
      const targetLampOpacity = hasMouse ? Math.max(0, 1 - idleMs / 4000) * 0.5 : 0
      curLampOpacity += (targetLampOpacity - curLampOpacity) * 0.06
      lamp.style.opacity = String(curLampOpacity)
      lamp.style.transform = `translate3d(${curPX}px, ${curPY}px, 0) translate(-50%, -50%)`

      ctx.clearRect(0, 0, W, H)

      for (const p of dust) {
        p.life += 1
        if (p.life > p.maxLife) Object.assign(p, spawnDust(), { life: 0 })

        const lt = p.life / p.maxLife
        const fadeIn  = Math.min(lt / 0.15, 1)
        const fadeOut = Math.min((1 - lt) / 0.15, 1)
        const twinkle = 0.8 + 0.2 * Math.sin(p.life * 0.05 + p.phase)
        const alpha = fadeIn * fadeOut * p.baseAlpha * twinkle

        p.x += p.vx + Math.sin(p.life * 0.02 + p.phase) * 0.06
        p.y += p.vy

        if (alpha < 0.01) continue

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4.2)
        grad.addColorStop(0, `rgba(255, 244, 214, ${alpha})`)
        grad.addColorStop(0.4, `rgba(255, 240, 205, ${alpha * 0.5})`)
        grad.addColorStop(1, 'rgba(255, 240, 205, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4.2, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        if (p.size > 1.6) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 250, 235, ${alpha * 0.9})`
          ctx.fill()
        }
      }

      for (const p of steam) {
        p.life += 1
        if (p.life > p.maxLife) Object.assign(p, spawnSteam(), { life: 0 })

        const lt = p.life / p.maxLife
        const fadeIn  = Math.min(lt / 0.25, 1)
        const fadeOut = Math.min((1 - lt) / 0.35, 1)
        const alpha = fadeIn * fadeOut * p.baseAlpha

        p.x += p.vx + Math.sin(p.life * 0.015 + p.phase) * 0.15
        p.y += p.vy

        if (alpha < 0.005) continue

        const radius = p.size * (1 + lt * 3)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
        grad.addColorStop(0, `rgba(255, 253, 247, ${alpha})`)
        grad.addColorStop(1, 'rgba(255, 253, 247, 0)')
        ctx.beginPath()
        ctx.ellipse(p.x, p.y, radius, radius * 1.5, 0, 0, Math.PI * 2)
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
      window.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [isTransitioning])

  function handleEnter() {
    if (isTransitioning) return
    setIsTransitioning(true)

    const tl = gsap.timeline({
      onComplete: onEnter,
    })

    // 1. UI recedes — button and tagline dissolve upward, out of the way
    tl.to(buttonRef.current, {
      opacity: 0,
      y: -14,
      duration: 0.5,
      ease: 'power2.in',
    }, 0)
    tl.to(taglineRef.current, {
      opacity: 0,
      y: -10,
      duration: 0.5,
      ease: 'power2.in',
    }, 0)

    // 2. Camera pushes in toward the diary — slow, deliberate lean-in
    tl.to(imgWrapRef.current, {
      scale: 1.55,
      x: '+=1%',
      y: '-=2%',
      duration: 1.5,
      ease: 'power2.inOut',
    }, 0.1)

    // 3. Vignette tightens as focus narrows toward the diary
    tl.to(vignetteRef.current, {
      opacity: 0.85,
      duration: 1.2,
      ease: 'power1.in',
    }, 0.2)

    // 4. Warm flare blooms from the diary's center, growing to fill the frame
    tl.fromTo(flareRef.current,
      { opacity: 0, scale: 0.3 },
      { opacity: 1, scale: 1, duration: 0.9, ease: 'power2.in' },
      1.15
    )

    // 5. Full whiteout — the "page turn" beat
    tl.to(whiteRef.current, {
      opacity: 1,
      duration: 0.45,
      ease: 'power2.in',
    }, 1.75)

    // 6. Hold briefly on white, then hand off to the main page
    tl.to({}, { duration: 0.25 }, 2.2)
  }

  return (
    <div className={styles.viewport}>
      <div ref={imgWrapRef} className={styles.imgWrap}>
        <img
          src={deskScene}
          alt="A leather diary labeled 2015-2020 resting on a wooden desk"
          className={styles.scene}
        />
        <div className={styles.gleam} />
        <div className={styles.titleGleam} />
      </div>

      <canvas ref={canvasRef} className={styles.dustCanvas} />

      <div className={`${styles.lightFlicker} ${styles.flickerA}`} />
      <div className={`${styles.lightFlicker} ${styles.flickerB}`} />

      <div ref={lampRef} className={styles.lampGlow} />
      <div ref={vignetteRef} className={styles.vignette} />
      <div className={styles.cornerMask} />

      <div ref={flareRef} className={styles.flare} />
      <div ref={whiteRef} className={styles.whiteout} />


      <button
        ref={buttonRef}
        type="button"
        className={styles.enterButton}
        onClick={handleEnter}
        disabled={isTransitioning}
      >
        <span className={styles.enterLabel}>Enter RE:ONE</span>
      </button>
    </div>
  )
}