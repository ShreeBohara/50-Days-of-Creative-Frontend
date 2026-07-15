import { useCallback, useEffect, useMemo, useState } from 'react'
import Dashboard from './dashboard/Dashboard.jsx'
import Icon from './icons.jsx'
import { documents as seedDocs, people, statusTone } from './dashboard/dashboardData.js'

const me = people[0]

export default function App() {
  // --- theme + accent -------------------------------------------------
  const [theme, setTheme] = useState('dark') // 'dark' | 'light' | 'system'
  const [accent, setAccent] = useState('violet') // violet | magenta | blue | emerald

  // Resolve 'system' against the OS preference and reflect the choice on <html>
  // so every CSS token switches at once.
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'light' : 'dark') : theme
      root.dataset.theme = resolved
    }
    apply()
    if (theme === 'system') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.accent = accent
  }, [accent])

  // --- dashboard state ------------------------------------------------
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navActive, setNavActive] = useState('home')
  const [documents, setDocuments] = useState(seedDocs)
  const [openDocId, setOpenDocId] = useState(null)
  const [newDocId, setNewDocId] = useState(null)

  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [],
  )

  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), [])
  const openDoc = useCallback((id) => setOpenDocId(id), [])
  const closeDoc = useCallback(() => setOpenDocId(null), [])

  const openDocument = openDocId ? documents.find((d) => d.id === openDocId) : null

  // Placeholder palette trigger — the real palette lands in the next commit.
  const openPalette = useCallback(() => {
    setSidebarCollapsed(false)
  }, [])

  return (
    <>
      <Dashboard
        me={me}
        navActive={navActive}
        onNav={setNavActive}
        documents={documents}
        peopleById={peopleById}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        onOpenPalette={openPalette}
        newDocId={newDocId}
        onOpenDoc={openDoc}
      />

      {openDocument && (
        <DocModal doc={openDocument} owner={peopleById[openDocument.ownerId]} onClose={closeDoc} />
      )}
    </>
  )
}

function DocModal({ doc, owner, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-scrim" onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={doc.title} onClick={(e) => e.stopPropagation()}>
        <header>
          <span className="ficon" style={{ width: 30, height: 30 }}><Icon name="doc" /></span>
          <h3>{doc.title}</h3>
        </header>
        <div className="body">
          A live preview of <b style={{ color: 'var(--text)' }}>{doc.title}</b>. In a real product this
          is where the document would render — here it stands in so palette actions have something to open.
          <div className="meta-row">
            <div><b>Type</b>{doc.type}</div>
            <div><b>Owner</b>{owner?.name ?? 'Unassigned'}</div>
            <div><b>Updated</b>{doc.updated}</div>
            <div><b>Status</b><span className={`pill ${statusTone[doc.status] ?? 'neutral'}`}>{doc.status}</span></div>
          </div>
        </div>
        <footer>
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn primary" onClick={onClose}>Open editor</button>
        </footer>
      </div>
    </div>
  )
}
