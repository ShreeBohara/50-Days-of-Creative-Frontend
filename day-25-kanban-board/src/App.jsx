import './App.css'
import TopBar from './components/TopBar'
import Board from './components/Board'
import { DragProvider } from './components/DragContext'

function App() {
  return (
    <DragProvider>
      <div className="app-shell">
        <TopBar />
        <Board />
      </div>
    </DragProvider>
  )
}

export default App
