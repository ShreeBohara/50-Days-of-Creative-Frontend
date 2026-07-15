import Icon from '../icons.jsx'
import { navItems, stats, people, statusTone } from './dashboardData.js'

// Deterministic avatar colour from a hue stored on each person.
const avatarStyle = (hue) => ({
  background: `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${hue + 40} 68% 48%))`,
})

function Avatar({ person, className = 'avatar' }) {
  return (
    <span className={className} style={avatarStyle(person.hue)} aria-hidden="true">
      {person.initials}
    </span>
  )
}

/**
 * The backdrop app the palette acts on. Purely presentational — all state and
 * actions live in App so the command registry and the UI share one source.
 */
export default function Dashboard({
  me,
  navActive,
  onNav,
  documents,
  peopleById,
  sidebarCollapsed,
  onToggleSidebar,
  onOpenPalette,
  newDocId,
  onOpenDoc,
}) {
  return (
    <div className="app" data-sidebar={sidebarCollapsed ? 'collapsed' : 'open'}>
      <aside className="sidebar" aria-label="Primary">
        <div className="sidebar-inner">
          <div className="brand">
            <span className="brand-mark">⌘</span>
            <span className="brand-name">
              CommandOS
              <small>Acme workspace</small>
            </span>
          </div>

          <p className="nav-label">Workspace</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              className="nav-item"
              aria-current={navActive === item.id}
              onClick={() => onNav(item.id)}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}

          <div className="sidebar-spacer" />

          <div className="user-chip">
            <Avatar person={me} />
            <span className="meta">
              <b>{me.name}</b>
              <span>{me.role}</span>
            </span>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar" title="Toggle sidebar (⌘.)">
            <Icon name="sidebar" />
          </button>
          <nav className="crumbs hide-sm" aria-label="Breadcrumb">
            <span>Acme</span>
            <Icon name="chevronRight" />
            <b>{navItems.find((n) => n.id === navActive)?.label ?? 'Overview'}</b>
          </nav>

          <div className="topbar-spacer" />

          <button className="search-trigger" onClick={onOpenPalette} aria-label="Open command palette">
            <Icon name="search" />
            <span className="st-label">Search or run a command…</span>
            <span className="kbd">⌘K</span>
          </button>
          <button className="icon-btn hide-sm" aria-label="Notifications">
            <Icon name="bell" />
          </button>
        </header>

        <main className="content">
          <div className="page-head">
            <h1>Overview</h1>
            <p>Press <span className="kbd">⌘K</span> to search, navigate, and run commands — everything here responds.</p>
          </div>

          <section className="stat-grid" aria-label="Key metrics">
            {stats.map((s) => (
              <div className="stat-card" key={s.id}>
                <div className="label">{s.label}</div>
                <div className="value">{s.value}</div>
                <div className={`delta ${s.trend === 'down' ? 'down' : ''}`}>{s.delta} this week</div>
              </div>
            ))}
          </section>

          <section className="panel-card" aria-label="Documents">
            <div className="panel-head">
              <h2>Documents</h2>
              <span className="count">{documents.length}</span>
              <span className="grow" />
              <button className="btn" onClick={onOpenPalette}>
                <Icon name="plus" /> New
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="hide-sm">Owner</th>
                    <th className="hide-sm">Updated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const owner = peopleById[doc.ownerId]
                    return (
                      <tr
                        key={doc.id}
                        className={`doc-row${doc.id === newDocId ? ' is-new' : ''}`}
                        onClick={() => onOpenDoc(doc.id)}
                      >
                        <td>
                          <span className="doc-title">
                            <span className="ficon"><Icon name="doc" /></span>
                            {doc.title}
                          </span>
                        </td>
                        <td className="hide-sm">
                          <span className="owner-cell">
                            {owner && <Avatar person={owner} />}
                            {owner?.name ?? 'Unassigned'}
                          </span>
                        </td>
                        <td className="hide-sm" style={{ color: 'var(--text-dim)' }}>{doc.updated}</td>
                        <td>
                          <span className={`pill ${statusTone[doc.status] ?? 'neutral'}`}>{doc.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export { Avatar, people }
