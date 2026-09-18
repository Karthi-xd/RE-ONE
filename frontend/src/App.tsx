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

  return (
    <>
      {/* Desktop is mounted from the start so the login transition
          dissolves straight into it - no gap, no cut through black. */}
      <Desktop onOpenMemory={openMemory} />
      {!entered && <LandingPage onEnter={() => setEntered(true)} />}
      {entered && memoryYear && (
        <MemoryPage year={memoryYear} origin={memoryOrigin} onBack={() => setMemoryYear(null)} />
      )}
    </>
  )
}