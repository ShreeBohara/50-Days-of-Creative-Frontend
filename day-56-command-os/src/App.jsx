import { useCallback, useEffect, useMemo, useState } from 'react'
import Dashboard from './dashboard/Dashboard.jsx'
import CommandPalette from './palette/CommandPalette.jsx'
import { useCommandK } from './palette/useCommandK.jsx'
import { buildCommandGroups } from './palette/useCommandRegistry.js'
import Icon from './icons.jsx'
import { documents as seedDocs, people, statusTone } from './dashboard/dashboardData.js'

const me = people[0]

// Monotonic label for freshly-created demo documents.
let untitledCount = 0

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

  // Prepend a fresh doc, flag it for the row entrance animation, then clear the
  // flag so the highlight only plays once.
  const createDocument = useCallback(() => {
    const n = (untitledCount += 1)
    const id = `new-${Date.now()}-${n}`
    const doc = {
      id,
      title: `Untitled document ${n}`,
      type: 'Doc',
      ownerId: me.id,
      updated: 'Just now',
      status: 'Draft',
    }
    setDocuments((docs) => [doc, ...docs])
    setNavActive('docs')
    setNewDocId(id)
    window.setTimeout(() => setNewDocId((cur) => (cur === id ? null : cur)), 1200)
  }, [])

  const copyLink = useCallback(() => {
    return navigator.clipboard?.writeText(window.location.href)
  }, [])

  const openDocument = openDocId ? documents.find((d) => d.id === openDocId) : null

  // Palette open state + ⌘K/Ctrl+K global hotkey.
  const palette = useCommandK()

  // Actions the palette can run — shared with the dashboard so both stay in sync.
  const actions = useMemo(
    () => ({
      navigate: (id) => setNavActive(id),
      toggleSidebar,
      openDoc,
      createDocument,
      copyLink,
      setTheme,
      setAccent,
    }),
    [toggleSidebar, openDoc, createDocument, copyLink],
  )

  const commandGroups = useMemo(
    () => buildCommandGroups({ actions, documents }),
    [actions, documents],
  )

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
        onOpenPalette={palette.open}
        onCreateDocument={createDocument}
        newDocId={newDocId}
        onOpenDoc={openDoc}
      />

      <CommandPalette open={palette.isOpen} onClose={palette.close} groups={commandGroups} />

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
