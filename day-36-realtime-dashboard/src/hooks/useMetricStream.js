import { useCallback, useEffect, useRef, useState } from 'react'
import { createCrossingAlerts } from '../data/alerts'
import { DEFAULT_THRESHOLDS, MAX_ALERTS } from '../data/metrics'
import { appendBoundedSample, createInitialHistory, createNextSample } from '../data/stream'

const BASE_INTERVAL = 100
const CHAOS_DURATION = 8000

export function useMetricStream() {
  const [history, setHistory] = useState(() => createInitialHistory())
  const [alerts, setAlerts] = useState([])
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)
  const chaosUntilRef = useRef(0)
  const latestSampleRef = useRef(history.at(-1))

  useEffect(() => {
    if (isPaused) {
      return undefined
    }

    const timer = window.setInterval(() => {
      const previousSample = latestSampleRef.current
      const nextSample = createNextSample(previousSample, {
        chaosRemaining: Math.max(0, chaosUntilRef.current - Date.now()),
      })
      const crossings = createCrossingAlerts(previousSample, nextSample, thresholds)

      latestSampleRef.current = nextSample
      setHistory((currentHistory) => appendBoundedSample(currentHistory, nextSample))
      if (crossings.length) {
        setAlerts((currentAlerts) => [...crossings.reverse(), ...currentAlerts].slice(0, MAX_ALERTS))
      }
    }, BASE_INTERVAL / speed)

    return () => window.clearInterval(timer)
  }, [isPaused, speed, thresholds])

  const activateChaos = useCallback(() => {
    chaosUntilRef.current = Date.now() + CHAOS_DURATION
  }, [])

  return {
    history,
    alerts,
    isPaused,
    setIsPaused,
    speed,
    setSpeed,
    thresholds,
    setThresholds,
    activateChaos,
  }
}
