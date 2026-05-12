import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '8rem' }}>
        <h1 className="text-display">Home</h1>
        <p className="text-body" style={{ marginTop: '1rem' }}>Coming in commit 2</p>
        <Link to="/work" style={{ color: 'var(--color-accent)', marginTop: '1rem', display: 'inline-block' }}>
          View Work →
        </Link>
      </div>
    </div>
  )
}
