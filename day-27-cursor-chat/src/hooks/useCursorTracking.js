import { useEffect, useRef } from 'react'
import { useRoomStore } from '../store/useRoomStore'
import { normalizePoint } from '../utils/viewport'

const SEND_INTERVAL = 30
const IDLE_AFTER = 5000

export function useCursorTracking(post) {
  const hasJoined = useRoomStore((state) => state.hasJoined)
  const setLocalPosition = useRoomStore((state) => state.setLocalPosition)
  const setLocalIdle = useRoomStore((state) => state.setLocalIdle)
  const idleRef = useRef(false)

  useEffect(() => {
    if (!hasJoined) {
      return undefined
    }

    let frameId = 0
    let lastSentAt = 0
    let idleTimer = 0
    let latestPoint = null

    const setActive = () => {
      window.clearTimeout(idleTimer)

      if (idleRef.current) {
        idleRef.current = false
        setLocalIdle(false)
        post('idle', { idle: false })
      }

      idleTimer = window.setTimeout(() => {
        idleRef.current = true
        setLocalIdle(true)
        post('idle', { idle: true })
      }, IDLE_AFTER)
    }

    const flushPoint = () => {
      frameId = 0

      if (!latestPoint) {
        return
      }

      const now = performance.now()
      setLocalPosition(latestPoint)

      if (now - lastSentAt > SEND_INTERVAL) {
        post('cursor', latestPoint)
        lastSentAt = now
      }
    }

    const queuePoint = (clientX, clientY) => {
      latestPoint = normalizePoint(clientX, clientY)
      setActive()

      if (!frameId) {
        frameId = window.requestAnimationFrame(flushPoint)
      }
    }

    const handlePointerMove = (event) => {
      queuePoint(event.clientX, event.clientY)
    }

    const handleTouchMove = (event) => {
      const touch = event.touches[0]

      if (touch) {
        queuePoint(touch.clientX, touch.clientY)
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    setActive()

    return () => {
      window.clearTimeout(idleTimer)
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [hasJoined, post, setLocalIdle, setLocalPosition])
}
