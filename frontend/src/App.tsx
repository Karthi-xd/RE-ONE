import LandingPage from './pages/LandingPage'

// Static, vintage-computer-styled desktop that lives in /public and is
// served as-is (no React involved) at this path once built/deployed.
const DESKTOP_URL = '/main-desktop.html'

export default function App() {
  return (
    <LandingPage
      onEnter={() => {
        window.location.href = DESKTOP_URL
      }}
    />
  )
}