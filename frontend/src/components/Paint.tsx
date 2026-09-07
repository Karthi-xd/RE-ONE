import { useEffect, useRef, useState } from 'react'
import DesktopWindow from './DesktopWindow'
import styles from './Paint.module.css'

interface PaintProps {
  zIndex: number
  initialX?: number
  initialY?: number
  onClose: () => void
  onFocus: () => void
}

const COLORS = ['#f4e7ca', '#e05252', '#e0a552', '#e0d652', '#6bc36b', '#529be0', '#8a6be0', '#12100d']

export default function Paint({ zIndex, initialX, initialY, onClose, onFocus }: PaintProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [color, setColor] = useState(COLORS[0])
  const [brushSize, setBrushSize] = useState(4)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#1c1a16'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  function handleMouseUp() {
    drawing.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#1c1a16'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <DesktopWindow
      title="Paint"
      icon="🎨"
      width={440}
      zIndex={zIndex}
      initialX={initialX}
      initialY={initialY}
      onClose={onClose}
      onFocus={onFocus}
    >
      <div className={styles.toolbar}>
        {COLORS.map((c) => (
          <button
            key={c}
            className={`${styles.swatch} ${c === color ? styles.active : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
        <input
          type="range"
          min={1}
          max={20}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className={styles.slider}
        />
        <button className={styles.clearBtn} onClick={clearCanvas}>
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={280}
        className={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </DesktopWindow>
  )
}