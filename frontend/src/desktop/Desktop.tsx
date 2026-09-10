import { useEffect, useRef, useState } from 'react'
import styles from './Desktop.module.css'
import Window, { type WindowRect } from './Window'
import { Glyph, type GlyphId } from './icons'
import ExplorerApp, { YEARS } from './apps/ExplorerApp'
import RagApp from './apps/RagApp'
import MyComputerApp from './apps/MyComputerApp'
import RecycleBinApp from './apps/RecycleBinApp'
import NotepadApp from './apps/NotepadApp'
import CalculatorApp from './apps/CalculatorApp'
import PaintApp from './apps/PaintApp'
import wallpaperUrl from '../assets/desktop-wallpaper.jpg'

type AppKind = 'explorer' | 'rag' | 'mycomputer' | 'recyclebin' | 'notepad' | 'calculator' | 'paint'

interface WinEntry {
  id: string
  kind: AppKind
  title: string
  icon: GlyphId
  year?: string | null
  rect: WindowRect
  minimized: boolean
  maximized: boolean
  prevRect?: WindowRect
  zIndex: number
}

interface DesktopIconDef {
  id: string
  label: string
  glyph: GlyphId
}

// Shown as icons directly on the desktop.
const desktopIcons: DesktopIconDef[] = [
  { id: 'mycomputer', label: 'My Computer', glyph: 'computer' },
  { id: 'mydocs', label: 'My Documents', glyph: 'docs' },
  ...YEARS.map((y) => ({ id: y, label: y, glyph: 'folder' as GlyphId })),
  { id: 'recyclebin', label: 'Recycle Bin', glyph: 'recycle' },
]

// Shown only inside the Start menu, not on the desktop itself.
const startOnlyItems: DesktopIconDef[] = [
  { id: 'rag', label: 'Historical RAG', glyph: 'rag' },
  { id: 'notepad', label: 'Notepad', glyph: 'notepad' },
  { id: 'paint', label: 'Paint', glyph: 'paint' },
  { id: 'calculator', label: 'Calculator', glyph: 'calculator' },
]

// Full list used anywhere all apps need to be enumerated (e.g. My Computer body).
const allApps: DesktopIconDef[] = [...desktopIcons, ...startOnlyItems]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

function formatClock(d: Date) {
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${pad(d.getMinutes())} ${ampm}`
}

interface DesktopProps {
  onOpenMemory: (year: string) => void
}

export default function Desktop({ onOpenMemory }: DesktopProps) {
  const [windows, setWindows] = useState<WinEntry[]>([])
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null)
  const [startOpen, setStartOpen] = useState(false)
  const [clock, setClock] = useState(formatClock(new Date()))
  const zTop = useRef(10)
  const cascade = useRef({ x: 90, y: 60 })

  useEffect(() => {
    const t = setInterval(() => setClock(formatClock(new Date())), 15000)
    return () => clearInterval(t)
  }, [])

  function nextCascadePos() {
    const pos = { ...cascade.current }
    cascade.current = {
      x: ((cascade.current.x + 34) % 420) + 60,
      y: ((cascade.current.y + 28) % 260) + 50,
    }
    return pos
  }

  function focusWindow(id: string) {
    setFocusedId(id)
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, zIndex: ++zTop.current, minimized: false } : w)))
  }

  function openWindow(id: string, kind: AppKind, title: string, icon: GlyphId, opts?: { year?: string | null; width?: number; height?: number }) {
    setWindows((ws) => {
      const existing = ws.find((w) => w.id === id)
      if (existing) {
        return ws.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: ++zTop.current } : w))
      }
      const pos = nextCascadePos()
      const entry: WinEntry = {
        id,
        kind,
        title,
        icon,
        year: opts?.year ?? null,
        rect: { x: pos.x, y: pos.y, width: opts?.width ?? 560, height: opts?.height ?? 420 },
        minimized: false,
        maximized: false,
        zIndex: ++zTop.current,
      }
      return [...ws, entry]
    })
    setFocusedId(id)
  }

  function openApp(id: string) {
    if (YEARS.includes(id)) {
      openWindow(`folder-${id}`, 'explorer', `${id} - Historical Archive`, 'folder', { year: id, width: 620, height: 420 })
      return
    }
    switch (id) {
      case 'rag':
        openWindow('rag', 'rag', 'Historical RAG', 'rag', { width: 560, height: 460 })
        return
      case 'mycomputer':
        openWindow('mycomputer', 'mycomputer', 'My Computer', 'computer', { width: 480, height: 340 })
        return
      case 'mydocs':
        openWindow('mydocs', 'explorer', 'My Documents', 'docs', { year: null, width: 620, height: 420 })
        return
      case 'recyclebin':
        openWindow('recyclebin', 'recyclebin', 'Recycle Bin', 'recycle', { width: 420, height: 280 })
        return
      case 'notepad':
        openWindow('notepad', 'notepad', 'Untitled - Notepad', 'notepad', { width: 460, height: 400 })
        return
      case 'calculator':
        openWindow('calculator', 'calculator', 'Calculator', 'calculator', { width: 260, height: 400 })
        return
      case 'paint':
        openWindow('paint', 'paint', 'Paint', 'paint', { width: 620, height: 460 })
        return
    }
  }

  function openYearFolder(year: string) {
    openWindow(`folder-${year}`, 'explorer', `${year} - Historical Archive`, 'folder', { year, width: 620, height: 420 })
  }

  function openRag(year?: string) {
    openWindow('rag', 'rag', 'Historical RAG', 'rag', { year: year ?? null, width: 560, height: 460 })
  }

  function closeWindow(id: string) {
    setWindows((ws) => ws.filter((w) => w.id !== id))
    setFocusedId((f) => (f === id ? null : f))
  }

  function minimizeWindow(id: string) {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w)))
  }

  function toggleMaximize(id: string) {
    setWindows((ws) =>
      ws.map((w) => {
        if (w.id !== id) return w
        if (!w.maximized) return { ...w, maximized: true, prevRect: w.rect }
        return { ...w, maximized: false, rect: w.prevRect ?? w.rect }
      }),
    )
  }

  function updateRect(id: string, rect: WindowRect) {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, rect } : w)))
  }

  function handleTaskbarClick(id: string) {
    const w = windows.find((x) => x.id === id)
    if (!w) return
    if (w.minimized) {
      focusWindow(id)
    } else if (focusedId === id) {
      minimizeWindow(id)
    } else {
      focusWindow(id)
    }
  }

  function renderAppBody(w: WinEntry) {
    switch (w.kind) {
      case 'explorer':
        return <ExplorerApp year={w.year ?? null} onOpenYear={openYearFolder} onOpenRag={openRag} onOpenMemory={onOpenMemory} />
      case 'rag':
        return <RagApp prefillYear={w.year ?? undefined} />
      case 'mycomputer':
        return <MyComputerApp onOpen={openApp} />
      case 'recyclebin':
        return <RecycleBinApp />
      case 'notepad':
        return <NotepadApp />
      case 'calculator':
        return <CalculatorApp />
      case 'paint':
        return <PaintApp />
    }
  }

  return (
    <div className={styles.root}>
      <div
        className={styles.desktop}
        style={{ ['--wallpaper-url' as string]: `url(${wallpaperUrl})` }}
        onClick={() => {
          setSelectedIcon(null)
          setStartOpen(false)
        }}
      >
        <div className={styles.iconLayer}>
          {desktopIcons.map((ic) => (
            <div
              key={ic.id}
              className={`${styles.desktopIcon} ${selectedIcon === ic.id ? styles.selected : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIcon(ic.id)
              }}
              onDoubleClick={() => openApp(ic.id)}
            >
              <Glyph id={ic.glyph} className={styles.iconGlyph} />
              <div className={styles.iconLabel}>{ic.label}</div>
            </div>
          ))}
        </div>

        {windows.map((w) => (
          <Window
            key={w.id}
            title={w.title}
            icon={w.icon}
            rect={w.rect}
            zIndex={w.zIndex}
            focused={focusedId === w.id}
            minimized={w.minimized}
            maximized={w.maximized}
            onClose={() => closeWindow(w.id)}
            onMinimize={() => minimizeWindow(w.id)}
            onMaximize={() => toggleMaximize(w.id)}
            onFocus={() => focusWindow(w.id)}
            onRectChange={(r) => updateRect(w.id, r)}
          >
            {renderAppBody(w)}
          </Window>
        ))}
      </div>

      {startOpen && (
        <div className={styles.startMenu} onClick={(e) => e.stopPropagation()}>
          <div className={styles.sideStrip} />
          <div className={styles.menuCol}>
            <div className={styles.menuHeader}>Historical Archive</div>
            {allApps.map((ic) => (
              <div
                key={ic.id}
                className={styles.startItem}
                onClick={() => {
                  openApp(ic.id)
                  setStartOpen(false)
                }}
              >
                <Glyph id={ic.glyph} className={styles.startItemIcon} />
                {ic.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.taskbar}>
        <div
          className={styles.startBtn}
          onClick={(e) => {
            e.stopPropagation()
            setStartOpen((o) => !o)
          }}
        >
          <span className={styles.flag} /> Start
        </div>
        <div className={styles.taskbarSep} />
        <div className={styles.taskbarItems}>
          {windows.map((w) => (
            <div
              key={w.id}
              className={`${styles.taskbarItem} ${focusedId === w.id && !w.minimized ? styles.active : ''}`}
              onClick={() => handleTaskbarClick(w.id)}
            >
              <Glyph id={w.icon} className={styles.tbIcon} />
              <span>{w.title}</span>
            </div>
          ))}
        </div>
        <div className={styles.tray}>
          <span>{clock}</span>
        </div>
      </div>
    </div>
  )
}