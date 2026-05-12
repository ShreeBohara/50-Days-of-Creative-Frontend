import { useParams } from 'react-router-dom'

export default function ProjectDetail() {
  const { id } = useParams()
  return (
    <div className="page">
      <div className="container" style={{ paddingTop: '8rem' }}>
        <h1 className="text-display">Project: {id}</h1>
        <p className="text-body" style={{ marginTop: '1rem' }}>Coming in commit 4</p>
      </div>
    </div>
  )
}
