import { create } from 'zustand'
import { createDisplayName, createLocalUser, pickUserColor } from '../utils/identity'

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
