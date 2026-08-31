import { useEffect, useRef } from 'react'

export default function MountainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    let animId: number
    let t = 0

    // ── Resize ──────────────────────────────────────────────────────────────
    function resize() {
      canvas!.width  = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // ── Noise (smooth simplex-like via sine stacking) ────────────────────────
    function noise(x: number, seed = 0) {
      return (
        Math.sin(x * 0.8  + seed) * 0.5 +
        Math.sin(x * 1.7  + seed * 1.3) * 0.25 +
        Math.sin(x * 3.5  + seed * 0.7) * 0.125 +
        Math.sin(x * 7.1  + seed * 2.1) * 0.0625 +
        Math.sin(x * 14.3 + seed * 1.7) * 0.03125
      )
    }

    // ── Mountain ridge profile ───────────────────────────────────────────────
    function ridgeProfile(
      x: number,
      w: number,
      baseY: number,   // horizon fraction
      amplitude: number,
      seed: number,
      drift: number,
    ) {
      const nx = x / w * 4 + drift
      const n  = noise(nx, seed)
      return baseY + n * amplitude
    }

    // ── Clouds ───────────────────────────────────────────────────────────────
    interface Cloud {
      x: number
      y: number
      scaleX: number
      scaleY: number
      speed: number
      alpha: number
      puffs: Array<{ dx: number; dy: number; r: number }>
    }

    function makeCloud(w: number, h: number, offscreen = false): Cloud {
      const x = offscreen ? -500 : Math.random() * w * 1.4 - w * 0.2
      const y = h * (0.05 + Math.random() * 0.28)
      const count = 5 + Math.floor(Math.random() * 6)
      const puffs = Array.from({ length: count }, (_, i) => ({
        dx: (i / count - 0.5) * (120 + Math.random() * 60),
        dy: Math.sin(i) * 22 + (Math.random() - 0.5) * 18,
        r:  38 + Math.random() * 55,
      }))
      return {
        x, y,
        scaleX: 0.8 + Math.random() * 0.7,
        scaleY: 0.55 + Math.random() * 0.35,
        speed:  0.04 + Math.random() * 0.07,
        alpha:  0.72 + Math.random() * 0.22,
        puffs,
      }
    }

    const clouds: Cloud[] = []
    function initClouds(w: number, h: number) {
      clouds.length = 0
      for (let i = 0; i < 9; i++) clouds.push(makeCloud(w, h))
    }

    function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud) {
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.scale(c.scaleX, c.scaleY)
      for (const p of c.puffs) {
        const grad = ctx.createRadialGradient(p.dx, p.dy - p.r * 0.2, 0, p.dx, p.dy, p.r)
        grad.addColorStop(0,   `rgba(255,255,255,${c.alpha})`)
        grad.addColorStop(0.5, `rgba(235,245,255,${c.alpha * 0.85})`)
        grad.addColorStop(1,   `rgba(200,225,245,0)`)
        ctx.beginPath()
        ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      }
      ctx.restore()
    }

    // ── Draw one mountain layer ──────────────────────────────────────────────
    function drawMountain(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      baseY: number,
      amplitude: number,
      seed: number,
      drift: number,
      topColor: string,
      botColor: string,
      shadowAlpha: number,
    ) {
      ctx.beginPath()
      ctx.moveTo(0, h)

      const steps = Math.ceil(w / 2)
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w
        const y = h * ridgeProfile(x, w, baseY, amplitude, seed, drift)
        if (i === 0) ctx.lineTo(x, y)
        else ctx.lineTo(x, y)
      }

      ctx.lineTo(w, h)
      ctx.closePath()

      // Main fill gradient
      const grad = ctx.createLinearGradient(0, h * (baseY - amplitude * 1.2), 0, h)
      grad.addColorStop(0,   topColor)
      grad.addColorStop(1,   botColor)
      ctx.fillStyle = grad
      ctx.fill()

      // Atmospheric shadow overlay at base
      const shadow = ctx.createLinearGradient(0, h * 0.55, 0, h)
      shadow.addColorStop(0, `rgba(60,80,110,0)`)
      shadow.addColorStop(1, `rgba(40,55,80,${shadowAlpha})`)
      ctx.fillStyle = shadow
      ctx.fill()
    }

    // ── Snow cap on nearest ridge ────────────────────────────────────────────
    function drawSnow(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      baseY: number,
      amplitude: number,
      seed: number,
      drift: number,
    ) {
      ctx.save()
      ctx.beginPath()
      const steps = Math.ceil(w / 2)
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w
        const y = h * ridgeProfile(x, w, baseY, amplitude, seed, drift)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      // offset snow line slightly lower than peak
      for (let i = steps; i >= 0; i--) {
        const x = (i / steps) * w
        const y = h * ridgeProfile(x, w, baseY, amplitude, seed, drift) + 22 + noise(x / w * 6, seed * 2) * 18
        ctx.lineTo(x, y)
      }
      ctx.closePath()

      const grad = ctx.createLinearGradient(0, h * (baseY - amplitude), 0, h * baseY)
      grad.addColorStop(0,   'rgba(255,255,255,0.96)')
      grad.addColorStop(0.5, 'rgba(230,240,255,0.7)')
      grad.addColorStop(1,   'rgba(200,225,255,0)')
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()
    }

    // ── Meadow ───────────────────────────────────────────────────────────────
    function drawMeadow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      // Rolling green foreground
      ctx.beginPath()
      ctx.moveTo(0, h)
      const steps = w
      for (let i = 0; i <= steps; i++) {
        const x = i
        const wave =
          Math.sin(x / w * Math.PI * 3 + t * 0.18) * 0.012 +
          Math.sin(x / w * Math.PI * 7 + t * 0.28) * 0.006
        const y = h * (0.72 + wave + (x / w) * 0.04)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.lineTo(w, h)
      ctx.closePath()

      const grad = ctx.createLinearGradient(0, h * 0.68, 0, h)
      grad.addColorStop(0,    '#7ab648')
      grad.addColorStop(0.3,  '#5d9632')
      grad.addColorStop(0.7,  '#4a7c28')
      grad.addColorStop(1,    '#3a6020')
      ctx.fillStyle = grad
      ctx.fill()
    }

    // ── God rays ─────────────────────────────────────────────────────────────
    function drawGodRays(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
      ctx.save()
      const sunX = w * 0.62
      const sunY = h * 0.12

      for (let i = 0; i < 7; i++) {
        const angle = -0.55 + i * 0.18 + Math.sin(t * 0.04 + i) * 0.03
        const len   = h * 1.1
        const x2    = sunX + Math.sin(angle) * len
        const y2    = sunY + Math.cos(angle) * len

        const grad = ctx.createLinearGradient(sunX, sunY, x2, y2)
        grad.addColorStop(0,   `rgba(255,245,200,${0.05 + i * 0.005})`)
        grad.addColorStop(0.4, `rgba(255,245,200,${0.025})`)
        grad.addColorStop(1,   `rgba(255,245,200,0)`)

        ctx.beginPath()
        ctx.moveTo(sunX, sunY)
        const spread = 0.04 + i * 0.008
        ctx.lineTo(
          sunX + Math.sin(angle - spread) * len,
          sunY + Math.cos(angle - spread) * len,
        )
        ctx.lineTo(x2, y2)
        ctx.lineTo(
          sunX + Math.sin(angle + spread) * len,
          sunY + Math.cos(angle + spread) * len,
        )
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
      }
      ctx.restore()
    }

    // ── Atmospheric haze ─────────────────────────────────────────────────────
    function drawHaze(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const grad = ctx.createLinearGradient(0, h * 0.38, 0, h * 0.62)
      grad.addColorStop(0,   'rgba(200,220,240,0)')
      grad.addColorStop(0.5, 'rgba(200,220,240,0.18)')
      grad.addColorStop(1,   'rgba(200,220,240,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, h * 0.38, w, h * 0.24)
    }

    // ── Sky gradient ─────────────────────────────────────────────────────────
    function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const grad = ctx.createLinearGradient(0, 0, 0, h * 0.72)
      grad.addColorStop(0,    '#4a82c8')
      grad.addColorStop(0.25, '#6fa0d8')
      grad.addColorStop(0.55, '#a8c8e8')
      grad.addColorStop(0.75, '#c8dff0')
      grad.addColorStop(1,    '#ddeef8')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h * 0.72)
    }

    // ── Sun ──────────────────────────────────────────────────────────────────
    function drawSun(ctx: CanvasRenderingContext2D, w: number, h: number) {
      const sx = w * 0.62
      const sy = h * 0.12
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.25)
      grad.addColorStop(0,    'rgba(255,250,220,0.95)')
      grad.addColorStop(0.04, 'rgba(255,245,180,0.7)')
      grad.addColorStop(0.15, 'rgba(255,235,150,0.25)')
      grad.addColorStop(0.4,  'rgba(255,230,140,0.08)')
      grad.addColorStop(1,    'rgba(255,230,140,0)')
      ctx.beginPath()
      ctx.arc(sx, sy, h * 0.25, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()
    }

    // ── Main render loop ─────────────────────────────────────────────────────
    function render() {
      const w = canvas!.width
      const h = canvas!.height
      t += 0.4

      ctx.clearRect(0, 0, w, h)

      // Sky
      drawSky(ctx, w, h)

      // Sun bloom
      drawSun(ctx, w, h)

      // God rays
      drawGodRays(ctx, w, h, t)

      // Mountain layers — back to front
      // Layer 1: very distant, pale blue, barely visible
      drawMountain(ctx, w, h, 0.44, 0.12, 10, t * 0.00008,
        'rgba(160,190,220,0.55)', 'rgba(140,175,215,0.65)', 0.05)

      // Layer 2: mid-far, cool blue-grey
      drawMountain(ctx, w, h, 0.46, 0.16, 20, t * 0.00013,
        'rgba(130,160,200,0.75)', 'rgba(110,145,185,0.85)', 0.08)

      // Layer 3: mid, medium blue-grey
      drawMountain(ctx, w, h, 0.50, 0.19, 30, t * 0.00018,
        'rgba(100,130,175,0.88)', 'rgba(85,115,160,0.92)', 0.12)

      // Layer 4: near, darker, more detail
      drawMountain(ctx, w, h, 0.54, 0.22, 40, t * 0.00024,
        'rgba(72,100,145,0.95)', 'rgba(55,80,120,0.97)', 0.18)

      // Snow caps on the two nearest ridges
      drawSnow(ctx, w, h, 0.50, 0.19, 30, t * 0.00018)
      drawSnow(ctx, w, h, 0.54, 0.22, 40, t * 0.00024)

      // Atmospheric haze band
      drawHaze(ctx, w, h)

      // Clouds
      for (const c of clouds) {
        drawCloud(ctx, c)
        c.x += c.speed
        if (c.x > w + 600) {
          const nc = makeCloud(w, h, true)
          Object.assign(c, nc)
        }
      }

      // Meadow foreground
      drawMeadow(ctx, w, h, t)

      animId = requestAnimationFrame(render)
    }

    initClouds(canvas.width, canvas.height)
    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}
