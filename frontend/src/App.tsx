import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import Desktop from './desktop/Desktop'
import MemoryPage from './pages/MemoryPage'

export default function App() {
  const [entered, setEntered] = useState(false)
  const [memoryYear, setMemoryYear] = useState<string | null>(null)

  if (memoryYear) {
    return <MemoryPage year={memoryYear} onBack={() => setMemoryYear(null)} />
  }

  if (entered) {
    return <Desktop onOpenMemory={setMemoryYear} />
  }

  return <LandingPage onEnter={() => setEntered(true)} />
}