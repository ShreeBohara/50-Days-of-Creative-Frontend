import { useEffect, useRef, useState } from 'react'
import { MessageCircle, MousePointer2, Send, Shuffle, Sparkles, Users } from 'lucide-react'
import { ChatBubbles } from './components/ChatBubbles'
import { CursorLayer } from './components/CursorLayer'
import { EmojiPicker, ReactionLayer } from './components/Reactions'
import { useBroadcastRoom } from './hooks/useBroadcastRoom'
import { useCursorTracking } from './hooks/useCursorTracking'
import { useRoomStore } from './store/useRoomStore'
import { normalizePoint } from './utils/viewport'
import './App.css'

const defaultEmoji = '✨'

const getPresenceLabel = (user, isLocal = false) => {
  if (!isLocal && user.presence === 'leaving') {
    return 'leaving'
  }

  if (user.idle) {
    return 'idle'
  }

  return isLocal ? 'you' : 'live'
}

function App() {
  const localUser = useRoomStore((state) => state.localUser)
  const hasJoined = useRoomStore((state) => state.hasJoined)
  const remoteUsers = useRoomStore((state) => state.remoteUsers)
  const reactions = useRoomStore((state) => state.reactions)
  const messages = useRoomStore((state) => state.messages)
  const addReaction = useRoomStore((state) => state.addReaction)
  const addMessage = useRoomStore((state) => state.addMessage)
  const setLocalTyping = useRoomStore((state) => state.setLocalTyping)
  const joinRoom = useRoomStore((state) => state.joinRoom)
  const randomizeLocalIdentity = useRoomStore((state) => state.randomizeLocalIdentity)
  const { post, isSupported } = useBroadcastRoom()
  const [nameInput, setNameInput] = useState(localUser.name)
  const [chatInput, setChatInput] = useState('')
  const [picker, setPicker] = useState(null)
  const typingTimer = useRef(0)
  const collaborators = Object.values(remoteUsers)
  useCursorTracking(post)

  useEffect(() => () => window.clearTimeout(typingTimer.current), [])

  const handleJoin = (event) => {
    event.preventDefault()
    joinRoom(nameInput)
  }

  const handleRandomize = () => {
    randomizeLocalIdentity()
    const latestName = useRoomStore.getState().localUser.name
    setNameInput(latestName)
  }

  const sendReaction = (emoji, point) => {
    if (!hasJoined) {
      return
    }

    const reaction = {
      id: `reaction-${localUser.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      emoji,
      x: point.x,
      y: point.y,
      color: localUser.color,
      userId: localUser.id,
    }

    addReaction(reaction)
    post('reaction', reaction)
    setPicker(null)
  }

  const isControlClick = (event) => event.target.closest('[data-control]')

  const handleCanvasClick = (event) => {
    if (!hasJoined || event.button !== 0 || isControlClick(event)) {
      return
    }

    sendReaction(defaultEmoji, normalizePoint(event.clientX, event.clientY))
  }

  const handleCanvasContextMenu = (event) => {
    if (!hasJoined || isControlClick(event)) {
      return
    }

    event.preventDefault()
    setPicker({
      clientX: Math.max(92, Math.min(event.clientX, window.innerWidth - 120)),
      clientY: Math.max(92, Math.min(event.clientY, window.innerHeight - 120)),
      point: normalizePoint(event.clientX, event.clientY),
    })
  }

  const stopTypingSoon = () => {
    window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => {
      setLocalTyping(false)
      post('typing', { isTyping: false })
    }, 900)
  }

  const handleChatChange = (event) => {
    setChatInput(event.target.value)

    if (!hasJoined) {
      return
    }

    setLocalTyping(true)
    post('typing', { isTyping: true })
    stopTypingSoon()
  }

  const handleChatSubmit = (event) => {
    event.preventDefault()

    const text = chatInput.trim()

    if (!hasJoined || !text) {
      return
    }

    const message = {
      id: `message-${localUser.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text,
      x: localUser.x,
      y: localUser.y,
      color: localUser.color,
      userId: localUser.id,
      name: localUser.name,
    }

    addMessage(message)
    post('chat', message)
    setChatInput('')
    setLocalTyping(false)
    post('typing', { isTyping: false })
  }

  return (
    <main className="room-app">
      <section
        className="room-canvas"
        aria-label="Collaborative cursor canvas"
        onClick={handleCanvasClick}
        onContextMenu={handleCanvasContextMenu}
      >
        <div className="canvas-grid" aria-hidden="true" />
        <div className="canvas-glow canvas-glow-a" aria-hidden="true" />
        <div className="canvas-glow canvas-glow-b" aria-hidden="true" />
        {hasJoined ? <ChatBubbles messages={messages} /> : null}
        {hasJoined ? <ReactionLayer reactions={reactions} /> : null}
        {hasJoined ? <CursorLayer users={collaborators} /> : null}
        <EmojiPicker
          picker={picker}
          onPick={sendReaction}
          onDismiss={() => setPicker(null)}
        />

        <header className="room-header" data-control>
          <div>
            <p className="eyebrow">Day 27</p>
            <h1>Cursor Chat Room</h1>
          </div>
          <div className="room-status-pill">
            <span className={`live-dot ${hasJoined ? 'is-online' : ''}`} />
            {isSupported ? `${collaborators.length + 1} in local room` : 'BroadcastChannel unavailable'}
          </div>
        </header>

        <section className="welcome-panel" data-control aria-labelledby="welcome-title">
          <div className="welcome-icon">
            <MousePointer2 size={26} aria-hidden="true" />
          </div>
          <p className="eyebrow">Figma-style presence</p>
          <h2 id="welcome-title">Open another tab and watch the room wake up.</h2>
          <p>
            {hasJoined
              ? 'You are in. Open this same URL in another tab to sync live presence.'
              : 'Every tab becomes a collaborator with a colored cursor, live reactions, and chat bubbles that float from the pointer.'}
          </p>
          <form className="join-form" onSubmit={handleJoin}>
            <label htmlFor="display-name">Display name</label>
            <div className="join-row">
              <input
                id="display-name"
                type="text"
                value={nameInput}
                maxLength={28}
                onChange={(event) => setNameInput(event.target.value)}
              />
              <button type="submit">
                <Sparkles size={18} aria-hidden="true" />
                {hasJoined ? 'Joined' : 'Join'}
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Generate another display name"
                onClick={handleRandomize}
              >
                <Shuffle size={18} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>

        <aside className="users-panel" data-control aria-label="Connected users">
          <div className="panel-title">
            <Users size={18} aria-hidden="true" />
            <span>Connected</span>
          </div>
          <ul>
            <li>
              <span className="user-dot" style={{ '--user-color': localUser.color }} />
              <span>{localUser.name}</span>
              <small>{hasJoined ? getPresenceLabel(localUser, true) : 'ready'}</small>
            </li>
            {collaborators.map((user) => (
              <li
                className={`user-row is-${user.presence} ${user.idle ? 'is-idle' : ''}`}
                key={user.id}
              >
                <span className="user-dot" style={{ '--user-color': user.color }} />
                <span>{user.name}</span>
                <small>{getPresenceLabel(user)}</small>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chat-panel" data-control aria-label="Room chat">
          <div className="panel-title">
            <MessageCircle size={18} aria-hidden="true" />
            <span>Room chat</span>
          </div>
          <form className="chat-form" onSubmit={handleChatSubmit}>
            <input
              type="text"
              placeholder={hasJoined ? 'Say something near your cursor...' : 'Join to chat...'}
              value={chatInput}
              maxLength={96}
              disabled={!hasJoined}
              onBlur={() => {
                setLocalTyping(false)
                post('typing', { isTyping: false })
              }}
              onChange={handleChatChange}
            />
            <button type="submit" aria-label="Send message" disabled={!hasJoined || !chatInput.trim()}>
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>

        {hasJoined ? (
          <button
            className="reaction-fab"
            type="button"
            data-control
            aria-label="Open emoji reactions"
            onClick={() => {
              const point = { x: localUser.x, y: localUser.y }
              setPicker({
                clientX: Math.max(92, window.innerWidth - 106),
                clientY: Math.max(92, window.innerHeight - 168),
                point,
              })
            }}
          >
            <Sparkles size={20} aria-hidden="true" />
          </button>
        ) : null}
      </section>
    </main>
  )
}

export default App
