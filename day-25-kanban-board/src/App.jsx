import { useState, useCallback } from 'react'
import './App.css'
import TopBar from './components/TopBar'
import Board from './components/Board'
import CardModal from './components/CardModal'
import { DragProvider } from './components/DragContext'

function App() {
  const [modalCard, setModalCard] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({ labels: [], priorities: [] })

  const handleSearch = useCallback((query) => {
    setSearchQuery(query.toLowerCase().trim())
  }, [])

  return (
    <DragProvider>
      <div className="app-shell">
        <TopBar
          onSearch={handleSearch}
          filters={filters}
          onFilterChange={setFilters}
        />
        <Board
          onCardClick={setModalCard}
          searchQuery={searchQuery}
          filters={filters}
        />
        {modalCard && (
          <CardModal card={modalCard} onClose={() => setModalCard(null)} />
        )}
      </div>
    </DragProvider>
  )
}

export default App
