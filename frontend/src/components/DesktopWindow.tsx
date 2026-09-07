import { useEffect, useRef, useState } from 'react'
import styles from './DesktopWindow.module.css'

interface DesktopWindowProps {
  title: string
  icon?: string
  initialX?: number
  initialY?: number
  width?: number
  zIndex: number
  onClose: () => void
  onFocus: () => void
  children: React.ReactNode
}

export default function DesktopWindow({
  title,
  icon,
  initialX = 120,
  initialY = 100,
  width = 420,
  zIndex,
  onClose,
  onFocus,
  children,
}: DesktopWindowProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY })
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null)

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      if (!dragRef.current) return
      setPos({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      })
    }
    function handleUp() {
      dragRef.current = null
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  function handleTitleMouseDown(e: React.MouseEvent) {
    onFocus()
    dragRef.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y }
  }

  return (
    <div
      className={styles.window}
      style={{ left: pos.x, top: pos.y, width, zIndex }}
      onMouseDown={onFocus}
    >
      <div className={styles.titlebar} onMouseDown={handleTitleMouseDown}>
        <span className={styles.titleText}>
          {icon && <span className={styles.titleIcon}>{icon}</span>}
          {title}
        </span>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  )
}