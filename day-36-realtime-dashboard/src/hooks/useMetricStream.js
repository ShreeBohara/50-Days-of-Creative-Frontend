import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_THRESHOLDS } from '../data/metrics'
import { appendBoundedSample, createInitialHistory, createNextSample } from '../data/stream'

const BASE_INTERVAL = 100
const CHAOS_DURATION = 8000

export function useMetricStream() {
  const [history, setHistory] = useState(() => createInitialHistory())
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)
  const chaosUntilRef = useRef(0)

  useEffect(() => {
    if (isPaused) {
      return undefined
    }

    const timer = window.setInterval(() => {
      setHistory((currentHistory) => {
        const nextSample = createNextSample(currentHistory.at(-1), {
          chaosRemaining: Math.max(0, chaosUntilRef.current - Date.now()),
        })
        return appendBoundedSample(currentHistory, nextSample)
      })
    }, BASE_INTERVAL / speed)

    return () => window.clearInterval(timer)
  }, [isPaused, speed])

  const activateChaos = useCallback(() => {
    chaosUntilRef.current = Date.now() + CHAOS_DURATION
  }, [])

  return {
    history,
    isPaused,
    setIsPaused,
    speed,
    setSpeed,
    thresholds,
    setThresholds,
    activateChaos,
  }
}
