import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DAYS, SERIES } from './days.js'

const REPO = new URL('../../../', import.meta.url)
const BASE = 'https://shreebohara.github.io/50-Days-of-Creative-Frontend/'
const TECH = new Set([
  'Vanilla JS', 'React', 'Three.js', 'R3F', 'GLSL', 'WebGL', 'Canvas', 'SVG', 'CSS',
  'GSAP', 'Web Audio', 'D3', 'Matter.js', 'Tone.js', 'Motion', 'Rapier', 'Blender', 'Vite',
])

describe('DAYS', () => {
  it('holds 64 days numbered 1..64 in order', () => {
    expect(DAYS).toHaveLength(64)
    DAYS.forEach((d, i) => expect(d.n).toBe(i + 1))
  })

  it('has unique, well-formed slugs that carry their own day number', () => {
    expect(new Set(DAYS.map((d) => d.slug)).size).toBe(64)
    for (const d of DAYS) {
      expect(d.slug).toMatch(/^day-\d\d-[a-z0-9-]+$/)
      expect(d.slug.slice(4, 6)).toBe(String(d.n).padStart(2, '0'))
    }
  })

  it('points every slug at a real folder in the repo', () => {
    for (const d of DAYS) {
      expect(existsSync(fileURLToPath(new URL(`${d.slug}/`, REPO))), d.slug).toBe(true)
    }
  })

  it('keeps short names short enough to typeset', () => {
    for (const d of DAYS) {
      expect(d.title.length, d.slug).toBeGreaterThan(0)
      expect(d.short.length, d.slug).toBeGreaterThan(0)
      expect(d.short.length, d.slug).toBeLessThanOrEqual(18)
    }
  })

  it('gives each day one sentence of 60..115 characters', () => {
    for (const d of DAYS) {
      expect(d.line.length, d.slug).toBeGreaterThanOrEqual(60)
      expect(d.line.length, d.slug).toBeLessThanOrEqual(115)
      expect(d.line.endsWith('.'), d.slug).toBe(true)
    }
  })

  it('tags each day with 2..4 known tech tags', () => {
    for (const d of DAYS) {
      expect(d.tech.length, d.slug).toBeGreaterThanOrEqual(2)
      expect(d.tech.length, d.slug).toBeLessThanOrEqual(4)
      expect(new Set(d.tech).size, d.slug).toBe(d.tech.length)
      for (const t of d.tech) expect(TECH.has(t), `${d.slug}: ${t}`).toBe(true)
    }
  })

  it('links each day to its live page', () => {
    for (const d of DAYS) expect(d.url).toBe(`${BASE}${d.slug}/`)
  })

  it('records commits and a shipped date for each day', () => {
    for (const d of DAYS) {
      expect(d.commits, d.slug).toBeGreaterThan(0)
      expect(d.shipped, d.slug).toMatch(/^\d{4}-\d\d-\d\d$/)
    }
  })
})

describe('SERIES', () => {
  it('sums the days', () => {
    const shipped = DAYS.map((d) => d.shipped).sort()
    expect(SERIES.days).toBe(64)
    expect(SERIES.commits).toBe(DAYS.reduce((sum, d) => sum + d.commits, 0))
    expect(SERIES.firstShipped).toBe(shipped[0])
    expect(SERIES.lastShipped).toBe(shipped.at(-1))
  })
})
