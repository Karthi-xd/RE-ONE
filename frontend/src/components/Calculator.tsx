import { useState } from 'react'
import DesktopWindow from './DesktopWindow'
import styles from './Calculator.module.css'

interface CalculatorProps {
  zIndex: number
  initialX?: number
  initialY?: number
  onClose: () => void
  onFocus: () => void
}

export default function Calculator({ zIndex, initialX, initialY, onClose, onFocus }: CalculatorProps) {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [waitingForNew, setWaitingForNew] = useState(false)

  function inputDigit(digit: string) {
    if (waitingForNew) {
      setDisplay(digit)
      setWaitingForNew(false)
    } else {
      setDisplay(display === '0' ? digit : display + digit)
    }
  }

  function inputDot() {
    if (waitingForNew) {
      setDisplay('0.')
      setWaitingForNew(false)
      return
    }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  function clearAll() {
    setDisplay('0')
    setPrev(null)
    setOperator(null)
    setWaitingForNew(false)
  }

  function compute(a: number, b: number, op: string): number {
    switch (op) {
      case '+':
        return a + b
      case '-':
        return a - b
      case '×':
        return a * b
      case '÷':
        return b === 0 ? NaN : a / b
      default:
        return b
    }
  }

  function handleOperator(nextOp: string) {
    const inputValue = parseFloat(display)
    if (prev === null) {
      setPrev(inputValue)
    } else if (operator) {
      const result = compute(prev, inputValue, operator)
      setDisplay(String(result))
      setPrev(result)
    }
    setWaitingForNew(true)
    setOperator(nextOp)
  }

  function handleEquals() {
    if (operator === null || prev === null) return
    const inputValue = parseFloat(display)
    const result = compute(prev, inputValue, operator)
    setDisplay(String(result))
    setPrev(null)
    setOperator(null)
    setWaitingForNew(true)
  }

  function toggleSign() {
    setDisplay(String(parseFloat(display) * -1))
  }

  function percent() {
    setDisplay(String(parseFloat(display) / 100))
  }

  const buttons: { label: string; onClick: () => void; className?: string }[] = [
    { label: 'C', onClick: clearAll, className: styles.fn },
    { label: '±', onClick: toggleSign, className: styles.fn },
    { label: '%', onClick: percent, className: styles.fn },
    { label: '÷', onClick: () => handleOperator('÷'), className: styles.op },
    { label: '7', onClick: () => inputDigit('7') },
    { label: '8', onClick: () => inputDigit('8') },
    { label: '9', onClick: () => inputDigit('9') },
    { label: '×', onClick: () => handleOperator('×'), className: styles.op },
    { label: '4', onClick: () => inputDigit('4') },
    { label: '5', onClick: () => inputDigit('5') },
    { label: '6', onClick: () => inputDigit('6') },
    { label: '-', onClick: () => handleOperator('-'), className: styles.op },
    { label: '1', onClick: () => inputDigit('1') },
    { label: '2', onClick: () => inputDigit('2') },
    { label: '3', onClick: () => inputDigit('3') },
    { label: '+', onClick: () => handleOperator('+'), className: styles.op },
    { label: '0', onClick: () => inputDigit('0'), className: styles.zero },
    { label: '.', onClick: inputDot },
    { label: '=', onClick: handleEquals, className: styles.op },
  ]

  return (
    <DesktopWindow
      title="Calculator"
      icon="🧮"
      width={260}
      zIndex={zIndex}
      initialX={initialX}
      initialY={initialY}
      onClose={onClose}
      onFocus={onFocus}
    >
      <div className={styles.display}>{display}</div>
      <div className={styles.grid}>
        {buttons.map((b) => (
          <button key={b.label} className={`${styles.btn} ${b.className ?? ''}`} onClick={b.onClick}>
            {b.label}
          </button>
        ))}
      </div>
    </DesktopWindow>
  )
}