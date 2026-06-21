import { Dna, FlaskConical } from 'lucide-react'
import { AppHeader } from './components/AppHeader'
import { SpecimenStage } from './components/SpecimenStage'
import { DEFAULT_GENOME } from './domain/genome'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#specimen-stage">Skip to specimen</a>
      <AppHeader />

      <main className="lab-grid">
        <aside className="lab-rail trait-rail" aria-label="Plant traits">
          <div className="rail-heading">
            <span className="section-index">01</span>
            <div>
              <h2>Trait register</h2>
              <p>Shape the living system.</p>
            </div>
          </div>
          <div className="empty-rail">
            <Dna aria-hidden="true" />
            <p>The genome controls will grow here.</p>
          </div>
        </aside>

        <SpecimenStage genome={DEFAULT_GENOME} />

        <aside className="lab-rail collection-rail" aria-label="Specimen collection">
          <div className="rail-heading">
            <span className="section-index">02</span>
            <div>
              <h2>Field archive</h2>
              <p>Save, compare, cultivate.</p>
            </div>
          </div>
          <div className="empty-rail">
            <FlaskConical aria-hidden="true" />
            <p>Saved specimens and breeding tools will live here.</p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
