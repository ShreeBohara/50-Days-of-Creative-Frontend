import { useCallback, useEffect, useRef } from 'react'
import { useRoomStore } from '../store/useRoomStore'

const CHANNEL_NAME = 'day-27-cursor-chat-room'

export function useBroadcastRoom() {
  const hasJoined = useRoomStore((state) => state.hasJoined)
  const upsertRemoteUser = useRoomStore((state) => state.upsertRemoteUser)
  const markRemoteLeaving = useRoomStore((state) => state.markRemoteLeaving)
  const prunePresence = useRoomStore((state) => state.prunePresence)
  const channelRef = useRef(null)
  const isSupported = typeof BroadcastChannel !== 'undefined'

  const post = useCallback((type, payload = {}) => {
    const channel = channelRef.current

    if (!channel) {
      return false
    }

    const state = useRoomStore.getState()
    const user = state.getLocalPresence()

    channel.postMessage({
      type,
      senderId: user.id,
      user,
      payload,
      sentAt: Date.now(),
    })

    return true
  }, [])

  useEffect(() => {
    if (!hasJoined || !isSupported) {
      return undefined
    }

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    const handleMessage = (event) => {
      const message = event.data
      const localId = useRoomStore.getState().localUser.id

      if (!message?.type || message.senderId === localId) {
        return
      }

      if (message.user) {
        upsertRemoteUser(message.user)
      }

      if (message.type === 'join') {
        post('hello')
      }

      if (message.type === 'leave') {
        markRemoteLeaving(message.senderId)
      }
    }

    const sendLeave = () => {
      post('leave')
    }

    channel.addEventListener('message', handleMessage)
    window.addEventListener('beforeunload', sendLeave)
    post('join')

    const heartbeat = window.setInterval(() => {
      post('hello')
      prunePresence()
    }, 2500)

    return () => {
      sendLeave()
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', sendLeave)
      channel.removeEventListener('message', handleMessage)
      channel.close()
      channelRef.current = null
    }
  }, [hasJoined, isSupported, markRemoteLeaving, post, prunePresence, upsertRemoteUser])

  return { post, isSupported }
}
