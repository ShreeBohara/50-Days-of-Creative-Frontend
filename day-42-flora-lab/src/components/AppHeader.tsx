import { RotateCcw, RotateCw } from 'lucide-react'

interface AppHeaderProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

export function AppHeader({ canUndo, canRedo, onUndo, onRedo }: AppHeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="./" aria-label="FLORA LAB home">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="brand-wordmark">FLORA LAB</span>
      </a>

      <p className="header-description">
        A botanical genetics studio for impossible plants.
      </p>

      <div className="header-tools">
        <div className="history-tools" aria-label="History controls">
          <button className="icon-button" type="button" aria-label="Undo" disabled={!canUndo} onClick={onUndo}>
            <RotateCcw aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Redo" disabled={!canRedo} onClick={onRedo}>
            <RotateCw aria-hidden="true" />
          </button>
        </div>
        <span className="day-counter">DAY 42 / 50</span>
      </div>
    </header>
  )
}
