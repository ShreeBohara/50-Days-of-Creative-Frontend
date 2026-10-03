import { describe, expect, it } from 'vitest'
import { SPREADS } from './index.js'
import { CHAPTERS, chapterSpread } from './chapters.js'
import { compileSpread } from '../paper/spread.js'
import { checkSpread } from '../paper/validate.js'
import { printSpread } from '../art/printSpread.js'
import { DAYS } from '../data/days.js'
import { H, W } from '../paper/dims.js'
import lab from '../paper/fixtures/lab.js'

const compiled = SPREADS.map((s) => compileSpread(s))

describe('the book', () => {
  it('has unique spread ids and the chapters in order after the opening', () => {
    expect(new Set(SPREADS.map((s) => s.id)).size).toBe(SPREADS.length)
    CHAPTERS.forEach((c, i) => expect(SPREADS[chapterSpread(i)].id).toBe(c.id))
  })

  it('every one of the 64 days lives in exactly one chapter', () => {
    const all = CHAPTERS.flatMap((c) => c.days).sort((a, b) => a - b)
    expect(all).toEqual(DAYS.map((d) => d.n))
  })

  it("every chapter prints each of its days as a tappable spot, on its own pages", () => {
    CHAPTERS.forEach((c, i) => {
      const s = SPREADS[chapterSpread(i)]
      const spotted = new Set((s.spots ?? []).filter((p) => p.day).map((p) => p.day))
      for (const n of c.days) expect(spotted.has(n), `${c.id} is missing a spot for day ${n}`).toBe(true)
    })
  })

  it('spots sit on a page and point at a real day or spread', () => {
    for (const s of SPREADS) {
      for (const p of s.spots ?? []) {
        expect(['page:L', 'page:R']).toContain(p.on)
        const [x, y, w, h] = p.rect
        expect(x >= -0.2 && y >= -0.2 && x + w <= W + 0.2 && y + h <= H + 0.2, `${s.id} spot ${JSON.stringify(p)}`).toBe(true)
        if (p.day) expect(DAYS.some((d) => d.n === p.day)).toBe(true)
        else expect(p.goto >= 0 && p.goto < SPREADS.length + 1).toBe(true)
      }
      for (const p of s.pieces ?? []) if (p.day) expect(DAYS.some((d) => d.n === p.day)).toBe(true)
    }
  })
})

describe.each(compiled.map((s) => [s.id, s]))('spread %s', (_id, spread) => {
  it('is physically buildable', () => {
    const { problems } = checkSpread(spread)
    expect(problems).toEqual([])
  })

  it('prints every surface', () => {
    const out = printSpread(spread, { res: 6 })
    expect(out.pages.L.width).toBeGreaterThan(0)
    expect(out.cards.size).toBe(spread.pieces.length)
  })
})

describe('mechanism bench', () => {
  it('boxes, tents, flaps with pop-ups, wheels and pull-tabs all pass', () => {
    expect(checkSpread(compileSpread(lab)).problems).toEqual([])
  })
})
