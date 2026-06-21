import { AppHeader } from './components/AppHeader'
import { CollectionPanel } from './components/CollectionPanel'
import { CultivationTools } from './components/CultivationTools'
import { SpecimenStage } from './components/SpecimenStage'
import { TraitPanel } from './components/TraitPanel'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useFloraStore } from './store/useFloraStore'
import './App.css'

function App() {
  const genome = useFloraStore((state) => state.genome)
  const canUndo = useFloraStore((state) => state.past.length > 0)
  const canRedo = useFloraStore((state) => state.future.length > 0)
  const undo = useFloraStore((state) => state.undo)
  const redo = useFloraStore((state) => state.redo)
  const announcement = useFloraStore((state) => state.announcement)
  useKeyboardShortcuts()

  return (
    <div className="app-shell">
      <a className="skip-link" href="#specimen-stage">Skip to specimen</a>
      <AppHeader canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />

      <main className="lab-grid">
        <aside className="lab-rail trait-rail" aria-label="Plant traits">
          <div className="rail-heading">
            <span className="section-index">01</span>
            <div>
              <h2>Trait register</h2>
              <p>Shape the living system.</p>
            </div>
          </div>
          <CultivationTools />
          <TraitPanel />
        </aside>

        <SpecimenStage genome={genome} />

        <aside className="lab-rail collection-rail" aria-label="Specimen collection">
          <div className="rail-heading">
            <span className="section-index">02</span>
            <div>
              <h2>Field archive</h2>
              <p>Save, compare, cultivate.</p>
            </div>
          </div>
          <CollectionPanel />
        </aside>
      </main>
      <div className="sr-live" aria-live="polite" aria-atomic="true">{announcement}</div>
    </div>
  )
}

export default App
