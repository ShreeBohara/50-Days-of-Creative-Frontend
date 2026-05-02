import { MessageCircle, MousePointer2, Send, Sparkles, Users } from 'lucide-react'
import './App.css'

function App() {
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
            <span className="live-dot" />
            Local multi-tab room
          </div>
        </header>

        <section className="welcome-panel" data-control aria-labelledby="welcome-title">
          <div className="welcome-icon">
            <MousePointer2 size={26} aria-hidden="true" />
          </div>
          <p className="eyebrow">Figma-style presence</p>
          <h2 id="welcome-title">Open another tab and watch the room wake up.</h2>
          <p>
            Every tab becomes a collaborator with a colored cursor, live reactions, and
            chat bubbles that float from the pointer.
          </p>
          <form className="join-form">
            <label htmlFor="display-name">Display name</label>
            <div className="join-row">
              <input id="display-name" type="text" defaultValue="Teal Pixel" />
              <button type="button">
                <Sparkles size={18} aria-hidden="true" />
                Join
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
              <span className="user-dot" style={{ '--user-color': '#0d9488' }} />
              <span>You</span>
              <small>ready</small>
            </li>
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
