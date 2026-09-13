import { useEffect, useRef } from 'react'
import styles from './SeasonalOverlay.module.css'

// Each year gets its own weather, matched to what's actually happening
// in that year's photo:
//   2015 - calm sunlit meadow          -> soft rising light motes
//   2016 - same meadow, different mood -> drifting pollen/seed fluff
//   2017 - actual snowfall             -> real snow particles, gentle sway
//   2018 - rain actually falling       -> streaking rain + thunder flash
//   2019 - full gold autumn            -> leaves drifting gently down, whole scene
//   2020 - dusk, deep red leaves       -> a few leaves drifting gently down
//
// Leaves are drawn shapes (a pointed leaf silhouette with a soft gradient
// fill), not cropped from the photo - that approach kept landing on sky/
// haze between branches and looked worse the more it was tuned. They spawn
// spread across the whole width above the frame and drift straight down
// with a gentle sway, like ambient falling leaves, rather than launching
// from a single point in the canopy (which read as leaves being "thrown").
//
// Rendering is split across two stacked canvases:
//   - glowCanvas (mix-blend-mode: screen) is for soft LIGHT: dust motes,
//     rain streaks, snow.
//   - solidCanvas (normal blending) is for the leaves, which need real
//     color and their own soft shadow.
type EffectId = 'bloom' | 'pollen' | 'snowfall' | 'downpour' | 'goldenfall' | 'duskember'
type LeafEffect = 'goldenfall' | 'duskember'

const YEAR_EFFECT: Record<string, EffectId> = {
  '2015': 'bloom',
  '2016': 'pollen',
  '2017': 'snowfall',
  '2018': 'downpour',
  '2019': 'goldenfall',
  '2020': 'duskember',
}

const LEAF_STYLE: Record<
  LeafEffect,
  {
    colors: string[]
    highlights: string[]
    count: number
    fallSpeedMin: number
    fallSpeedMax: number
    swayAmpMin: number
    swayAmpMax: number
    swayFreqMin: number
    swayFreqMax: number
    sizeMin: number
    sizeMax: number
    spin: number
    drift: number // slight steady horizontal wind
  }
> = {
  // 2019: vivid, plentiful autumn leaves drifting down across the whole scene
  goldenfall: {
    colors: ['#c96a2c', '#e0a53c', '#b8451f', '#d9832f'],
    highlights: ['#f0b563', '#ffd28a', '#e08a4f', '#f5c377'],
    count: 26,
    fallSpeedMin: 0.5,
    fallSpeedMax: 1.3,
    swayAmpMin: 0.6,
    swayAmpMax: 1.7,
    swayFreqMin: 0.014,
    swayFreqMax: 0.03,
    sizeMin: 6,
    sizeMax: 11,
    spin: 1.1,
    drift: 0.12,
  },
  // 2020: still dusk air, just a handful of dark leaves sifting down calmly
  duskember: {
    colors: ['#5c1810', '#7a2015', '#3d0f0a', '#6b2317'],
    highlights: ['#a8402a', '#c9502f', '#8f3320', '#b8462d'],
    count: 9,
    fallSpeedMin: 0.25,
    fallSpeedMax: 0.6,
    swayAmpMin: 0.3,
    swayAmpMax: 0.9,
    swayFreqMin: 0.01,
    swayFreqMax: 0.02,
    sizeMin: 6,
    sizeMax: 10,
    spin: 0.5,
    drift: 0.02,
  },
}

function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(h.substring(0, 2), 16) + amt))
  const g = Math.max(0, Math.min(255, parseInt(h.substring(2, 4), 16) + amt))
  const b = Math.max(0, Math.min(255, parseInt(h.substring(4, 6), 16) + amt))
  return `rgb(${r}, ${g}, ${b})`
}

interface SeasonalOverlayProps {
  year: string
}

export default function SeasonalOverlay({ year }: SeasonalOverlayProps) {
  const glowRef = useRef<HTMLCanvasElement>(null)
  const solidRef = useRef<HTMLCanvasElement>(null)
  const effect = YEAR_EFFECT[year] ?? 'bloom'

  useEffect(() => {
    const glow = glowRef.current
    const solid = solidRef.current
    if (!glow || !solid) return
    const gctx = glow.getContext('2d')
    const sctx = solid.getContext('2d')
    if (!gctx || !sctx) return

    let W = window.innerWidth
    let H = window.innerHeight

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      glow!.width = W
      glow!.height = H
      solid!.width = W
      solid!.height = H
    }
    resize()
    window.addEventListener('resize', resize)

    interface Drop { x: number; y: number; vy: number; len: number; alpha: number }
    interface Flake {
      x: number; y: number; vy: number
      size: number; alpha: number
      swayPhase: number; swayAmp: number; swayFreq: number
    }
    interface Leaf {
      x: number; y: number; vy: number
      size: number; rot: number; vr: number
      swayPhase: number; swayAmp: number; swayFreq: number
      bulge: number; lengthRatio: number
      color: string; highlight: string; alpha: number
    }
    interface Mote {
      x: number; y: number; vx: number; vy: number
      size: number; phase: number; baseAlpha: number; life: number; maxLife: number
    }

    const leafEffect: LeafEffect | null = effect === 'goldenfall' || effect === 'duskember' ? effect : null
    const leafStyle = leafEffect ? LEAF_STYLE[leafEffect] : null

    const drops: Drop[] = []
    const flakes: Flake[] = []
    const leaves: Leaf[] = []
    const motes: Mote[] = []

    function spawnDrop(): Drop {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vy: 9 + Math.random() * 7,
        len: 14 + Math.random() * 12,
        alpha: 0.18 + Math.random() * 0.22,
      }
    }

    function spawnFlake(): Flake {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vy: 0.7 + Math.random() * 1.3,
        size: 1.8 + Math.random() * 3.2,
        alpha: 0.45 + Math.random() * 0.45,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: 0.4 + Math.random() * 1.3,
        swayFreq: 0.015 + Math.random() * 0.025,
      }
    }

    // Spread across the whole width, staggered well above and within the
    // frame so they don't all pop in at once - ambient falling leaves, not
    // a burst from a single point.
    function spawnLeaf(initial: boolean): Leaf {
      const s = leafStyle!
      const idx = Math.floor(Math.random() * s.colors.length)
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H - H * 0.3 : -30 - Math.random() * 40,
        vy: s.fallSpeedMin + Math.random() * (s.fallSpeedMax - s.fallSpeedMin),
        size: s.sizeMin + Math.random() * (s.sizeMax - s.sizeMin),
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * s.spin,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: s.swayAmpMin + Math.random() * (s.swayAmpMax - s.swayAmpMin),
        swayFreq: s.swayFreqMin + Math.random() * (s.swayFreqMax - s.swayFreqMin),
        bulge: 0.85 + Math.random() * 0.35,
        lengthRatio: 0.85 + Math.random() * 0.3,
        color: s.colors[idx],
        highlight: s.highlights[idx],
        alpha: 0.75 + Math.random() * 0.25,
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

    if (effect === 'downpour') for (let i = 0; i < 180; i++) drops.push(spawnDrop())
    if (effect === 'snowfall') for (let i = 0; i < 220; i++) flakes.push(spawnFlake())
    if (effect === 'bloom' || effect === 'pollen') for (let i = 0; i < 30; i++) motes.push(spawnMote())
    if (leafStyle) for (let i = 0; i < leafStyle.count; i++) leaves.push(spawnLeaf(true))

    // Pointed leaf silhouette (not an oval), centered at the origin,
    // pointing along the x-axis. bulge/lengthRatio vary per leaf.
    function leafPath(ctx: CanvasRenderingContext2D, len: number, width: number, bulge: number) {
      ctx.beginPath()
      ctx.moveTo(-len, 0)
      ctx.bezierCurveTo(-len * 0.3, -width * bulge, len * 0.55, -width * 0.7, len, 0)
      ctx.bezierCurveTo(len * 0.55, width * 0.7, -len * 0.3, width * bulge, -len, 0)
      ctx.closePath()
    }

    let raf = 0
    let t = 0
    let flash = 0
    let nextFlashAt = 150 + Math.random() * 180

    function tick() {
      t += 1
      gctx!.clearRect(0, 0, W, H)
      sctx!.clearRect(0, 0, W, H)

      // --- glow layer: rain ---
      if (drops.length) {
        gctx!.strokeStyle = 'rgba(210,225,255,1)'
        gctx!.lineCap = 'round'
        gctx!.lineWidth = 1
        for (const d of drops) {
          d.y += d.vy
          if (d.y > H) { d.y = -20; d.x = Math.random() * W }
          gctx!.globalAlpha = d.alpha
          gctx!.beginPath()
          gctx!.moveTo(d.x, d.y)
          gctx!.lineTo(d.x - 3, d.y + d.len)
          gctx!.stroke()
        }
        gctx!.globalAlpha = 1
      }

      // --- glow layer: real snow ---
      for (const f of flakes) {
        f.y += f.vy
        const sway = Math.sin(t * f.swayFreq + f.swayPhase) * f.swayAmp
        f.x += sway * 0.06 + 0.05
        if (f.y > H + 10) { f.y = -10; f.x = Math.random() * W }
        if (f.x > W + 10) f.x = -10
        if (f.x < -10) f.x = W + 10

        const r = f.size * 2.2
        const grad = gctx!.createRadialGradient(f.x, f.y, 0, f.x, f.y, r)
        grad.addColorStop(0, `rgba(255,255,255,${f.alpha})`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        gctx!.beginPath()
        gctx!.fillStyle = grad
        gctx!.arc(f.x, f.y, r, 0, Math.PI * 2)
        gctx!.fill()
      }

      // --- glow layer: dust / pollen motes ---
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
        const grad = gctx!.createRadialGradient(m.x, m.y, 0, m.x, m.y, r)
        grad.addColorStop(0, `rgba(255, 248, 225, ${a})`)
        grad.addColorStop(1, 'rgba(255, 248, 225, 0)')
        gctx!.beginPath()
        gctx!.fillStyle = grad
        gctx!.arc(m.x, m.y, r, 0, Math.PI * 2)
        gctx!.fill()
      }

      // --- solid layer: drawn leaves, gentle fall + sway, gradient fill ---
      if (leafStyle) {
        for (const l of leaves) {
          l.swayPhase += l.swayFreq
          l.x += Math.sin(l.swayPhase) * l.swayAmp * 0.05 + leafStyle.drift
          l.y += l.vy
          l.rot += l.vr + Math.cos(l.swayPhase) * 0.4

          if (l.y > H + 30 || l.x < -60 || l.x > W + 60) Object.assign(l, spawnLeaf(false))

          const len = l.size * l.lengthRatio
          const width = l.size * 0.6

          // soft shadow for depth
          sctx!.save()
          sctx!.translate(l.x + 2, l.y + 3)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha * 0.2
          sctx!.fillStyle = 'rgba(10, 8, 5, 1)'
          leafPath(sctx!, len, width, l.bulge)
          sctx!.fill()
          sctx!.restore()

          // the leaf: gradient fill for a glossy, dimensional look
          sctx!.save()
          sctx!.translate(l.x, l.y)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha
          leafPath(sctx!, len, width, l.bulge)
          const grad = sctx!.createRadialGradient(len * 0.2, -width * 0.3, width * 0.15, 0, 0, len * 1.2)
          grad.addColorStop(0, l.highlight)
          grad.addColorStop(1, l.color)
          sctx!.fillStyle = grad
          sctx!.fill()
          // center vein
          sctx!.globalAlpha = l.alpha * 0.4
          sctx!.strokeStyle = shade(l.color, -30)
          sctx!.lineWidth = 0.75
          sctx!.beginPath()
          sctx!.moveTo(-len * 0.9, 0)
          sctx!.lineTo(len * 0.9, 0)
          sctx!.stroke()
          // outline for definition
          sctx!.globalAlpha = l.alpha * 0.5
          sctx!.lineWidth = 0.8
          leafPath(sctx!, len, width, l.bulge)
          sctx!.stroke()
          sctx!.restore()
        }
      }
      sctx!.globalAlpha = 1

      // --- lightning only for actual rain/storm ---
      if (effect === 'downpour') {
        if (t > nextFlashAt) {
          flash = 0.28
          nextFlashAt = t + 240 + Math.random() * 300
        }
        if (flash > 0) {
          gctx!.fillStyle = `rgba(225,235,255,${flash})`
          gctx!.fillRect(0, 0, W, H)
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
      <canvas ref={glowRef} className={styles.glowCanvas} />
      <canvas ref={solidRef} className={styles.solidCanvas} />
      <div className={`${styles.mood} ${styles[effect]}`} />
    </>
  )
}