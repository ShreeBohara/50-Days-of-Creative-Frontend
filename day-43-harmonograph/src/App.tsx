import AppHeader from './components/AppHeader'
import './App.css'

export default function App() {
  return (
    <div className="studio">
      <AppHeader />

      <div className="studio__body">
        <section className="stage-col" aria-label="Plotting stage">
          <div className="stage-frame">
            <div className="stage-frame__corner stage-frame__corner--tl" />
            <div className="stage-frame__corner stage-frame__corner--tr" />
            <div className="stage-frame__corner stage-frame__corner--bl" />
            <div className="stage-frame__corner stage-frame__corner--br" />
            <div className="stage-placeholder">
              <span className="eyebrow">plotting bed</span>
            </div>
          </div>
        </section>

        <aside className="panel-col" aria-label="Controls">
          <div className="panel">
            <span className="eyebrow">controls</span>
          </div>
        </aside>
      </div>

      <footer className="studio__foot">
        <span>PENDULA</span>
        <span className="studio__foot-dot" aria-hidden="true">·</span>
        <span>50 Days of Creative Frontend</span>
      </footer>
    </div>
  )
}
