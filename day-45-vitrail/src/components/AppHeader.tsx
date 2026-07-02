import { Redo2, RotateCcw, Sparkles, Undo2 } from 'lucide-react'
import { useStudioStore } from '../store/useStudioStore'
import IconButton from './IconButton'

export default function AppHeader() {
  const randomize = useStudioStore((s) => s.randomize)
  const mutateCurrent = useStudioStore((s) => s.mutateCurrent)
  const reset = useStudioStore((s) => s.reset)
  const undo = useStudioStore((s) => s.undo)
  const redo = useStudioStore((s) => s.redo)
  const canUndo = useStudioStore((s) => s.past.length > 0)
  const canRedo = useStudioStore((s) => s.future.length > 0)

  return (
    <header className="studio__header">
      <div className="studio__brand">
        <span className="studio__day">50 Days of Creative Frontend · Day 45</span>
        <h1 className="studio__wordmark">VITRAIL</h1>
        <p className="studio__tagline">Procedural stained glass, grown from a seed</p>
      </div>

      <div className="studio__tools">
        <div className="tool-group" role="group" aria-label="History">
          <IconButton label="Undo" onClick={undo} disabled={!canUndo}>
            <Undo2 size={17} strokeWidth={1.7} aria-hidden="true" />
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!canRedo}>
            <Redo2 size={17} strokeWidth={1.7} aria-hidden="true" />
          </IconButton>
          <IconButton label="Reset to the default window" onClick={reset}>
            <RotateCcw size={17} strokeWidth={1.7} aria-hidden="true" />
          </IconButton>
        </div>
        <button type="button" className="btn-ghost" onClick={() => mutateCurrent()}>
          Mutate
        </button>
        <button type="button" className="btn-primary" onClick={randomize}>
          <Sparkles size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>New window</span>
        </button>
      </div>
    </header>
  )
}
