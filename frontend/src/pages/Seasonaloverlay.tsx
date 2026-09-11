import { useEffect, useRef } from 'react'
import styles from './SeasonalOverlay.module.css'

// Each year gets its own weather, matched to what's actually happening
// in that year's photo rather than a generic "season" guess:
//   2015 - calm sunlit meadow          -> soft rising light motes
//   2016 - same meadow, different mood -> drifting pollen/seed fluff
//   2017 - storm rolling in, leaves just turning -> wind-blown leaves + distant lightning
//   2018 - rain actually falling        -> streaking rain + thunder flash
//   2019 - full gold autumn, leaves airborne -> leaves cascading down
//   2020 - dusk, deep red leaves, hazy sky -> rising embers, falling leaves, stars
type EffectId = 'bloom' | 'pollen' | 'gale' | 'downpour' | 'goldenfall' | 'duskember'

const YEAR_EFFECT: Record<string, EffectId> = {
  '2015': 'bloom',
  '2016': 'pollen',
  '2017': 'gale',
  '2018': 'downpour',
  '2019': 'goldenfall',
  '2020': 'duskember',
}

interface SeasonalOverlayProps {
  year: string
}

export default function SeasonalOverlay({ year }: SeasonalOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const effect = YEAR_EFFECT[year] ?? 'bloom'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = window.innerWidth
    let H = window.innerHeight

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width = W
      canvas!.height = H
    }
    resize()
    window.addEventListener('resize', resize)

    interface Drop { x: number; y: number; vy: number; len: number; alpha: number }
    interface Leaf {
      x: number; y: number; vx: number; vy: number
      size: number; rot: number; vr: number; sway: number; phase: number
      color: string; alpha: number
    }
    interface Mote {
      x: number; y: number; vx: number; vy: number
      size: number; phase: number; baseAlpha: number; life: number; maxLife: number
    }
    interface Ember {
      x: number; y: number; vx: number; vy: number
      size: number; phase: number; baseAlpha: number; life: number; maxLife: number; hue: number
    }
    interface Star { x: number; y: number; size: number; phase: number }

    const leafPalette =
      effect === 'goldenfall'
        ? ['#d98f2b', '#c96a2c', '#e0a53c', '#b0451f']
        : effect === 'duskember'
          ? ['#a83a2a', '#c9502f', '#8a2f22']
          : ['#8a9a4c', '#c9a24a', '#6f7f3c', '#a98a3a'] // gale: still mostly green, just turning

    const drops: Drop[] = []
    const leaves: Leaf[] = []
    const motes: Mote[] = []
    const embers: Ember[] = []
    const stars: Star[] = []

    function spawnDrop(): Drop {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vy: 9 + Math.random() * 7,
        len: 14 + Math.random() * 12,
        alpha: 0.18 + Math.random() * 0.22,
      }
    }

    function spawnLeaf(fromLeft: boolean): Leaf {
      return {
        x: fromLeft ? -30 : Math.random() * W,
        y: fromLeft ? Math.random() * H : -30 - Math.random() * H * 0.6,
        vx: fromLeft ? 1.4 + Math.random() * 1.8 : (Math.random() - 0.5) * 0.5,
        vy: fromLeft ? (Math.random() - 0.5) * 0.5 : 0.5 + Math.random() * 0.7,
        size: 5 + Math.random() * 6,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 4,
        sway: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        color: leafPalette[Math.floor(Math.random() * leafPalette.length)],
        alpha: 0.55 + Math.random() * 0.35,
      }
    }

    function spawnMote(): Mote {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * (effect === 'pollen' ? 0.5 : 0.12),
        vy: effect === 'pollen' ? -0.05 - Math.random() * 0.15 : -0.12 - Math.random() * 0.18,
        size: effect === 'pollen' ? 2.2 + Math.random() * 2.6 : 1.3 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: 0.2 + Math.random() * 0.4,
        life: Math.random() * 500,
        maxLife: 400 + Math.random() * 500,
      }
    }

    function spawnEmber(): Ember {
      return {
        x: Math.random() * W,
        y: H + Math.random() * 60,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.3 - Math.random() * 0.5,
        size: 1.2 + Math.random() * 2.4,
        phase: Math.random() * Math.PI * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
        life: 0,
        maxLife: 300 + Math.random() * 400,
        hue: 18 + Math.random() * 20,
      }
    }

    function spawnStar(): Star {
      return { x: Math.random() * W, y: Math.random() * H * 0.55, size: 0.6 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2 }
    }

    if (effect === 'downpour') for (let i = 0; i < 180; i++) drops.push(spawnDrop())
    if (effect === 'gale') for (let i = 0; i < 22; i++) leaves.push(spawnLeaf(true))
    if (effect === 'goldenfall') for (let i = 0; i < 34; i++) leaves.push(spawnLeaf(false))
    if (effect === 'bloom' || effect === 'pollen') for (let i = 0; i < 30; i++) motes.push(spawnMote())
    if (effect === 'duskember') {
      for (let i = 0; i < 26; i++) embers.push(spawnEmber())
      for (let i = 0; i < 40; i++) stars.push(spawnStar())
      for (let i = 0; i < 8; i++) leaves.push(spawnLeaf(false))
    }

    let raf = 0
    let t = 0
    let flash = 0
    let nextFlashAt = 150 + Math.random() * 180

    function tick() {
      t += 1
      ctx!.clearRect(0, 0, W, H)

      // rain
      if (drops.length) {
        ctx!.strokeStyle = 'rgba(210,225,255,1)'
        ctx!.lineCap = 'round'
        ctx!.lineWidth = 1
        for (const d of drops) {
          d.y += d.vy
          if (d.y > H) { d.y = -20; d.x = Math.random() * W }
          ctx!.globalAlpha = d.alpha
          ctx!.beginPath()
          ctx!.moveTo(d.x, d.y)
          ctx!.lineTo(d.x - 3, d.y + d.len)
          ctx!.stroke()
        }
        ctx!.globalAlpha = 1
      }

      // leaves
      for (const l of leaves) {
        l.phase += 0.02
        l.x += l.vx + Math.sin(l.phase) * l.sway * (effect === 'gale' ? 0.3 : 0.15)
        l.y += l.vy
        l.rot += l.vr

        if (effect === 'gale' && l.x > W + 30) Object.assign(l, spawnLeaf(true))
        if (effect !== 'gale' && l.y > H + 30) Object.assign(l, spawnLeaf(false))

        ctx!.save()
        ctx!.translate(l.x, l.y)
        ctx!.rotate((l.rot * Math.PI) / 180)
        ctx!.globalAlpha = l.alpha
        ctx!.fillStyle = l.color
        ctx!.beginPath()
        ctx!.ellipse(0, 0, l.size, l.size * 0.55, 0, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      }
      ctx!.globalAlpha = 1

      // motes (light dust / pollen)
      for (const m of motes) {
        m.life += 1
        if (m.life > m.maxLife) Object.assign(m, spawnMote(), { life: 0 })
        const lt = m.life / m.maxLife
        const fadeIn = Math.min(lt / 0.15, 1)
        const fadeOut = Math.min((1 - lt) / 0.15, 1)
        const twinkle = 0.75 + 0.25 * Math.sin(m.life * 0.06 + m.phase)
        const a = fadeIn * fadeOut * m.baseAlpha * twinkle

        m.x += m.vx + Math.sin(m.life * 0.02 + m.phase) * 0.08
        m.y += m.vy
        if (m.y < -10) m.y = H + 10
        if (m.x < -10) m.x = W + 10
        if (m.x > W + 10) m.x = -10

        if (a < 0.01) continue
        const r = m.size * 4
        const grad = ctx!.createRadialGradient(m.x, m.y, 0, m.x, m.y, r)
        grad.addColorStop(0, `rgba(255, 248, 225, ${a})`)
        grad.addColorStop(1, 'rgba(255, 248, 225, 0)')
        ctx!.beginPath()
        ctx!.fillStyle = grad
        ctx!.arc(m.x, m.y, r, 0, Math.PI * 2)
        ctx!.fill()
      }

      // stars (dusk only)
      for (const s of stars) {
        const a = Math.max(0, 0.35 + 0.35 * Math.sin(t * 0.02 + s.phase))
        ctx!.beginPath()
        ctx!.fillStyle = `rgba(255,255,255,${a})`
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx!.fill()
      }

      // embers (dusk only)
      for (const e of embers) {
        e.life += 1
        if (e.life > e.maxLife) Object.assign(e, spawnEmber(), { life: 0 })
        const lt = e.life / e.maxLife
        const fadeIn = Math.min(lt / 0.2, 1)
        const fadeOut = Math.min((1 - lt) / 0.3, 1)
        const flicker = 0.7 + 0.3 * Math.sin(e.life * 0.15 + e.phase)
        const a = fadeIn * fadeOut * e.baseAlpha * flicker

        e.x += e.vx + Math.sin(e.life * 0.03 + e.phase) * 0.15
        e.y += e.vy

        if (a < 0.01) continue
        const r = e.size * 3.2
        const grad = ctx!.createRadialGradient(e.x, e.y, 0, e.x, e.y, r)
        grad.addColorStop(0, `hsla(${e.hue}, 90%, 62%, ${a})`)
        grad.addColorStop(1, `hsla(${e.hue}, 90%, 55%, 0)`)
        ctx!.beginPath()
        ctx!.fillStyle = grad
        ctx!.arc(e.x, e.y, r, 0, Math.PI * 2)
        ctx!.fill()
      }

      // distant lightning for the two stormy years
      if (effect === 'gale' || effect === 'downpour') {
        if (t > nextFlashAt) {
          flash = effect === 'downpour' ? 0.28 : 0.16
          nextFlashAt = t + 240 + Math.random() * 300
        }
        if (flash > 0) {
          ctx!.fillStyle = `rgba(225,235,255,${flash})`
          ctx!.fillRect(0, 0, W, H)
          flash -= 0.015
        }
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [effect])

  return (
    <>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={`${styles.mood} ${styles[effect]}`} />
    </>
  )
}