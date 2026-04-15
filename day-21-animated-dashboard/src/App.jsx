import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  generateStatData, generateTimeSeriesData, shiftTimeSeriesData,
  generateMonthlyData, generateCategoryData, generateAreaData,
  rand, randInt,
} from './data'

/* ── Navigation items ── */
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'users',     label: 'Users',     icon: '👥' },
  { id: 'settings',  label: 'Settings',  icon: '⚙️' },
  { id: 'reports',   label: 'Reports',   icon: '📋' },
]

/* ── FAB actions ── */
const FAB_ACTIONS = [
  { icon: '➕', label: 'Add Widget', angle: -90 },
  { icon: '📤', label: 'Export', angle: -135 },
  { icon: '🔄', label: 'Refresh', angle: -180 },
  { icon: '⚙️', label: 'Settings', angle: -45 },
]

/* ── Custom useCountUp hook ── */
function useCountUp(target, duration = 1500, isFloat = false) {
  const [count, setCount] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const start = performance.now()
    const from = 0

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4)
      const current = from + (target - from) * ease
      setCount(isFloat ? +current.toFixed(2) : Math.round(current))
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [target, duration, isFloat])

  return count
}

/* ── Format number with commas ── */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/* ── Custom Tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <p className="label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="value">
          <span style={{ background: p.color }} />
          {p.name}: {typeof p.value === 'number' ? formatNumber(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

/* ── Stat Card Component ── */
function StatCard({ stat, index, pulse }) {
  const displayValue = useCountUp(stat.value, 1800, stat.id === 'conversion')
  const isPositive = stat.change >= 0

  return (
    <motion.div
      className={`stat-card ${pulse ? 'pulse' : ''}`}
      style={{ '--card-accent': stat.color }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="stat-card-header">
        <div className="stat-card-icon">{stat.icon}</div>
        <span className="stat-card-label">{stat.label}</span>
      </div>
      <div className="stat-card-value" style={{ color: stat.color }}>
        {stat.prefix}{formatNumber(displayValue)}{stat.suffix}
      </div>
      <div className="stat-card-footer">
        <span className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(stat.change)}%
        </span>
        <div className="stat-sparkline">
          <ResponsiveContainer width="100%" height={32}>
            <LineChart data={stat.sparkline}>
              <Line
                type="monotone"
                dataKey="v"
                stroke={stat.color}
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Live Line Chart ── */
function LiveLineChart({ data }) {
  return (
    <motion.div
      className="chart-card chart-large"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Revenue Overview</h3>
          <p className="chart-card-subtitle">Live traffic & revenue data</p>
        </div>
        <span className="chart-live-dot">Live</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lineGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} width={45} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            name="Revenue"
            stroke="#00d4ff"
            strokeWidth={2}
            fill="url(#lineGrad)"
            animationDuration={600}
          />
          <Area
            type="monotone"
            dataKey="sessions"
            name="Sessions"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#lineGrad2)"
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

/* ── Monthly Bar Chart with gradient fills ── */
function MonthlyBarChart({ data }) {
  return (
    <motion.div
      className="chart-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Monthly Comparison</h3>
          <p className="chart-card-subtitle">This year vs last year</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barGap={4}>
          <defs>
            <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={1} />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="thisYear"
            name="2026"
            fill="url(#barGrad1)"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
          <Bar
            dataKey="lastYear"
            name="2025"
            fill="url(#barGrad2)"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

/* ── Category Donut Chart ── */
function CategoryDonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <motion.div
      className="chart-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
    >
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Category Breakdown</h3>
          <p className="chart-card-subtitle">Sales by category</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
            nameKey="name"
            paddingAngle={3}
            animationBegin={200}
            animationDuration={1000}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <text x="50%" y="47%" className="donut-center-label" textAnchor="middle">
            {formatNumber(total)}
          </text>
          <text x="50%" y="57%" className="donut-center-sub" textAnchor="middle">
            Total Sales
          </text>
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-legend">
        {data.map((d, i) => (
          <span key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: d.color }} />
            {d.name}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Stacked Area Chart with gradient fills ── */
function StackedArea({ data }) {
  return (
    <motion.div
      className="chart-card chart-large"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
    >
      <div className="chart-card-header">
        <div>
          <h3 className="chart-card-title">Traffic Sources</h3>
          <p className="chart-card-subtitle">Hourly breakdown by source</p>
        </div>
        <span className="chart-time-badge">Last 24h</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradOrg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4ff" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#00d4ff" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradRef" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
          <Area
            type="monotone"
            dataKey="organic"
            name="Organic"
            stackId="1"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradOrg)"
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="paid"
            name="Paid"
            stackId="1"
            stroke="#00d4ff"
            strokeWidth={2}
            fill="url(#gradPaid)"
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="referral"
            name="Referral"
            stackId="1"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#gradRef)"
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

/* ── Floating Action Button ── */
function FloatingActionButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="fab-container">
        <AnimatePresence>
          {open && FAB_ACTIONS.map((action, i) => {
            const rad = (action.angle * Math.PI) / 180
            const dist = 72
            const x = Math.cos(rad) * dist
            const y = Math.sin(rad) * dist
            return (
              <motion.button
                key={i}
                className="fab-action"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                animate={{ opacity: 1, x, y, scale: 1 }}
                exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 18,
                  delay: i * 0.05,
                }}
                title={action.label}
                onClick={() => setOpen(false)}
              >
                {action.icon}
                <span className="fab-tooltip">{action.label}</span>
              </motion.button>
            )
          })}
        </AnimatePresence>
        <motion.button
          className="fab-main"
          onClick={() => setOpen(!open)}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          aria-label="Quick actions"
        >
          ＋
        </motion.button>
      </div>
    </>
  )
}

/* ── Page Content Components for different nav items ── */
function DashboardPage({ stats, lineData, barData, categoryData, areaData, pulsing }) {
  return (
    <>
      <section className="stat-cards">
        {stats.map((stat, i) => (
          <StatCard key={stat.id} stat={stat} index={i} pulse={pulsing} />
        ))}
      </section>
      <section className="charts-grid">
        <LiveLineChart data={lineData} />
        <MonthlyBarChart data={barData} />
        <CategoryDonutChart data={categoryData} />
        <StackedArea data={areaData} />
      </section>
    </>
  )
}

function PlaceholderPage({ title }) {
  return (
    <motion.div
      className="placeholder-page"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
    >
      <div className="placeholder-page-inner">
        <span className="placeholder-page-icon">🚧</span>
        <h2>{title}</h2>
        <p>This page is under construction. Check back soon!</p>
      </div>
    </motion.div>
  )
}

/* ── Main App ── */
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')
  const [stats, setStats] = useState(generateStatData)
  const [lineData, setLineData] = useState(() => generateTimeSeriesData(30))
  const [barData, setBarData] = useState(generateMonthlyData)
  const [categoryData, setCategoryData] = useState(generateCategoryData)
  const [areaData] = useState(generateAreaData)
  const [pulsing, setPulsing] = useState(false)

  /* ── Live data refresh every 2 seconds ── */
  useEffect(() => {
    const interval = setInterval(() => {
      // Shift line chart data
      setLineData((prev) => shiftTimeSeriesData(prev))

      // Slightly tweak stat card values
      setStats((prev) =>
        prev.map((s) => ({
          ...s,
          value: s.id === 'conversion'
            ? +(s.value + rand(-0.15, 0.2)).toFixed(2)
            : Math.max(0, s.value + randInt(-Math.round(s.value * 0.02), Math.round(s.value * 0.025))),
          change: +(s.change + rand(-0.5, 0.5)).toFixed(1),
        }))
      )

      // Slightly tweak bar data
      setBarData((prev) =>
        prev.map((m) => ({
          ...m,
          thisYear: Math.max(1000, m.thisYear + randInt(-200, 250)),
        }))
      )

      // Slightly tweak category data
      setCategoryData((prev) =>
        prev.map((c) => ({
          ...c,
          value: Math.max(500, c.value + randInt(-100, 120)),
        }))
      )

      // Pulse effect
      setPulsing(true)
      setTimeout(() => setPulsing(false), 600)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  /* ── Close sidebar on mobile when navigating ── */
  const handleNav = useCallback((id) => {
    setActivePage(id)
    if (window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }, [])

  return (
    <div className={`dashboard ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

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
              onClick={() => handleNav(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
              {activePage === item.id && (
                <motion.span
                  className="nav-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">SB</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">Shree B.</span>
                <span className="sidebar-user-role">Admin</span>
              </div>
            </div>
          )}
        </div>
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            className="page-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activePage === 'dashboard' ? (
              <DashboardPage
                stats={stats}
                lineData={lineData}
                barData={barData}
                categoryData={categoryData}
                areaData={areaData}
                pulsing={pulsing}
              />
            ) : (
              <PlaceholderPage title={NAV_ITEMS.find((n) => n.id === activePage)?.label} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Floating Action Button ── */}
      <FloatingActionButton />
    </div>
  )
}

export default App
