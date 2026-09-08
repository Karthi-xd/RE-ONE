import { useRef } from 'react'
import styles from './Window.module.css'
import { Glyph, type GlyphId } from './icons'

export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

interface WindowProps {
  title: string
  icon: GlyphId
  rect: WindowRect
  zIndex: number
  focused: boolean
  minimized: boolean
  maximized: boolean
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onRectChange: (rect: WindowRect) => void
  children: React.ReactNode
}

const MIN_W = 280
const MIN_H = 180

export default function Window({
  title,
  icon,
  rect,
  zIndex,
  focused,
  minimized,
  maximized,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onRectChange,
  children,
}: WindowProps) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)

  if (minimized) return null

  function handleTitleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(`.${styles.titleBtn}`)) return
    onFocus()
    if (maximized) return
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: rect.x, origY: rect.y }

    function handleMove(ev: MouseEvent) {
      if (!dragState.current) return
      const nx = dragState.current.origX + (ev.clientX - dragState.current.startX)
      let ny = dragState.current.origY + (ev.clientY - dragState.current.startY)
      ny = Math.max(0, Math.min(ny, window.innerHeight - 32))
      onRectChange({ ...rect, x: nx, y: ny })
    }
    function handleUp() {
      dragState.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onFocus()
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: rect.width, origH: rect.height }

    function handleMove(ev: MouseEvent) {
      if (!resizeState.current) return
      const w = Math.max(MIN_W, resizeState.current.origW + (ev.clientX - resizeState.current.startX))
      const h = Math.max(MIN_H, resizeState.current.origH + (ev.clientY - resizeState.current.startY))
      onRectChange({ ...rect, width: w, height: h })
    }
    function handleUp() {
      resizeState.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const style: React.CSSProperties = maximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 32px)', zIndex }
    : { left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex }

  return (
    <div
      className={`${styles.win} ${maximized ? styles.maximized : ''} ${focused ? styles.focused : styles.unfocused}`}
      style={style}
      onMouseDown={onFocus}
    >
      <div className={styles.titlebar} onMouseDown={handleTitleMouseDown} onDoubleClick={onMaximize}>
        <Glyph id={icon} className={styles.titleIcon} />
        <span className={styles.titleText}>{title}</span>
        <div className={styles.titleBtns}>
          <div className={styles.titleBtn} title="Minimize" onClick={onMinimize}>
            &#128469;
          </div>
          <div className={styles.titleBtn} title="Maximize" onClick={onMaximize}>
            &#9723;
          </div>
          <div className={`${styles.titleBtn} ${styles.closeBtn}`} title="Close" onClick={onClose}>
            &#10005;
          </div>
        </div>
      </div>
      <div className={styles.content}>{children}</div>
      {!maximized && <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />}
    </div>
  )
}
