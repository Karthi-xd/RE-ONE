/**
 * SceneCanvas — Pixi.js v7 scene renderer
 *
 * Draws a wooden table from a slight top-down angle,
 * a worn leather diary, and a student ID card on top.
 * All rendering is procedural (no external image assets).
 */

import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'

// ── Palette ────────────────────────────────────────────────────────────────────
// Life is Strange warm/muted palette
const P = {
  tableDark:    0x2a1a0d,
  tableMid:     0x3d2812,
  tableLight:   0x5c3d1e,
  tableHighlight: 0x7a5535,
  grainDark:    0x1e1208,
  grainLight:   0x4a2f15,

  diaryDark:    0x2c1f0e,
  diaryMid:     0x3e2c14,
  diaryLight:   0x5a3e1c,
  diaryEdge:    0x1a1008,
  diaryText:    0xc4a882,
  diaryFaded:   0x8a7055,

  cardBase:     0xf0e8d8,
  cardCrease:   0xd4c8b0,
  cardDark:     0xb8aa90,
  cardBorder:   0x2a2010,
  cardText:     0x1a1408,
  cardFaded:    0x6a5c48,
  cardPhoto:    0x3a3028,

  shadowColor:  0x0a0604,
  lightWarm:    0xfff0c8,
  dustColor:    0xe8d4a0,
  ambientDust:  0xd4b878,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function noise1d(x: number, seed = 0) {
  return (
    Math.sin(x * 127.1 + seed * 311.7) * 0.5 +
    Math.sin(x * 311.7 + seed * 74.7)  * 0.25 +
    Math.sin(x * 74.7  + seed * 127.1) * 0.125
  )
}

// Draw a rounded rect on a Graphics object
function rRect(
  g: PIXI.Graphics,
  x: number, y: number, w: number, h: number,
  r: number, color: number, alpha = 1,
) {
  g.beginFill(color, alpha)
  g.drawRoundedRect(x, y, w, h, r)
  g.endFill()
}

// ── Table ─────────────────────────────────────────────────────────────────────

function drawTable(g: PIXI.Graphics, W: number, H: number) {
  // Base table surface
  g.beginFill(P.tableMid)
  g.drawRect(0, 0, W, H)
  g.endFill()

  // Wood grain planks — horizontal with slight perspective skew
  const plankCount = 7
  for (let i = 0; i < plankCount; i++) {
    const y0 = (i / plankCount) * H
    const y1 = ((i + 1) / plankCount) * H
    const shade = i % 2 === 0 ? P.tableDark : P.tableMid
    g.beginFill(shade, 0.5)
    g.drawRect(0, y0, W, y1 - y0)
    g.endFill()

    // Plank separator line
    g.lineStyle(1, P.grainDark, 0.4)
    g.moveTo(0, y1)
    g.lineTo(W, y1)
    g.lineStyle(0)
  }

  // Fine grain lines within each plank
  for (let plank = 0; plank < plankCount; plank++) {
    const py = (plank / plankCount) * H
    const ph = H / plankCount
    const lineCount = 18 + Math.floor(Math.abs(noise1d(plank * 3.7)) * 12)
    for (let j = 0; j < lineCount; j++) {
      const t   = (j + 0.5) / lineCount
      const y   = py + t * ph
      const nx  = noise1d(j * 0.31 + plank * 7.1) * 0.03
      const ny  = noise1d(j * 0.73 + plank * 2.3) * 0.025
      const col = noise1d(j * 1.1 + plank * 5.3) > 0 ? P.grainLight : P.grainDark
      const alp = 0.08 + Math.abs(noise1d(j * 2.1 + plank)) * 0.14

      g.lineStyle(0.6 + Math.abs(noise1d(j * 0.9)) * 0.8, col, alp)
      g.moveTo(nx * W,        y + ny * H)
      g.lineTo((1 + nx) * W,  y + ny * H * 0.6)
      g.lineStyle(0)
    }
  }

  // Warm window-light patch — comes from upper right
  const lightGrad = new PIXI.Graphics()
  // Simulate soft directional light with overlapping ellipses
  for (let i = 0; i < 6; i++) {
    const t = i / 6
    lightGrad.beginFill(P.lightWarm, lerp(0.07, 0.0, t))
    lightGrad.drawEllipse(W * 0.75, H * 0.22, W * lerp(0.55, 0.85, t), H * lerp(0.32, 0.55, t))
    lightGrad.endFill()
  }
  g.addChild(lightGrad)

  // Soft vignette — edges darker
  for (let i = 0; i < 8; i++) {
    const t = i / 8
    g.beginFill(P.tableDark, lerp(0.35, 0.0, t))
    g.drawRect(0, 0, W * lerp(0.28, 0.0, t), H)
    g.endFill()
    g.beginFill(P.tableDark, lerp(0.2, 0.0, t))
    g.drawRect(W * lerp(0.72, 1.0, t), 0, W, H)
    g.endFill()
  }
  // Bottom vignette
  for (let i = 0; i < 6; i++) {
    const t = i / 6
    g.beginFill(P.tableDark, lerp(0.4, 0.0, t))
    g.drawRect(0, H * lerp(0.72, 1.0, t), W, H)
    g.endFill()
  }
}

// ── Diary ─────────────────────────────────────────────────────────────────────

function drawDiary(g: PIXI.Graphics, dw: number, dh: number) {
  const r = 4

  // Drop shadow under diary
  for (let i = 8; i >= 0; i--) {
    g.beginFill(P.shadowColor, 0.06 - i * 0.005)
    g.drawRoundedRect(-i * 1.5, i * 2, dw + i * 3, dh + i * 1.5, r + i)
    g.endFill()
  }

  // Back cover (slightly larger)
  rRect(g, -3, 3, dw + 6, dh + 4, r, P.diaryEdge)

  // Cover base
  rRect(g, 0, 0, dw, dh, r, P.diaryMid)

  // Leather texture — overlapping brushed patches
  for (let i = 0; i < 60; i++) {
    const px  = noise1d(i * 1.7, 1) * 0.5 + 0.5
    const py  = noise1d(i * 2.3, 2) * 0.5 + 0.5
    const pw  = 0.08 + Math.abs(noise1d(i * 3.1, 3)) * 0.22
    const ph  = 0.06 + Math.abs(noise1d(i * 1.9, 4)) * 0.16
    const col = noise1d(i * 0.7, 5) > 0 ? P.diaryLight : P.diaryDark
    g.beginFill(col, 0.06 + Math.abs(noise1d(i * 4.1)) * 0.1)
    g.drawEllipse(px * dw, py * dh, pw * dw, ph * dh)
    g.endFill()
  }

  // Worn edges — darker border, slightly rough
  for (let i = 0; i < 4; i++) {
    g.lineStyle(1.5 - i * 0.3, P.diaryEdge, 0.25 - i * 0.05)
    g.drawRoundedRect(i, i, dw - i * 2, dh - i * 2, r)
    g.lineStyle(0)
  }

  // Cloth/leather vertical stitch lines
  for (let s = 0; s < 3; s++) {
    const sx = dw * (0.25 + s * 0.25)
    g.lineStyle(0.4, P.diaryDark, 0.18)
    g.moveTo(sx, 8)
    g.lineTo(sx, dh - 8)
    g.lineStyle(0)
  }

  // Central light catch — the worn high spot
  g.beginFill(P.diaryLight, 0.12)
  g.drawEllipse(dw * 0.42, dh * 0.35, dw * 0.28, dh * 0.2)
  g.endFill()

  // Spine (left edge — darker, slightly 3D)
  g.beginFill(P.diaryEdge, 0.6)
  g.drawRoundedRect(0, 0, 18, dh, r)
  g.endFill()
  g.beginFill(P.diaryMid, 0.3)
  g.drawRect(14, 0, 4, dh)
  g.endFill()

  // Horizontal band / strap detail across middle
  g.beginFill(P.diaryDark, 0.35)
  g.drawRect(18, dh * 0.44, dw - 18, dh * 0.12)
  g.endFill()
  g.lineStyle(0.6, P.diaryEdge, 0.4)
  g.moveTo(18, dh * 0.44)
  g.lineTo(dw, dh * 0.44)
  g.moveTo(18, dh * 0.56)
  g.lineTo(dw, dh * 0.56)
  g.lineStyle(0)

  // "2015 – 2020" stamp text — drawn as simple horizontal bars
  // (simulates worn letterpress / rubber stamp look)
  drawStampText(dw, dh)
}

function drawStampText(dw: number, dh: number) {
  void dw; void dh
}

// ── ID Card ───────────────────────────────────────────────────────────────────

function drawCard(g: PIXI.Graphics, cw: number, ch: number) {
  const r = 6

  // Shadow
  for (let i = 6; i >= 0; i--) {
    g.beginFill(P.shadowColor, 0.07 - i * 0.009)
    g.drawRoundedRect(-i, i * 1.5, cw + i * 2, ch + i, r + i)
    g.endFill()
  }

  // Card body
  rRect(g, 0, 0, cw, ch, r, P.cardBase)

  // Subtle card surface variation — slight aging patches
  for (let i = 0; i < 30; i++) {
    const px = noise1d(i * 2.3, 10) * 0.5 + 0.5
    const py = noise1d(i * 1.7, 11) * 0.5 + 0.5
    const pr = 0.04 + Math.abs(noise1d(i * 3.7, 12)) * 0.12
    g.beginFill(P.cardCrease, 0.06 + Math.abs(noise1d(i * 1.1, 13)) * 0.09)
    g.drawEllipse(px * cw, py * ch, pr * cw, pr * ch * 0.6)
    g.endFill()
  }

  // Crease lines — two gentle diagonals
  g.lineStyle(0.7, P.cardDark, 0.18)
  g.moveTo(cw * 0.1, 0)
  g.lineTo(cw * 0.0, ch * 0.4)
  g.moveTo(cw * 0.7, ch)
  g.lineTo(cw * 0.85, ch * 0.6)
  g.lineStyle(0)

  // Top color bar (institution color stripe)
  rRect(g, 0, 0, cw, ch * 0.14, r, 0x3d2c1a)
  g.beginFill(0x3d2c1a)
  g.drawRect(0, ch * 0.08, cw, ch * 0.06)
  g.endFill()
  // Subtle stripe highlight
  g.beginFill(0x5a4228, 0.5)
  g.drawRect(0, ch * 0.07, cw, 2)
  g.endFill()

  // Bottom border
  rRect(g, 0, ch - ch * 0.06, cw, ch * 0.06, r, 0x3d2c1a)
  g.beginFill(0x3d2c1a)
  g.drawRect(0, ch - ch * 0.1, cw, ch * 0.04)
  g.endFill()

  // Photo placeholder — top left
  const px = cw * 0.08
  const py = ch * 0.2
  const pw = cw * 0.28
  const ph = ch * 0.5
  rRect(g, px, py, pw, ph, 3, P.cardPhoto)
  // Photo — simple silhouette (head + shoulders)
  g.beginFill(0x5a4a38, 0.7)
  g.drawEllipse(px + pw * 0.5, py + ph * 0.32, pw * 0.28, ph * 0.26)  // head
  g.endFill()
  g.beginFill(0x5a4a38, 0.55)
  g.drawEllipse(px + pw * 0.5, py + ph * 0.82, pw * 0.42, ph * 0.32)  // shoulders
  g.endFill()
  // Photo border
  g.lineStyle(1, P.cardBorder, 0.3)
  g.drawRoundedRect(px, py, pw, ph, 3)
  g.lineStyle(0)

  // Card border
  g.lineStyle(1, P.cardBorder, 0.25)
  g.drawRoundedRect(0, 0, cw, ch, r)
  g.lineStyle(0)

  // Slight gloss highlight — top left catch
  g.beginFill(0xffffff, 0.06)
  g.drawEllipse(cw * 0.18, ch * 0.18, cw * 0.22, ch * 0.12)
  g.endFill()
}

// ── Dust particles ────────────────────────────────────────────────────────────

interface DustParticle {
  x: number; y: number
  vx: number; vy: number
  size: number; alpha: number
  life: number; maxLife: number
  phase: number
}

function makeDust(W: number, H: number): DustParticle {
  // Only spawn in lit area (upper-right light patch)
  const x = W * (0.45 + Math.random() * 0.45)
  const y = H * (Math.random() * 0.6)
  return {
    x, y,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -0.04 - Math.random() * 0.08,
    size: 0.8 + Math.random() * 1.4,
    alpha: 0,
    life: 0,
    maxLife: 280 + Math.random() * 400,
    phase: Math.random() * Math.PI * 2,
  }
}

// ── Main scene setup & animation ──────────────────────────────────────────────

export interface SceneHandle {
  destroy: () => void
  onCardLifted: (cb: () => void) => void
}

export function createScene(container: HTMLElement): SceneHandle {
  const W = container.clientWidth
  const H = container.clientHeight

  // ── App ──
  const app = new PIXI.Application({
    width: W, height: H,
    backgroundColor: P.tableDark,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })
  container.appendChild(app.view as HTMLCanvasElement)

  // ── Layers ──
  const tableLayer   = new PIXI.Container()
  const diaryLayer   = new PIXI.Container()
  const cardLayer    = new PIXI.Container()
  const dustLayer    = new PIXI.Container()
  const uiLayer      = new PIXI.Container()

  app.stage.addChild(tableLayer, diaryLayer, cardLayer, dustLayer, uiLayer)

  // ── Table ──
  const tableG = new PIXI.Graphics()
  drawTable(tableG, W, H)
  tableLayer.addChild(tableG)

  // ── Diary ──
  const DW = Math.min(W * 0.42, 360)
  const DH = DW * 1.42
  const DX = W * 0.5 - DW * 0.5 - W * 0.04
  const DY = H * 0.5 - DH * 0.5 + H * 0.04

  const diaryG = new PIXI.Graphics()
  drawDiary(diaryG, DW, DH)
  diaryG.x = DX
  diaryG.y = DY
  diaryLayer.addChild(diaryG)

  // Diary text
  const diaryTitle = new PIXI.Text('2015 – 2020', {
    fontFamily: 'Special Elite',
    fontSize:   Math.max(14, DW * 0.072),
    fill:       P.diaryText,
    letterSpacing: 2,
  })
  diaryTitle.alpha = 0.75
  diaryTitle.anchor.set(0.5)
  diaryTitle.x = DX + DW * 0.56
  diaryTitle.y = DY + DH * 0.52
  diaryTitle.alpha = 0.62
  diaryLayer.addChild(diaryTitle)

  // Faint "PERSONAL RECORD" subtitle
  const diarySubtitle = new PIXI.Text('PERSONAL  RECORD', {
    fontFamily: 'Special Elite',
    fontSize:   Math.max(7, DW * 0.035),
    fill:       P.diaryFaded,
    letterSpacing: 4,
  })
  diarySubtitle.anchor.set(0.5)
  diarySubtitle.x = DX + DW * 0.56
  diarySubtitle.y = DY + DH * 0.60
  diarySubtitle.alpha = 0.38
  diaryLayer.addChild(diarySubtitle)

  // ── Pen (optional minimal prop) ──
  const penG = new PIXI.Graphics()
  // Pen body — thin long rect, slightly angled
  penG.beginFill(0x1a1208, 0.85)
  penG.drawRoundedRect(0, 0, 5, DH * 0.72, 3)
  penG.endFill()
  penG.beginFill(0xc8a060, 0.5)
  penG.drawRect(1, 0, 3, 12)
  penG.endFill()
  penG.x = DX + DW + 28
  penG.y = DY + DH * 0.18
  penG.rotation = 0.12
  penG.alpha = 0.7
  diaryLayer.addChild(penG)

  // ── ID Card ──
  const CW = DW * 0.72
  const CH = CW * 0.63
  // Rests on diary, tilted slightly
  const CX_BASE = DX + DW * 0.5 - CW * 0.5 + DW * 0.08
  const CY_BASE = DY + DH * 0.24 - CH * 0.5

  const cardContainer = new PIXI.Container()
  cardContainer.x = CX_BASE + CW * 0.5
  cardContainer.y = CY_BASE + CH * 0.5
  cardContainer.rotation = -0.06  // slight tilt

  const cardG = new PIXI.Graphics()
  drawCard(cardG, CW, CH)
  cardG.x = -CW * 0.5
  cardG.y = -CH * 0.5
  cardContainer.addChild(cardG)

  // Card text labels
  function cardText(str: string, size: number, color: number, alpha: number): PIXI.Text {
    const t = new PIXI.Text(str, {
      fontFamily: 'Special Elite',
      fontSize: size,
      fill: color,
      letterSpacing: 1,
    })
    t.alpha = alpha
    cardContainer.addChild(t)
    return t
  }

  // Institution label in top bar
  const instLabel = cardText('BLACKWELL ACADEMY', Math.max(6, CW * 0.065), 0xc8a878, 0.75)
  instLabel.anchor.set(0.5, 0.5)
  instLabel.x = CW * 0.12
  instLabel.y = -CH * 0.5 + CH * 0.07
  instLabel.scale.set(0.85, 1)

  // Name "CGK"
  const nameLabel = cardText('CGK', Math.max(13, CW * 0.11), P.cardText, 0.82)
  nameLabel.x = -CW * 0.5 + CW * 0.42
  nameLabel.y = -CH * 0.5 + CH * 0.24

  // "STUDENT ID" label
  const idLabel = cardText('STUDENT  ID', Math.max(6, CW * 0.055), P.cardFaded, 0.55)
  idLabel.x = -CW * 0.5 + CW * 0.42
  idLabel.y = -CH * 0.5 + CH * 0.38

  // ID number — faded
  const idNum = cardText('BW-2015-0471', Math.max(5, CW * 0.048), P.cardFaded, 0.38)
  idNum.x = -CW * 0.5 + CW * 0.42
  idNum.y = -CH * 0.5 + CH * 0.5

  // Grade / year field
  const gradeLabel = cardText('GR. 5  |  2015', Math.max(5, CW * 0.048), P.cardFaded, 0.35)
  gradeLabel.x = -CW * 0.5 + CW * 0.42
  gradeLabel.y = -CH * 0.5 + CH * 0.62

  cardLayer.addChild(cardContainer)

  // ── Hint text ──
  const hint = new PIXI.Text('drag the card to open', {
    fontFamily: 'Lato',
    fontStyle: 'italic',
    fontSize: Math.max(10, W * 0.013),
    fill: 0xc8a878,
    letterSpacing: 2,
  })
  hint.anchor.set(0.5)
  hint.x = W * 0.5
  hint.y = H * 0.88
  hint.alpha = 0
  uiLayer.addChild(hint)

  gsap.to(hint, { alpha: 0.45, delay: 1.8, duration: 1.4, ease: 'power2.out' })

  // ── Dust particles ──
  const particles: DustParticle[] = Array.from({ length: 28 }, () => {
    const p = makeDust(W, H)
    p.life = Math.random() * p.maxLife  // stagger start
    return p
  })

  const dustGraphics = new PIXI.Graphics()
  dustLayer.addChild(dustGraphics)

  // ── Idle card sway animation ──
  let idleCardTween: gsap.core.Tween | null = null

  function startIdleSway() {
    idleCardTween = gsap.to(cardContainer, {
      rotation: -0.06 + 0.018,
      y: cardContainer.y + 1.8,
      duration: 3.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  }
  startIdleSway()

  // ── Parallax on mouse move ──
  let mouseX = W * 0.5
  let mouseY = H * 0.5
  let targetParallaxX = 0
  let targetParallaxY = 0
  let currentParallaxX = 0
  let currentParallaxY = 0

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
    const nx = (e.clientX / W - 0.5)
    const ny = (e.clientY / H - 0.5)
    targetParallaxX = nx * 12
    targetParallaxY = ny * 8
  })

  // ── Ambient light flicker ──
  let lightPhase = 0

  // ── Drag state ──
  let isDragging = false
  let dragOffX   = 0
  let dragOffY   = 0
  let cardLifted = false
  let cardLiftedCb: (() => void) | null = null

  // Interaction — make card interactive
  cardContainer.eventMode  = 'static'
  cardContainer.cursor     = 'grab'

  cardContainer.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
    if (cardLifted) return
    isDragging = true
    idleCardTween?.pause()
    document.body.classList.add('dragging')
    cardContainer.cursor = 'grabbing'
    cardContainer.zIndex = 10

    const local = cardContainer.parent.toLocal(e.global)
    dragOffX = local.x - cardContainer.x
    dragOffY = local.y - cardContainer.y

    // Lift effect
    gsap.to(cardContainer.scale, { x: 1.04, y: 1.04, duration: 0.2, ease: 'power2.out' })
    gsap.to(cardContainer, { rotation: -0.08, duration: 0.2, ease: 'power2.out' })

    hint.alpha = 0
  })

  app.stage.eventMode = 'static'

  app.stage.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
    if (!isDragging) return
    const local = cardContainer.parent.toLocal(e.global)
    cardContainer.x = local.x - dragOffX
    cardContainer.y = local.y - dragOffY
  })

  app.stage.on('pointerup', () => {
    if (!isDragging) return
    isDragging = false
    document.body.classList.remove('dragging')
    cardContainer.cursor = 'grab'

    const dx = cardContainer.x - (CX_BASE + CW * 0.5)
    const dy = cardContainer.y - (CY_BASE + CH * 0.5)
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > Math.min(W, H) * 0.18) {
      // Dragged far enough — card is lifted off
      cardLifted = true
      gsap.to(cardContainer, {
        x: W * 0.5,
        y: H * 0.5,
        rotation: 0.0,
        alpha: 0,
        duration: 0.7,
        ease: 'power3.inOut',
        onComplete: () => cardLiftedCb?.(),
      })
      gsap.to(cardContainer.scale, { x: 1.12, y: 1.12, duration: 0.35, ease: 'power2.out' })
    } else {
      // Snap back
      gsap.to(cardContainer, {
        x: CX_BASE + CW * 0.5,
        y: CY_BASE + CH * 0.5,
        rotation: -0.06,
        duration: 0.55,
        ease: 'elastic.out(1, 0.6)',
      })
      gsap.to(cardContainer.scale, { x: 1, y: 1, duration: 0.3, ease: 'power2.out' })
      setTimeout(() => {
        if (!isDragging) startIdleSway()
      }, 600)
      gsap.to(hint, { alpha: 0.35, duration: 1, delay: 0.8 })
    }
  })

  // ── Ticker / render loop ──
  app.ticker.add(() => {
    const dt = app.ticker.deltaTime

    // Smooth parallax
    currentParallaxX = lerp(currentParallaxX, targetParallaxX, 0.04)
    currentParallaxY = lerp(currentParallaxY, targetParallaxY, 0.04)

    tableLayer.x = -currentParallaxX * 0.5
    tableLayer.y = -currentParallaxY * 0.5
    diaryLayer.x = -currentParallaxX * 0.8
    diaryLayer.y = -currentParallaxY * 0.8
    if (!isDragging) {
      cardLayer.x = -currentParallaxX * 1.2
      cardLayer.y = -currentParallaxY * 1.2
    }

    // Light flicker — very subtle brightness shift
    lightPhase += dt * 0.008
    const flicker = 1.0 + Math.sin(lightPhase) * 0.012 + Math.sin(lightPhase * 2.7) * 0.006
    tableLayer.alpha = flicker
    diaryLayer.alpha = 0.98 + Math.sin(lightPhase * 1.3) * 0.012

    // Dust
    dustGraphics.clear()
    void mouseX; void mouseY
    for (const p of particles) {
      p.life += dt
      if (p.life > p.maxLife) {
        Object.assign(p, makeDust(W, H))
        p.life = 0
      }

      const lt = p.life / p.maxLife
      const fadeIn  = Math.min(lt / 0.12, 1)
      const fadeOut = Math.min((1 - lt) / 0.12, 1)
      const a = fadeIn * fadeOut * p.alpha

      // Drift with gentle wobble
      p.x  += p.vx + Math.sin(p.life * 0.018 + p.phase) * 0.06
      p.y  += p.vy + Math.cos(p.life * 0.022 + p.phase) * 0.04

      if (a < 0.005) continue

      // Only draw if in the lit patch (upper right)
      const inLight = p.x > W * 0.38 && p.y < H * 0.7
      if (!inLight) continue

      const maxA = 0.55
      dustGraphics.beginFill(P.dustColor, Math.min(a, maxA))
      dustGraphics.drawCircle(p.x, p.y, p.size)
      dustGraphics.endFill()
    }
  })

  // ── Resize handler ──
  function onResize() {
    const nW = container.clientWidth
    const nH = container.clientHeight
    app.renderer.resize(nW, nH)
  }
  window.addEventListener('resize', onResize)

  return {
    destroy() {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', () => {})
      app.destroy(true, { children: true, texture: true, baseTexture: true })
    },
    onCardLifted(cb) {
      cardLiftedCb = cb
    },
  }
}
