import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function MainPage() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(
      ref.current,
      { opacity: 0 },
      { opacity: 1, duration: 1.2, ease: 'power2.out' }
    )
  }, [])

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100vh',
        background: '#12100d',
      }}
    />
  )
}