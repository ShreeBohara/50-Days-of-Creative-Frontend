import { useState } from 'react'
import { MessageCircle, MousePointer2, Send, Shuffle, Sparkles, Users } from 'lucide-react'
import { useBroadcastRoom } from './hooks/useBroadcastRoom'
import { useCursorTracking } from './hooks/useCursorTracking'
import { useRoomStore } from './store/useRoomStore'
import './App.css'

function App() {
  const localUser = useRoomStore((state) => state.localUser)
  const hasJoined = useRoomStore((state) => state.hasJoined)
  const remoteUsers = useRoomStore((state) => state.remoteUsers)
  const joinRoom = useRoomStore((state) => state.joinRoom)
  const randomizeLocalIdentity = useRoomStore((state) => state.randomizeLocalIdentity)
  const { post, isSupported } = useBroadcastRoom()
  const [nameInput, setNameInput] = useState(localUser.name)
  const collaborators = Object.values(remoteUsers)
  useCursorTracking(post)

  const handleJoin = (event) => {
    event.preventDefault()
    joinRoom(nameInput)
  }

  const handleRandomize = () => {
    randomizeLocalIdentity()
    const latestName = useRoomStore.getState().localUser.name
    setNameInput(latestName)
  }

  return (
    <main className="room-app">
      <section className="room-canvas" aria-label="Collaborative cursor canvas">
        <div className="canvas-grid" aria-hidden="true" />
        <div className="canvas-glow canvas-glow-a" aria-hidden="true" />
        <div className="canvas-glow canvas-glow-b" aria-hidden="true" />

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
              <small>{hasJoined ? 'you' : 'ready'}</small>
            </li>
            {collaborators.map((user) => (
              <li className={`user-row is-${user.presence}`} key={user.id}>
                <span className="user-dot" style={{ '--user-color': user.color }} />
                <span>{user.name}</span>
                <small>{user.presence === 'leaving' ? 'leaving' : 'live'}</small>
              </li>
            ))}
          </ul>
        </aside>

        <section className="chat-panel" data-control aria-label="Room chat">
          <div className="panel-title">
            <MessageCircle size={18} aria-hidden="true" />
            <span>Room chat</span>
          </div>
          <form className="chat-form">
            <input type="text" placeholder="Say something near your cursor..." />
            <button type="button" aria-label="Send message">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      </section>
    </main>
  )
}

export default App
