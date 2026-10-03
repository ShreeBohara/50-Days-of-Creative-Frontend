import { describe, expect, it } from 'vitest'
import { beginDrag, createBook, drag, openSpread, release, restAngle, spreadAlpha, STACK, step, turnTo } from './model.js'

const settle = (b, secs = 3) => {
  for (let t = 0; t < secs; t += 1 / 60) step(b, 1 / 60)
}

describe('book model', () => {
  it('starts shut, every leaf stacked on the right, the cover on top', () => {
    const b = createBook(11)
    expect(openSpread(b)).toBe(-1)
    for (let i = 1; i < 11; i++) expect(b.phi[i]).toBeLessThan(b.phi[i - 1])
    expect(b.phi[0]).toBeCloseTo(11 * STACK)
  })

  it('opening the cover opens spread 0 flat', () => {
    const b = createBook(11)
    expect(beginDrag(b, 0)).toBe(true)
    drag(b, 2.0)
    expect(release(b)).toBe(1)
    settle(b)
    expect(openSpread(b)).toBe(0)
    expect(spreadAlpha(b, 0)).toBeGreaterThan(Math.PI - 0.1)
    expect(spreadAlpha(b, 1)).toBeLessThan(0.02)
  })

  it('a leaf let go before the vertical falls back, a flick carries it over', () => {
    const b = createBook(5)
    turnTo(b, 0)
    settle(b)
    beginDrag(b, 1)
    drag(b, 1.2)
    expect(release(b, 0)).toBe(0)
    settle(b)
    expect(openSpread(b)).toBe(0)
    beginDrag(b, 1)
    drag(b, 1.0)
    expect(release(b, 6)).toBe(1)
    settle(b)
    expect(openSpread(b)).toBe(1)
  })

  it('only the top leaf of either stack can be grabbed', () => {
    const b = createBook(6)
    turnTo(b, 2)
    settle(b)
    expect(beginDrag(b, 1)).toBe(false)
    expect(beginDrag(b, 2)).toBe(true)
    release(b)
    expect(beginDrag(b, 3)).toBe(true)
  })

  it('a dragged leaf is clamped between the stacks', () => {
    const b = createBook(4)
    beginDrag(b, 0)
    drag(b, 9)
    expect(b.phi[0]).toBeCloseTo(restAngle(b, 0, 1))
    drag(b, -3)
    expect(b.phi[0]).toBeCloseTo(restAngle(b, 0, 0))
  })

  it('turning while a spread opens: one spread closes exactly as the next opens', () => {
    const b = createBook(6)
    turnTo(b, 1)
    settle(b)
    beginDrag(b, 2)
    for (const p of [0.3, 1.0, 1.9, 2.8]) {
      drag(b, p)
      // the leaf's two faces belong to spreads 1 and 2: their angles sum to ≈ π
      expect(spreadAlpha(b, 1) + spreadAlpha(b, 2)).toBeCloseTo(Math.PI, 1)
    }
  })

  it('riffles to a far spread, leaf by leaf, and settles', () => {
    const b = createBook(11)
    turnTo(b, 0)
    settle(b)
    expect(turnTo(b, 7)).toBe(true)
    settle(b, 4)
    expect(openSpread(b)).toBe(7)
    for (let i = 0; i < 11; i++) expect(b.phi[i]).toBeCloseTo(restAngle(b, i), 4)
    turnTo(b, -1)
    settle(b, 4)
    expect(openSpread(b)).toBe(-1)
  })

  it('springs never let a leaf pass through its stacks', () => {
    const b = createBook(3)
    beginDrag(b, 0)
    drag(b, 3)
    release(b, 40)
    for (let t = 0; t < 2; t += 1 / 120) {
      step(b, 1 / 120)
      expect(b.phi[0]).toBeLessThanOrEqual(Math.PI + 1e-9)
    }
  })
})
