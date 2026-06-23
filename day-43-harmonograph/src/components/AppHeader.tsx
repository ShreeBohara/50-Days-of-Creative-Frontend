import { Activity } from 'lucide-react'

export default function AppHeader() {
  return (
    <header className="masthead">
      <div className="masthead__mark" aria-hidden="true">
        <Activity size={20} strokeWidth={1.6} />
      </div>
      <div className="masthead__id">
        <h1 className="masthead__brand">PENDULA</h1>
        <p className="masthead__tag">Harmonograph Studio</p>
      </div>
      <div className="masthead__meta">
        <span className="masthead__chip">Day 43</span>
        <span className="masthead__rule" aria-hidden="true" />
        <span className="masthead__note">damped-sine drawing machine</span>
      </div>
    </header>
  )
}
