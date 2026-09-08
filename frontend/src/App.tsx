import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import Desktop from './desktop/Desktop'

export default function App() {
  const [entered, setEntered] = useState(false)

  if (entered) {
    return <Desktop />
  }

  return <LandingPage onEnter={() => setEntered(true)} />
}
