import { useEffect, useState } from 'react'
import { STAGE_WORD } from '../logic/stateMachine.js'
import { audio } from '../audio/engine.js'
import { useStore } from '../state/store.js'
import './overlay.css'

// The only chrome: one word at a time, one hairline, a sound toggle, and a
// polite live region that narrates what the canvas shows.
export default function Overlay() {
  const phase = useStore((s) => s.phase)
  const hint = useStore((s) => s.hint)
  const progress = useStore((s) => s.progress)
  const announceText = useStore((s) => s.announce)
  const word = STAGE_WORD[phase] ?? ''
  const [muted, setMuted] = useState(() => audio.isMuted())
  const craft = phase === 'lacquer' || phase === 'gild' || phase === 'burnish'

  useEffect(() => {
    document.documentElement.dataset.phase = phase
  }, [phase])

  return (
    <div className="overlay" aria-hidden={false}>
      <div className="stage-word" data-empty={word ? undefined : ''}>
        <span key={word} className="stage-word__text">
          {word}
        </span>
        <span className="stage-word__rule" style={{ '--p': craft ? progress : 1 }} />
        {hint ? <span className="stage-word__hint">{hint}</span> : null}
      </div>
      <button
        className="corner-link"
        type="button"
        aria-pressed={!muted}
        onClick={() => {
          audio.unlock()
          const next = !muted
          audio.setMuted(next)
          setMuted(next)
        }}
      >
        {muted ? 'sound off' : 'sound on'}
      </button>
      <p className="visually-hidden" aria-live="polite" role="status">
        {announceText}
      </p>
    </div>
  )
}
