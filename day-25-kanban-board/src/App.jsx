import { useState } from 'react'
import './App.css'
import TopBar from './components/TopBar'
import Board from './components/Board'
import CardModal from './components/CardModal'
import { DragProvider } from './components/DragContext'

function App() {
  const [modalCard, setModalCard] = useState(null)

  return (
    <DragProvider>
      <div className="app-shell">
        <TopBar />
        <Board onCardClick={setModalCard} />
        {modalCard && (
          <CardModal card={modalCard} onClose={() => setModalCard(null)} />
        )}
      </div>
    </DragProvider>
  )
}

export default App
