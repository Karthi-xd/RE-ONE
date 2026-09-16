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

  if (memoryYear) {
    return <MemoryPage year={memoryYear} origin={memoryOrigin} onBack={() => setMemoryYear(null)} />
  }

  if (entered) {
    return <Desktop onOpenMemory={openMemory} />
  }

  return <LandingPage onEnter={() => setEntered(true)} />
}