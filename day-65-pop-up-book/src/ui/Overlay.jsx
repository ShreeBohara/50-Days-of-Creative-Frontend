// The chrome around the book: a running title, the folio navigator, the
// contents drawer, the bookplate card for a day, and quiet guidance. Paper
// labels in riso ink, so the interface reads as part of the same print run.

import { useEffect, useRef, useState } from 'react'
import { rt, store, useStore } from '../state/store.js'
import { SPREADS } from '../spreads/index.js'
import { CHAPTERS, folios } from '../spreads/chapters.js'
import { DAYS } from '../data/days.js'
import { audio } from '../audio/engine.js'
import './overlay.css'

const chapterOfDay = new Map(CHAPTERS.flatMap((c, i) => c.days.map((n) => [n, { ...c, spread: i + 1 }])))
const dayByN = new Map(DAYS.map((d) => [d.n, d]))
const pad = (n) => String(n).padStart(2, '0')

function spreadLabel(k) {
  if (k < 0) return { title: 'Sixty-Five', sub: 'shut · lift the cover' }
  const s = SPREADS[k]
  const [l, r] = folios(k)
  const ch = CHAPTERS.find((c) => c.id === s.id)
  return { title: ch ? `${ch.numeral} · ${ch.title}` : s.title, sub: k === 0 ? 'contents · title' : `pp. ${l}–${r}` }
}

function Folio() {
  const spread = useStore((s) => s.spread)
  const ready = useStore((s) => s.ready)
  const { title, sub } = spreadLabel(spread)
  const n = SPREADS.length
  return (
    <nav className="folio" aria-label="Pages">
      <button className="folio__turn" onClick={() => rt.ctl?.turn(-1)} disabled={spread < 0} aria-label="Previous spread">
        ‹
      </button>
      <div className="folio__mid">
        <div className="folio__title">{title}</div>
        <div className="folio__sub">{ready ? sub : 'printing…'}</div>
        <ol className="folio__ticks">
          {Array.from({ length: n }, (_, k) => (
            <li key={k}>
              <button
                className={k === spread ? 'is-on' : ''}
                onClick={() => rt.ctl?.goto(k)}
                aria-label={`Go to ${spreadLabel(k).title}`}
                aria-current={k === spread ? 'page' : undefined}
              />
            </li>
          ))}
        </ol>
      </div>
      <button className="folio__turn" onClick={() => rt.ctl?.turn(1)} disabled={spread >= n - 1} aria-label="Next spread">
        ›
      </button>
    </nav>
  )
}

function TopBar() {
  const muted = useStore((s) => s.muted)
  const xray = useStore((s) => s.xray)
  const contents = useStore((s) => s.contents)
  return (
    <header className="top">
      <div className="mark">
        <span className="mark__name">Sixty-Five</span>
        <span className="mark__sub">a pop-up book · day 65</span>
      </div>
      <div className="tools">
        <button className={`tag ${contents ? 'is-on' : ''}`} onClick={() => store.set({ contents: !contents })} aria-expanded={contents}>
          contents
        </button>
        <button className={`tag ${xray ? 'is-on' : ''}`} onClick={() => store.set({ xray: !xray })} aria-pressed={xray} title="Paper engineer's view (X)">
          x-ray
        </button>
        <button
          className={`tag ${muted ? '' : 'is-on'}`}
          onClick={() => {
            audio.unlock()
            audio.setMuted(!muted)
            store.set({ muted: !muted })
          }}
          aria-pressed={!muted}
        >
          {muted ? 'sound off' : 'sound on'}
        </button>
      </div>
    </header>
  )
}

function Contents() {
  const open = useStore((s) => s.contents)
  const spread = useStore((s) => s.spread)
  if (!open) return null
  const go = (k) => {
    rt.ctl?.goto(k)
    store.set({ contents: false })
  }
  return (
    <aside className="contents" aria-label="Contents">
      <button className="contents__row" onClick={() => go(0)} aria-current={spread === 0 ? 'page' : undefined}>
        <span className="contents__num">·</span>
        <span>Contents &amp; title</span>
      </button>
      {CHAPTERS.map((c, i) => (
        <div key={c.id} className="contents__ch">
          <button className="contents__row" onClick={() => go(i + 1)} aria-current={spread === i + 1 ? 'page' : undefined}>
            <span className="contents__num">{c.numeral}</span>
            <span>{c.title}</span>
          </button>
          <div className="contents__days">
            {c.days.map((n) => (
              <button
                key={n}
                onClick={() => {
                  go(i + 1)
                  store.set({ bookplate: n })
                }}
                title={dayByN.get(n)?.title}
              >
                {pad(n)}
              </button>
            ))}
          </div>
        </div>
      ))}
      {SPREADS.length > CHAPTERS.length + 1 ? (
        <button className="contents__row" onClick={() => go(SPREADS.length - 1)}>
          <span className="contents__num">66</span>
          <span>{SPREADS[SPREADS.length - 1].title}</span>
        </button>
      ) : null}
    </aside>
  )
}

function Bookplate() {
  const n = useStore((s) => s.bookplate)
  const link = useRef(null)
  const opener = useRef(null)
  useEffect(() => {
    if (!n) return
    // focus moves into the plate, and comes back where it was when it closes
    const prev = document.activeElement
    opener.current = prev && prev !== document.body ? prev : null
    link.current?.focus()
    return () => {
      const back = opener.current
      if (back && back.isConnected) back.focus()
      else document.querySelector('.tools .tag')?.focus()
    }
  }, [n])
  if (!n) return null
  const d = dayByN.get(n)
  const ch = chapterOfDay.get(n)
  if (!d) return null
  const close = () => store.set({ bookplate: null })
  return (
    <div className="plate-wrap" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <article className={`plate ink-${ch?.inks[0]}`} role="dialog" aria-modal="true" aria-labelledby="plate-title">
        <div className="plate__ex">ex libris · chapter {ch?.numeral}</div>
        <div className="plate__num">{pad(d.n)}</div>
        <h2 id="plate-title" className="plate__title">
          {d.title}
        </h2>
        <p className="plate__line">{d.line}</p>
        <ul className="plate__tech">
          {d.tech.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <p className="plate__meta">
          shipped {d.shipped} · {d.commits} commits
        </p>
        <div className="plate__actions">
          <a ref={link} className="plate__go" href={d.url} target="_blank" rel="noopener noreferrer">
            Open day {pad(d.n)} ↗
          </a>
          <button className="plate__close" onClick={close} aria-label="Close">
            close
          </button>
        </div>
      </article>
    </div>
  )
}

/** The paper engineer's readout, beside the x-ray lines. */
function XRayPanel() {
  const xray = useStore((s) => s.xray)
  const spread = useStore((s) => s.spread)
  const angle = useRef(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!xray) return
    let raf = 0
    const tick = () => {
      const sh = rt.view?.sheets[store.get().spread]
      if (angle.current && sh) angle.current.textContent = `${Math.round(((sh.alpha ?? 0) * 180) / Math.PI)}°`
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [xray])
  if (!xray || spread < 0) return null
  const sp = rt.view?.sheets[spread]?.spread
  if (!sp) return null
  const folds = sp.pieces.reduce((n, p) => n + p.lines.folds.length, 0)
  const download = () => {
    if (!rt.press || busy) return
    setBusy(true)
    rt.press
      .print({ kind: 'template', spread, res: 100 }, 0)
      .then((blob) => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `sixty-five-${String(spread).padStart(2, '0')}-${sp.id}-die-cut.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 4000)
      })
      .catch(() => store.set({ hint: 'the press couldn’t print that sheet on this device' }))
      .finally(() => setBusy(false))
  }
  return (
    <aside className="xray" aria-label="Paper engineer's view">
      <div className="xray__row">
        <span>opening</span>
        <b ref={angle}>—</b>
      </div>
      <div className="xray__row">
        <span>pieces</span>
        <b>{sp.pieces.length}</b>
      </div>
      <div className="xray__row">
        <span>folds</span>
        <b>{folds}</b>
      </div>
      <ul className="xray__key">
        <li className="k-valley">valley fold</li>
        <li className="k-mountain">mountain fold</li>
        <li className="k-glue">glue line</li>
        <li className="k-hinge">flap hinge</li>
      </ul>
      <button className="tag xray__dl" onClick={download} disabled={busy}>
        {busy ? 'printing…' : 'download die-cut sheet'}
      </button>
      <p className="xray__note">every piece is checked to fold flat — print it at 100 % on card and build it</p>
    </aside>
  )
}

const VERB = { flap: 'lift', wheel: 'spin', slider: 'pull' }
const label = (p) => p.label ?? p.id.replace(/([a-z])([A-Z0-9])/g, '$1 $2').toLowerCase()

/** The open spread's tabs, wheels and flaps as buttons: a keyboard (and a
 *  curious reader) can work every mechanism without finding it first. */
function TryRow() {
  const spread = useStore((s) => s.spread)
  const sp = spread >= 0 ? rt.view?.sheets[spread]?.spread : null
  const mechs = sp ? sp.pieces.filter((p) => VERB[p.kind]) : []
  if (!mechs.length) return null
  return (
    <div className="try" role="group" aria-label="Things to work on this spread">
      <span className="try__lead">try</span>
      {mechs.map((p) => (
        <button key={p.id} className="try__btn" onClick={() => rt.ctl?.operate(p.id)}>
          <b>{VERB[p.kind]}</b> {label(p)}
        </button>
      ))}
    </div>
  )
}

/** Pencil tools on the last page. */
function DrawTools() {
  const spread = useStore((s) => s.spread)
  const strokes = useStore((s) => s.strokes)
  if (spread !== SPREADS.length - 1 || !rt.view?.drawing) return null
  const d = rt.view.drawing
  const n = strokes || d.count
  return (
    <div className="draw-tools">
      <button
        className="tag"
        disabled={!n}
        onClick={() => {
          d.undo()
          store.set({ strokes: d.count })
        }}
      >
        undo
      </button>
      <button
        className="tag"
        disabled={!n}
        onClick={() => {
          d.clear()
          store.set({ strokes: 0 })
        }}
      >
        clear the card
      </button>
    </div>
  )
}

function Hint() {
  const spread = useStore((s) => s.spread)
  const ready = useStore((s) => s.ready)
  const hint = useStore((s) => s.hint)
  let text = hint
  if (!text) {
    if (!ready) text = 'the press is printing the first pages…'
    else if (spread < 0) text = 'lift the cover — drag it, tap it, or press →'
    else if (spread === 0) text = 'drag a page by its edge to turn it · tap a printed number to visit that day'
    else if (spread === SPREADS.length - 1) text = 'draw on the blank card — it stays in this browser'
  }
  return (
    <p className={`hint ${text ? 'is-on' : ''}`} aria-hidden="true">
      {text}
    </p>
  )
}

export default function Overlay() {
  const announce = useStore((s) => s.announce)
  const plate = useStore((s) => s.bookplate)
  // the engine remembers the reader's mute choice between visits
  useEffect(() => {
    store.set({ muted: audio.muted })
  }, [])
  return (
    <>
      {/* everything behind an open bookplate is out of reach (a modal) */}
      <div className="chrome" inert={plate ? true : undefined}>
        <TopBar />
        <Contents />
        <Folio />
        <Hint />
        <XRayPanel />
        <TryRow />
        <DrawTools />
      </div>
      <Bookplate />
      <div className="sr" aria-live="polite">
        {announce}
      </div>
    </>
  )
}
