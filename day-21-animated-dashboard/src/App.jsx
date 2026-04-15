import { useState } from 'react'

/* ── Navigation items ── */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'users',     label: 'Users',     icon: '👥' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
  { id: 'reports',   label: 'Reports',   icon: '📋' },
]

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  return (
    <div className={`dashboard ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">⚡</span>
          {sidebarOpen && <span className="sidebar-title">Analytix</span>}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◂' : '▸'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {activePage === item.id && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Top Bar ── */}
      <header className="topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Menu"
        >
          ☰
        </button>
        <div className="topbar-search">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search anything…" className="search-input" />
        </div>
        <div className="topbar-actions">
          <button className="topbar-btn notification-btn" aria-label="Notifications">
            🔔
            <span className="notification-badge">3</span>
          </button>
          <div className="topbar-avatar">SB</div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="main-content">
        <div className="page-header">
          <h1>{NAV_ITEMS.find((n) => n.id === activePage)?.label}</h1>
          <p className="page-subtitle">Welcome back — here's what's happening today.</p>
        </div>

        {/* Stat cards placeholder */}
        <section className="stat-cards">
          <div className="stat-card placeholder-card">Stats loading…</div>
          <div className="stat-card placeholder-card">Stats loading…</div>
          <div className="stat-card placeholder-card">Stats loading…</div>
          <div className="stat-card placeholder-card">Stats loading…</div>
        </section>

        {/* Charts placeholder */}
        <section className="charts-grid">
          <div className="chart-card chart-large placeholder-card">Line Chart</div>
          <div className="chart-card placeholder-card">Bar Chart</div>
          <div className="chart-card placeholder-card">Donut Chart</div>
          <div className="chart-card chart-large placeholder-card">Area Chart</div>
        </section>
      </main>
    </div>
  )
}

export default App
