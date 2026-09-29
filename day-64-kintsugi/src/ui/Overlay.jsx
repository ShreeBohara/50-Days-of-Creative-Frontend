import { useEffect, useState } from 'react'
import { STAGE_WORD } from '../logic/stateMachine.js'
import { audio } from '../audio/engine.js'
import { announce, beginAgain, rt, store, useStore } from '../state/store.js'
import { formatColophon } from '../logic/colophon.js'
import { shareUrl } from '../state/shelf.js'
import './overlay.css'

// The only chrome: one word at a time, one hairline, a sound toggle, and a
// polite live region that narrates what the canvas shows.

async function share(code) {
  const url = shareUrl(code)
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Kintsugi', text: 'A bowl I broke and mended in gold.', url })
      return
    }
    await navigator.clipboard.writeText(url)
    store.set({ hint: 'link copied' })
    announce('Share link copied.')
    setTimeout(() => store.get().hint === 'link copied' && store.set({ hint: null }), 3200)
  } catch (err) {
    if (err?.name === 'AbortError') return // the share sheet was dismissed
    // no share sheet, no clipboard: hand over the link to copy by hand
    store.set({ shareUrl: url })
    announce('Here is the share link to copy.')
  }
}
export default function Overlay() {
  const phase = useStore((s) => s.phase)
  const hint = useStore((s) => s.hint)
  const progress = useStore((s) => s.progress)
  const announceText = useStore((s) => s.announce)
  const kept = useStore((s) => s.keepRecord)
  const manualUrl = useStore((s) => s.shareUrl)
  const word = STAGE_WORD[phase] ?? ''
  const [muted, setMuted] = useState(() => audio.isMuted())
  const craft = phase === 'lacquer' || phase === 'gild' || phase === 'burnish'
  const mendable = phase === 'fitting' && hint === 'tap the word to mend the rest'
  const mendRest = () => {
    rt.fit?.mendTheRest()
    document.getElementById('stage')?.focus()
  }

  useEffect(() => {
    document.documentElement.dataset.phase = phase
  }, [phase])

  return (
    <div className="overlay" aria-hidden={false}>
      <div className="stage-word" data-empty={word ? undefined : ''}>
        {/* One element whatever the hint says (a swap would remount the word and
            replay its entrance); it only becomes a control when mending the
            rest is actually on offer. */}
        <span
          key={word}
          className={mendable ? 'stage-word__text stage-word__button' : 'stage-word__text'}
          role={mendable ? 'button' : undefined}
          tabIndex={mendable ? 0 : undefined}
          onClick={mendable ? mendRest : undefined}
          onKeyDown={
            mendable
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    mendRest()
                  }
                }
              : undefined
          }
        >
          {word}
        </span>
        <span className="stage-word__rule" style={{ '--p': craft ? progress : 1 }} />
        {/* a fixed slot: hints fade in and out and change text in place, so the
            word above never jumps (the lift readout changes every centimetre) */}
        <span className="stage-word__hint" data-on={hint ? '' : undefined} aria-hidden={hint ? undefined : true}>
          {hint ?? '\u00a0'}
        </span>
        {phase === 'keep' && kept ? (
          <div className="keep">
            <p className="keep__colophon">
              {formatColophon({ pieces: kept.pieces, goldMm: kept.goldMm, date: kept.date, hairline: kept.hairline })}
            </p>
            <div className="keep__links">
              <button type="button" className="keep__link" onClick={() => share(kept.code)}>
                share
              </button>
              <button
                type="button"
                className="keep__link"
                onClick={() => {
                  beginAgain()
                  document.getElementById('stage')?.focus()
                }}
              >
                begin again
              </button>
            </div>
            {manualUrl ? (
              <input
                className="keep__url"
                readOnly
                value={manualUrl}
                aria-label="share link"
                onFocus={(e) => e.target.select()}
              />
            ) : null}
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
          document.getElementById('stage')?.focus() // Space goes back to the bowl
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
