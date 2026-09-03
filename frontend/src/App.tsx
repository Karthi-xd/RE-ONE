import { useState } from 'react'
import LandingPage from './pages/LandingPage'
import MainPage from './pages/MainPage'

export default function App() {
  const [entered, setEntered] = useState(false)

  return entered
    ? <MainPage />
    : <LandingPage onEnter={() => setEntered(true)} />
}