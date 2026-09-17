import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import Desktop from './desktop/Desktop'
import MemoryPage from './pages/MemoryPage'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [memoryYear, setMemoryYear] = useState<string | null>(null)
  const [memoryOrigin, setMemoryOrigin] = useState<DOMRect | null>(null)

  function openMemory(year: string, origin?: DOMRect) {
    setMemoryOrigin(origin ?? null)
    setMemoryYear(year)
  }

  if (!entered) {
    return <LandingPage onEnter={() => setEntered(true)} />
  }

  return (
    <>
      {/* Desktop stays mounted underneath so it's visible behind the
          expanding circle during the zoom-in, instead of a blank gap
          where Desktop used to be. */}
      <Desktop onOpenMemory={openMemory} />
      {memoryYear && <MemoryPage year={memoryYear} origin={memoryOrigin} onBack={() => setMemoryYear(null)} />}
    </>
  )
}