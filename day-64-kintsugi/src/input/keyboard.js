// The whole ritual without a pointer. One listener routes keys to whichever
// controller owns the current phase; screen-reader users hear each step
// through the live region.
//
//   veiled   Enter / Space  pull the cloth off
//   intact   Space / Enter  lift · arrows move · W/S or PgUp/PgDn height
//            Q / E twist · Space again lets go (low sets down, high breaks)
//            T  ring the rim
//   fitting  M  fit the next piece · Q / E turn the bowl
//   lacquer  B  brush   gild  J  jar   burnish  A  agate
//            hold Space to work · Q / E turn the bowl
//   keep     F  turn it over · S share · R begin again
//   any      L  loupe (hold)

import { audio } from '../audio/engine.js'
import { beginAgain, rt, store } from '../state/store.js'

const STEP = 0.01

export function bindKeyboard() {
  let space = false
  let raf = 0
  let last = 0
  const loop = (t) => {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60
    last = t
    if (space) rt.craft?.keyApply(dt)
    raf = space ? requestAnimationFrame(loop) : 0
  }
  const turn = (d) => {
    if (rt.fit?.riding) rt.fit.yawTarget += d
  }

  const down = (e) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, a, input, textarea')) return
    if (e.metaKey || e.ctrlKey) return
    const phase = store.get().phase
    const k = e.key
    const hold = rt.bowl?.hold
    let used = true
    if (phase === 'intact' || phase === 'held') {
      if ((k === ' ' || k === 'Enter') && hold) {
        if (!hold.keyRelease()) hold.keyLift()
      } else if (k === 'ArrowLeft') hold?.keyMove(-STEP, 0, 0)
      else if (k === 'ArrowRight') hold?.keyMove(STEP, 0, 0)
      else if (k === 'ArrowUp') hold?.keyMove(0, 0, -STEP)
      else if (k === 'ArrowDown') hold?.keyMove(0, 0, STEP)
      else if (k === 'w' || k === 'W' || k === 'PageUp') hold?.keyMove(0, STEP * 2, 0)
      else if (k === 's' || k === 'S' || k === 'PageDown') hold?.keyMove(0, -STEP * 2, 0)
      else if (k === 'q' || k === 'Q') hold?.keyTwist(-0.25)
      else if (k === 'e' || k === 'E') hold?.keyTwist(0.25)
      else if (k === 't' || k === 'T') hold?.keyRing()
      else used = false
    } else if (phase === 'fitting' || phase === 'lacquer' || phase === 'gild' || phase === 'burnish') {
      if (k === 'q' || k === 'Q') turn(-0.35)
      else if (k === 'e' || k === 'E') turn(0.35)
      else if (k === 'b' || k === 'B') rt.craft?.pickTool('brush')
      else if (k === 'j' || k === 'J') rt.craft?.pickTool('jar')
      else if (k === 'a' || k === 'A') rt.craft?.pickTool('burnisher')
      else if (k === ' ' && rt.craft?.tool) {
        if (!space) {
          space = true
          if (rt.craft.tool === 'brush') audio.brushStart()
          if (rt.craft.tool === 'burnisher') audio.burnishStart()
          if (!raf) raf = requestAnimationFrame(loop)
        }
      } else used = false
    } else if (phase === 'keep') {
      if (k === 's' || k === 'S') document.querySelector('.keep__link')?.click()
      else if (k === 'r' || k === 'R') beginAgain()
      else if (k === 'q' || k === 'Q') turn(-0.35)
      else if (k === 'e' || k === 'E') turn(0.35)
      else used = false
    } else used = false
    if (k === 'l' || k === 'L') {
      if (rt.loupe) {
        const r = document.querySelector('canvas')?.getBoundingClientRect()
        if (r) {
          rt.loupe.x = r.width / 2
          rt.loupe.y = r.height * 0.45
        }
        rt.loupe.active = e.type === 'keydown'
      }
      used = true
    }
    if (used) e.preventDefault()
  }
  const up = (e) => {
    if (e.key === ' ' && space) {
      space = false
      audio.brushStop()
      audio.burnishStop()
    }
    if ((e.key === 'l' || e.key === 'L') && rt.loupe) rt.loupe.active = false
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    cancelAnimationFrame(raf)
  }
}
