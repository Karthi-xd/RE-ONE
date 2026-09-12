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
// canopy pixels. A naive random crop from the canopy area regularly grabs
// sky peeking through gaps in the branches (bright, low-saturation grey),
// so every candidate crop is color-checked against real samples taken from
// each photo before being accepted - see isLeafySample().
//
// Rendering is split across two stacked canvases:
//   - glowCanvas (mix-blend-mode: screen) is for soft LIGHT: dust motes,
//     rain streaks, snow.
//   - solidCanvas (normal blending) is for OBJECTS with real texture:
//     the photo-sampled leaf sprites, which need their own dark shadow and
//     can't rely on screen blend (that only ever lightens).
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

// Where leaf crops are drawn from, as a fraction of the photo's natural
// size - centered on the densest part of the canopy. Even within this box
// some patches are still sky/haze (gaps between branches), which is why
// isLeafySample() double-checks every candidate before it's used.
const CANOPY_RECT = { xMin: 0.36, xMax: 0.64, yMin: 0.24, yMax: 0.58 }

// Verified against real pixel samples pulled from both photos:
// - 2019's sky/haze patches read as bright AND low-warmth (close to grey) -
//   e.g. (208,209,196) - while genuine leaf pixels, even sunlit highlights,
//   are reliably warm (R well above B) regardless of brightness. A separate
//   cap catches blown-out highlights that are technically "warm" by the
//   numbers but too washed-out to read as leaf color.
// - 2020's sky is a warm dusk orange, so warmth alone can't tell it apart
//   from a leaf - checked directly against real sky-gap pixels there
//   (lum 163, warmth 160) vs real leaf pixels (lum <=144). Luminance alone
//   is the reliable signal for this photo: leaves sit reliably darker than
//   the bright sky behind them.
function isSkyPixel(effect: LeafEffect, r: number, g: number, b: number): boolean {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  if (effect === 'goldenfall') {
    if (lum > 222) return true // blown-out highlight, unusable regardless of hue
    const warmth = r - b
    return lum > 175 && warmth < 40
  }
  return lum > 150 // duskember
}

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
      lengthRatio: number; bulge: number // shape variance so leaves aren't identical
      cropSX: number; cropSY: number; cropW: number; cropH: number
      alpha: number
    }
    interface Mote {
      x: number; y: number; vx: number; vy: number
      size: number; phase: number; baseAlpha: number; life: number; maxLife: number
    }

    const leafEffect: LeafEffect | null = effect === 'goldenfall' || effect === 'duskember' ? effect : null
    const leafCfg = leafEffect ? LEAF_CONFIG[leafEffect] : null

    // Load the actual photo, then draw it once into an offscreen canvas at
    // full resolution so individual crop candidates can be pixel-sampled
    // and validated before being used as a leaf sprite.
    let sourceImg: HTMLImageElement | null = null
    let offscreen: HTMLCanvasElement | null = null
    let offCtx: CanvasRenderingContext2D | null = null
    let imgReady = false
    if (leafCfg) {
      sourceImg = new Image()
      sourceImg.onload = () => {
        offscreen = document.createElement('canvas')
        offscreen.width = sourceImg!.naturalWidth
        offscreen.height = sourceImg!.naturalHeight
        offCtx = offscreen.getContext('2d')
        offCtx?.drawImage(sourceImg!, 0, 0)
        imgReady = true
      }
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

    // Finds a genuinely leaf-colored crop rectangle within the canopy zone.
    // Checking only the average color of a candidate patch lets boundary
    // crops slip through (half leaf, half sky averages out to something
    // that looks "warm enough" but renders as a two-toned mess), so this
    // checks what fraction of individual pixels are sky-like and rejects
    // the whole patch if too many are.
    function findLeafCrop(cropW: number, cropH: number): { sx: number; sy: number } {
      const natW = offscreen!.width
      const natH = offscreen!.height
      const rangeW = Math.max(natW * (CANOPY_RECT.xMax - CANOPY_RECT.xMin) - cropW, 1)
      const rangeH = Math.max(natH * (CANOPY_RECT.yMax - CANOPY_RECT.yMin) - cropH, 1)
      const baseX = natW * CANOPY_RECT.xMin
      const baseY = natH * CANOPY_RECT.yMin

      let best = { sx: baseX, sy: baseY, score: Infinity }
      for (let attempt = 0; attempt < 28; attempt++) {
        const sx = baseX + Math.random() * rangeW
        const sy = baseY + Math.random() * rangeH
        const data = offCtx!.getImageData(sx, sy, Math.max(cropW, 1), Math.max(cropH, 1)).data
        let skyCount = 0
        const n = data.length / 4
        for (let i = 0; i < data.length; i += 4) {
          if (isSkyPixel(leafEffect!, data[i], data[i + 1], data[i + 2])) skyCount++
        }
        const skyFrac = skyCount / n
        if (skyFrac <= 0.1) return { sx, sy }
        if (skyFrac < best.score) best = { sx, sy, score: skyFrac }
      }
      return { sx: best.sx, sy: best.sy }
    }

    function spawnLeaf(): Leaf {
      const cfg = leafCfg!
      const x = W * (0.38 + Math.random() * 0.24)
      const y = H * (0.16 + Math.random() * 0.34)
      const angleDeg = cfg.angleMin + Math.random() * (cfg.angleMax - cfg.angleMin)
      const angleRad = (angleDeg * Math.PI) / 180
      const speed = cfg.speedMin + Math.random() * (cfg.speedMax - cfg.speedMin)

      const natW = offscreen!.width
      const cropW = natW * (0.014 + Math.random() * 0.012)
      const cropH = cropW * (0.65 + Math.random() * 0.3)
      const { sx, sy } = findLeafCrop(cropW, cropH)

      return {
        x,
        y,
        vx: Math.cos(angleRad) * speed,
        vy: Math.sin(angleRad) * speed,
        size: 7 + Math.random() * 6,
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 3,
        flutterPhase: Math.random() * Math.PI * 2,
        lengthRatio: 0.85 + Math.random() * 0.3,
        bulge: 0.85 + Math.random() * 0.35,
        cropSX: sx,
        cropSY: sy,
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
    // Leaves fill in lazily inside tick() once the offscreen sample canvas is ready.

    // Draws a pointed leaf silhouette (not an oval) centered at the origin,
    // pointing along the x-axis. bulge/lengthRatio vary per leaf so they
    // aren't all identical.
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

      // --- solid layer: photo-sampled leaf sprites ---
      if (leafCfg && imgReady && sourceImg && offCtx) {
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

          const offscreenPos = l.x < -60 || l.x > W + 60 || l.y > H + 60
          const settled = speedMag < 0.05 && l.y > H * 0.85
          if (offscreenPos || settled) Object.assign(l, spawnLeaf())

          const len = l.size * l.lengthRatio
          const width = l.size * 0.6

          // soft dark shadow first, offset slightly, for depth
          sctx!.save()
          sctx!.translate(l.x + 2, l.y + 3)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha * 0.22
          sctx!.fillStyle = 'rgba(10, 8, 5, 1)'
          leafPath(sctx!, len, width, l.bulge)
          sctx!.fill()
          sctx!.restore()

          // the leaf itself: real photo texture clipped to a pointed silhouette
          sctx!.save()
          sctx!.translate(l.x, l.y)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha
          leafPath(sctx!, len, width, l.bulge)
          sctx!.clip()
          sctx!.drawImage(
            sourceImg,
            l.cropSX, l.cropSY, l.cropW, l.cropH,
            -len, -width, len * 2, width * 2,
          )
          // center vein + soft edge, drawn while still clipped/transformed
          sctx!.globalAlpha = l.alpha * 0.35
          sctx!.strokeStyle = 'rgba(20, 12, 6, 0.5)'
          sctx!.lineWidth = 0.75
          sctx!.beginPath()
          sctx!.moveTo(-len * 0.9, 0)
          sctx!.lineTo(len * 0.9, 0)
          sctx!.stroke()
          sctx!.restore()

          // faint outline for definition against busy backgrounds
          sctx!.save()
          sctx!.translate(l.x, l.y)
          sctx!.rotate((l.rot * Math.PI) / 180)
          sctx!.globalAlpha = l.alpha * 0.4
          sctx!.strokeStyle = 'rgba(15, 10, 5, 0.35)'
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
  }, [effect, imageSrc])

  return (
    <>
      <canvas ref={glowRef} className={styles.glowCanvas} />
      <canvas ref={solidRef} className={styles.solidCanvas} />
      <div className={`${styles.mood} ${styles[effect]}`} />
    </>
  )
}