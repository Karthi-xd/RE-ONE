import { useEffect, useRef } from 'react'
import styles from './SeasonalOverlay.module.css'

// Each year gets its own weather, matched to what's actually happening
// in that year's photo:
//   2015 - calm sunlit meadow          -> soft rising light motes
//   2016 - same meadow, different mood -> drifting pollen/seed fluff
//   2017 - actual snowfall             -> real snow particles, gentle sway
//   2018 - rain actually falling       -> streaking rain + thunder flash
//   2019 - full gold autumn, big gust  -> leaves cut from the real photo, falling
//   2020 - dusk, deep red leaves       -> leaves cut from the real photo, falling
//
// For 2019/2020 the falling leaves are literal crops of the photo's own
// canopy pixels (via canvas drawImage sampling a small clipped region of
// the actual <img>), not painted shapes - so their color and texture
// exactly match the real leaves in that photo.
//
// Rendering is split across two stacked canvases:
//   - glowCanvas (mix-blend-mode: screen) is for soft LIGHT: dust motes,
//     rain streaks, snow.
//   - solidCanvas (normal blending) is for OBJECTS with real texture:
//     the photo-sampled leaf sprites.
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

// Leaves are simulated as real projectiles: a burst velocity off the tree,
// then every frame gravity pulls them down and drag slows them, so they
// naturally arc, decelerate, and tumble.
// Angle convention: 0deg = rightward, negative = upward (canvas y is down).
const LEAF_CONFIG: Record<
  LeafEffect,
  {
    angleMin: number
    angleMax: number
    speedMin: number
    speedMax: number
    drag: number
    gravity: number
    flutterAmp: number
    flutterFreq: number
    spinBase: number
    count: number
  }
> = {
  // 2019: a real gust tears leaves up and off the canopy, they arc over, then fall
  goldenfall: {
    angleMin: -78,
    angleMax: -34,
    speedMin: 3.2,
    speedMax: 6.2,
    drag: 0.965,
    gravity: 0.05,
    flutterAmp: 1.0,
    flutterFreq: 0.045,
    spinBase: 0.22,
    count: 26,
  },
  // 2020: still dusk air, just a few leaves gently sifting down
  duskember: {
    angleMin: -50,
    angleMax: 8,
    speedMin: 1.0,
    speedMax: 2.2,
    drag: 0.975,
    gravity: 0.032,
    flutterAmp: 0.75,
    flutterFreq: 0.04,
    spinBase: 0.14,
    count: 9,
  },
}

// Where the leaf sprites are cropped from, as a fraction of the photo's
// natural size - the canopy area where the real leaves actually are.
const CANOPY_RECT = { xMin: 0.34, xMax: 0.66, yMin: 0.15, yMax: 0.5 }

interface SeasonalOverlayProps {
  year: string
  imageSrc: string
}

export default function SeasonalOverlay({ year, imageSrc }: SeasonalOverlayProps) {
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
      x: number; y: number; vx: number; vy: number
      size: number; rot: number; vr: number; flutterPhase: number
      cropSX: number; cropSY: number; cropW: number; cropH: number
      alpha: number
    }
    interface Mote {
      x: number; y: number; vx: number; vy: number
      size: number; phase: number; baseAlpha: number; life: number; maxLife: number
    }

    const leafCfg = effect === 'goldenfall' || effect === 'duskember' ? LEAF_CONFIG[effect] : null

    // Load the actual photo as a drawImage source, so leaf sprites can be
    // cropped directly from its real canopy pixels once it's ready.
    let sourceImg: HTMLImageElement | null = null
    let imgReady = false
    if (leafCfg) {
      sourceImg = new Image()
      sourceImg.onload = () => { imgReady = true }
      sourceImg.src = imageSrc
    }

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

    // Crops a small leaf-shaped patch straight out of the tree canopy in
    // the actual photo, launched off the canopy at a real ballistic angle.
    function spawnLeaf(): Leaf {
      const cfg = leafCfg!
      const x = W * (0.38 + Math.random() * 0.24)
      const y = H * (0.16 + Math.random() * 0.34)
      const angleDeg = cfg.angleMin + Math.random() * (cfg.angleMax - cfg.angleMin)
      const angleRad = (angleDeg * Math.PI) / 180
      const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)

      const natW = sourceImg?.naturalWidth || 1376
      const natH = sourceImg?.naturalHeight || 774
      const cropW = natW * (0.012 + Math.random() * 0.01)
      const cropH = cropW * (0.65 + Math.random() * 0.3)
      const rangeW = natW * (CANOPY_RECT.xMax - CANOPY_RECT.xMin) - cropW
      const rangeH = natH * (CANOPY_RECT.yMax - CANOPY_RECT.yMin) - cropH
      const cropSX = natW * CANOPY_RECT.xMin + Math.random() * Math.max(rangeW, 1)
      const cropSY = natH * CANOPY_RECT.yMin + Math.random() * Math.max(rangeH, 1)

      return {
        x,
        y,
        vx: Math.cos(angleRad) * speed,
        vy: Math.sin(angleRad) * speed,
        size: 7 + Math.random() * 6,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 3,
        flutterPhase: Math.random() * Math.PI * 2,
        cropSX,
        cropSY,
        cropW,
        cropH,
        alpha: 0.85 + Math.random() * 0.15,
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
    // Leaves are filled in lazily inside tick() once the source photo has
    // loaded, so crop coordinates are based on its real natural size.

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

      // --- solid layer: photo-sampled leaf sprites ---
      if (leafCfg && imgReady && sourceImg) {
        while (leaves.length < leafCfg.count) leaves.push(spawnLeaf())

        for (const l of leaves) {
          l.vx *= leafCfg.drag
          l.vy = (l.vy + leafCfg.gravity) * leafCfg.drag
          l.flutterPhase += leafCfg.flutterFreq
          const flutterX = Math.sin(l.flutterPhase) * leafCfg.flutterAmp * 0.25
          const flutterY = Math.cos(l.flutterPhase * 0.8) * leafCfg.flutterAmp * 0.15
          l.x += l.vx + flutterX
          l.y += l.vy + flutterY

          const speedMag = Math.hypot(l.vx, l.vy)
          l.rot += l.vr + speedMag * leafCfg.spinBase

          const offscreen = l.x < -60 || l.x > W + 60 || l.y > H + 60
          const settled = speedMag < 0.05 && l.y > H * 0.85
          if (offscreen || settled) Object.assign(l, spawnLeaf())

          sctx!.save()
          sctx!.translate(l.x, l.y)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha
          sctx!.beginPath()
          sctx!.ellipse(0, 0, l.size, l.size * 0.62, 0, 0, Math.PI * 2)
          sctx!.clip()
          sctx!.drawImage(
            sourceImg,
            l.cropSX, l.cropSY, l.cropW, l.cropH,
            -l.size, -l.size * 0.62, l.size * 2, l.size * 1.24,
          )
          sctx!.restore()

          // faint outline so the sprite reads as a leaf silhouette, not a raw texture patch
          sctx!.save()
          sctx!.translate(l.x, l.y)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha * 0.6
          sctx!.strokeStyle = 'rgba(15, 10, 5, 0.3)'
          sctx!.lineWidth = 1
          sctx!.beginPath()
          sctx!.ellipse(0, 0, l.size, l.size * 0.62, 0, 0, Math.PI * 2)
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
  }, [effect, imageSrc])

  return (
    <>
      <canvas ref={glowRef} className={styles.glowCanvas} />
      <canvas ref={solidRef} className={styles.solidCanvas} />
      <div className={`${styles.mood} ${styles[effect]}`} />
    </>
  )
}