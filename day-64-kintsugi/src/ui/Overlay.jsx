import { useEffect, useState } from 'react'
import { STAGE_WORD } from '../logic/stateMachine.js'
import { audio } from '../audio/engine.js'
import { beginAgain, rt, store, useStore } from '../state/store.js'
import { formatColophon } from '../logic/colophon.js'
import { shareUrl } from '../state/shelf.js'
import './overlay.css'

// The only chrome: one word at a time, one hairline, a sound toggle, and a
// polite live region that narrates what the canvas shows.

async function share(code) {
  const url = shareUrl(code)
  let said = 'link copied'
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Kintsugi', text: 'A bowl I broke and mended in gold.', url })
      said = null
    } else {
      await navigator.clipboard.writeText(url)
    }
  } catch {
    said = url // clipboard blocked: show the link itself
  }
  if (said) {
    store.set({ hint: said })
    setTimeout(() => store.get().hint === said && store.set({ hint: null }), 3200)
  }
}
export default function Overlay() {
  const phase = useStore((s) => s.phase)
  const hint = useStore((s) => s.hint)
  const progress = useStore((s) => s.progress)
  const announceText = useStore((s) => s.announce)
  const kept = useStore((s) => s.keepRecord)
  const word = STAGE_WORD[phase] ?? ''
  const [muted, setMuted] = useState(() => audio.isMuted())
  const craft = phase === 'lacquer' || phase === 'gild' || phase === 'burnish'

  useEffect(() => {
    document.documentElement.dataset.phase = phase
  }, [phase])

  return (
    <div className="overlay" aria-hidden={false}>
      <div className="stage-word" data-empty={word ? undefined : ''}>
        {phase === 'fitting' && hint ? (
          <button key={word} type="button" className="stage-word__text stage-word__button" onClick={() => rt.fit?.autoFitNext()}>
            {word}
          </button>
        ) : (
          <span key={word} className="stage-word__text">
            {word}
          </span>
        )}
        <span className="stage-word__rule" style={{ '--p': craft ? progress : 1 }} />
        {hint ? <span className="stage-word__hint">{hint}</span> : null}
        {phase === 'keep' && kept ? (
          <div className="keep">
            <p className="keep__colophon">
              {formatColophon({ pieces: kept.pieces, goldMm: kept.goldMm, date: kept.date, hairline: kept.hairline })}
            </p>
            <div className="keep__links">
              <button type="button" className="keep__link" onClick={() => share(kept.code)}>
                share
              </button>
              <button type="button" className="keep__link" onClick={() => beginAgain()}>
                begin again
              </button>
            </div>
          </div>
        ) : null}
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
