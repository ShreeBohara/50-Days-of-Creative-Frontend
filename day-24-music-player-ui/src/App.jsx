import { PlayerProvider } from './context/PlayerContext'
import Sidebar from './components/Sidebar'
import PlayerBar from './components/PlayerBar'
import HomeView from './views/HomeView'
import './App.css'

function App() {
  return (
    <PlayerProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <HomeView />
        </main>
        <PlayerBar />
      </div>
    </PlayerProvider>
  )
}

export default App
