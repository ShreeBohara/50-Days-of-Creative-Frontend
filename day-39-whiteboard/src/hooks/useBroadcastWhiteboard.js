import { useEffect, useMemo, useRef } from 'react'
import { COLORS } from '../data/whiteboardConfig'
import { useWhiteboardStore } from '../store/useWhiteboardStore'

const CHANNEL_NAME = 'day-39-whiteboard-sync'

function createClient() {
  const id = `tab-${Math.random().toString(36).slice(2, 8)}`
  const color = COLORS[Math.floor(Math.random() * Math.min(COLORS.length, 8))]

  return {
    id,
    color,
    name: `Tab ${id.slice(-3).toUpperCase()}`,
  }
}

export function useBroadcastWhiteboard() {
  const elements = useWhiteboardStore((state) => state.elements)
  const channelRef = useRef(null)
  const suppressNextStatePostRef = useRef(false)
  const client = useMemo(() => createClient(), [])

  useEffect(() => {
    const setStatus = useWhiteboardStore.getState().setCollaborationStatus

    if (typeof BroadcastChannel === 'undefined') {
      setStatus('unsupported')
      return undefined
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    setStatus('online')

    const post = (type, payload = {}) => {
      channel.postMessage({
        type,
        senderId: client.id,
        client,
        payload,
        sentAt: Date.now(),
      })
    }

    useWhiteboardStore.getState().setBroadcastCursor((point) => {
      post('cursor', point)
    })

    const handleMessage = (event) => {
      const message = event.data

      if (!message?.type || message.senderId === client.id) {
        return
      }

      const store = useWhiteboardStore.getState()

      if (message.type === 'hello') {
        post('state', { elements: store.elements })
        return
      }

      if (message.type === 'state' && Array.isArray(message.payload?.elements)) {
        suppressNextStatePostRef.current = true
        store.setElements(message.payload.elements, false)
        return
      }

      if (message.type === 'cursor') {
        store.upsertRemoteCursor({
          ...message.client,
          ...message.payload,
        })
        return
      }

      if (message.type === 'leave') {
        store.removeRemoteCursor(message.senderId)
      }
    }

    channel.addEventListener('message', handleMessage)
    post('hello')

    const pruneTimer = window.setInterval(() => {
      useWhiteboardStore.getState().pruneRemoteCursors()
    }, 2500)

    const sendLeave = () => {
      post('leave')
    }

    window.addEventListener('beforeunload', sendLeave)

    return () => {
      sendLeave()
      window.clearInterval(pruneTimer)
      window.removeEventListener('beforeunload', sendLeave)
      channel.removeEventListener('message', handleMessage)
      channel.close()
      channelRef.current = null
      useWhiteboardStore.getState().setBroadcastCursor(() => {})
      setStatus('offline')
    }
  }, [client])

  useEffect(() => {
    const channel = channelRef.current

    if (!channel) {
      return
    }

    if (suppressNextStatePostRef.current) {
      suppressNextStatePostRef.current = false
      return
    }

    channel.postMessage({
      type: 'state',
      senderId: client.id,
      client,
      payload: { elements },
      sentAt: Date.now(),
    })
  }, [client, elements])
}
