import { Dices, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import { useStudioStore } from '../store/useStudioStore'
import IconButton from './IconButton'

export default function AppHeader() {
  const randomize = useStudioStore((s) => s.randomize)
  const reset = useStudioStore((s) => s.reset)
  const undo = useStudioStore((s) => s.undo)
  const redo = useStudioStore((s) => s.redo)
  const canUndo = useStudioStore((s) => s.past.length > 0)
  const canRedo = useStudioStore((s) => s.future.length > 0)

  return (
    <header className="studio__head">
      <div className="studio__brand">
        <span className="eyebrow">50 Days of Creative Frontend · Day 44</span>
        <h1 className="studio__title">MERIDIAN</h1>
        <p className="studio__tag">Procedural Cartographer</p>
      </div>

      <div className="studio__tools">
        <div className="tool-group">
          <IconButton label="Undo" onClick={undo} disabled={!canUndo}>
            <Undo2 size={17} strokeWidth={1.7} aria-hidden="true" />
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={!canRedo}>
            <Redo2 size={17} strokeWidth={1.7} aria-hidden="true" />
          </IconButton>
          <IconButton label="Reset to default world" onClick={reset}>
            <RotateCcw size={17} strokeWidth={1.7} aria-hidden="true" />
          </IconButton>
        </div>
        <button type="button" className="btn-primary" onClick={randomize}>
          <Dices size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>New world</span>
        </button>
      </div>
    </header>
  )
}
