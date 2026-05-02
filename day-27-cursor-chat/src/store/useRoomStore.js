import { create } from 'zustand'
import { createDisplayName, createLocalUser, pickUserColor } from '../utils/identity'
import { pointDistance } from '../utils/viewport'

const presenceTimers = new Map()

const scheduleRemoteActivation = (id, set) => {
  window.clearTimeout(presenceTimers.get(id))
  presenceTimers.set(
    id,
    window.setTimeout(() => {
      set((state) => {
        const remote = state.remoteUsers[id]

        if (!remote || remote.presence !== 'entering') {
          return state
        }

        return {
          remoteUsers: {
            ...state.remoteUsers,
            [id]: {
              ...remote,
              presence: 'active',
            },
          },
        }
      })
      presenceTimers.delete(id)
    }, 650),
  )
}

export const useRoomStore = create((set, get) => ({
  localUser: createLocalUser(),
  hasJoined: false,
  remoteUsers: {},
  reactions: [],
  messages: [],

  setLocalName: (name) => {
    const trimmedName = name.trim()

    set((state) => ({
      localUser: {
        ...state.localUser,
        name: trimmedName || createDisplayName(),
      },
    }))
  },

  randomizeLocalIdentity: () => {
    set((state) => ({
      localUser: {
        ...state.localUser,
        name: createDisplayName(),
        color: pickUserColor(`${state.localUser.id}-${Date.now()}`),
      },
    }))
  },

  joinRoom: (name) => {
    const trimmedName = name?.trim()

    set((state) => ({
      hasJoined: true,
      localUser: {
        ...state.localUser,
        name: trimmedName || state.localUser.name || createDisplayName(),
        lastSeen: Date.now(),
      },
    }))
  },

  leaveRoom: () => {
    set({ hasJoined: false, remoteUsers: {}, reactions: [], messages: [] })
  },

  upsertRemoteUser: (user) => {
    if (!user || user.id === get().localUser.id) {
      return
    }

    set((state) => {
      const existing = state.remoteUsers[user.id]

      return {
        remoteUsers: {
          ...state.remoteUsers,
          [user.id]: {
            ...existing,
            ...user,
            trail: existing?.trail ?? [],
            presence: existing?.presence === 'leaving' ? 'active' : (existing?.presence ?? 'entering'),
            lastSeen: Date.now(),
          },
        },
      }
    })

    const remote = get().remoteUsers[user.id]
    if (remote?.presence === 'entering') {
      scheduleRemoteActivation(user.id, set)
    }
  },

  updateRemoteCursor: (user, position) => {
    if (!user || user.id === get().localUser.id) {
      return
    }

    set((state) => {
      const existing = state.remoteUsers[user.id]
      const previousPoint = existing ? { x: existing.x, y: existing.y } : null
      const nextPoint = {
        x: position?.x ?? user.x ?? 0.5,
        y: position?.y ?? user.y ?? 0.5,
      }
      const shouldAddTrail =
        previousPoint && pointDistance(previousPoint, nextPoint) > 0.006
      const nextTrail = shouldAddTrail
        ? [...(existing.trail ?? []), previousPoint].slice(-10)
        : (existing?.trail ?? [])

      return {
        remoteUsers: {
          ...state.remoteUsers,
          [user.id]: {
            ...existing,
            ...user,
            ...nextPoint,
            trail: nextTrail,
            presence: existing?.presence === 'leaving' ? 'active' : (existing?.presence ?? 'entering'),
            idle: false,
            lastSeen: Date.now(),
          },
        },
      }
    })

    const remote = get().remoteUsers[user.id]
    if (remote?.presence === 'entering') {
      scheduleRemoteActivation(user.id, set)
    }
  },

  removeRemoteUser: (id) => {
    window.clearTimeout(presenceTimers.get(id))
    presenceTimers.delete(id)

    set((state) => {
      const nextUsers = { ...state.remoteUsers }
      delete nextUsers[id]

      return { remoteUsers: nextUsers }
    })
  },

  markRemoteLeaving: (id) => {
    const remote = get().remoteUsers[id]

    if (!remote) {
      return
    }

    set((state) => ({
      remoteUsers: {
        ...state.remoteUsers,
        [id]: {
          ...state.remoteUsers[id],
          presence: 'leaving',
          lastSeen: Date.now(),
        },
      },
    }))

    window.clearTimeout(presenceTimers.get(id))
    presenceTimers.set(
      id,
      window.setTimeout(() => {
        get().removeRemoteUser(id)
      }, 800),
    )
  },

  prunePresence: () => {
    const now = Date.now()

    Object.values(get().remoteUsers).forEach((user) => {
      if (user.presence !== 'leaving' && now - user.lastSeen > 7000) {
        get().markRemoteLeaving(user.id)
      }
    })
  },

  setLocalPosition: (position) => {
    set((state) => ({
      localUser: {
        ...state.localUser,
        ...position,
        idle: false,
        lastSeen: Date.now(),
      },
    }))
  },

  setLocalTyping: (isTyping) => {
    set((state) => ({
      localUser: {
        ...state.localUser,
        isTyping,
        lastSeen: Date.now(),
      },
    }))
  },

  setLocalIdle: (idle) => {
    set((state) => ({
      localUser: {
        ...state.localUser,
        idle,
        lastSeen: Date.now(),
      },
    }))
  },

  addReaction: (reaction) => {
    set((state) => ({
      reactions: [...state.reactions, reaction].slice(-32),
    }))

    window.setTimeout(() => {
      get().removeReaction(reaction.id)
    }, 1200)
  },

  removeReaction: (id) => {
    set((state) => ({
      reactions: state.reactions.filter((reaction) => reaction.id !== id),
    }))
  },

  getLocalPresence: () => {
    const { localUser } = get()

    return {
      id: localUser.id,
      name: localUser.name,
      color: localUser.color,
      x: localUser.x,
      y: localUser.y,
      isTyping: localUser.isTyping,
      idle: localUser.idle,
      lastSeen: Date.now(),
    }
  },
}))
