import { describe, it, expect } from 'vitest'
import { score, isBoundary, matchCommand, rankCommands } from './fuzzy.js'

describe('score', () => {
  it('returns null when the query is not a subsequence', () => {
    expect(score('xyz', 'Command Palette')).toBeNull()
    expect(score('cmdz', 'Command')).toBeNull() // runs out of matches
  })

  it('treats an empty query as a neutral match', () => {
    expect(score('', 'Anything')).toEqual({ score: 0, indices: [] })
    expect(score('   ', 'Anything')).toEqual({ score: 0, indices: [] })
  })

  it('matches case-insensitively and reports original indices', () => {
    expect(score('com', 'Command Palette').indices).toEqual([0, 1, 2])
    expect(score('COM', 'Command Palette').indices).toEqual([0, 1, 2])
  })

  it('finds a subsequence across word boundaries', () => {
    // "ps" -> P(0) of "Pricing", s(8) start of "Sheet"
    expect(score('ps', 'Pricing Sheet').indices).toEqual([0, 8])
  })

  it('ranks a tight prefix match above a scattered one', () => {
    const tight = score('command', 'Command Palette').score
    const scattered = score('command', 'Contoso Command').score
    expect(tight).toBeGreaterThan(scattered)
  })

  it('rewards word-boundary matches over mid-word matches', () => {
    // "ct" hitting the C/T word-starts of "Create Task" beats the buried match.
    const boundary = score('ct', 'Create Task').score
    const buried = score('ct', 'Select item').score
    expect(boundary).toBeGreaterThan(buried)
  })

  it('gives a consecutive run more than the same chars split by a gap', () => {
    const consecutive = score('set', 'Settings').score
    const gapped = score('set', 'Secure telemetry').score
    expect(consecutive).toBeGreaterThan(gapped)
  })
})

describe('isBoundary', () => {
  it('flags string start, post-separator, and camelCase humps', () => {
    expect(isBoundary('Overview', 0)).toBe(true)
    expect(isBoundary('Design System', 7)).toBe(true) // after the space
    expect(isBoundary('darkMode', 4)).toBe(true) // the "M" hump
    expect(isBoundary('Overview', 3)).toBe(false) // mid-word "r"
  })
})

describe('matchCommand', () => {
  it('scores the label and returns its highlight indices', () => {
    const m = matchCommand({ label: 'Change theme' }, 'theme')
    expect(m).not.toBeNull()
    expect(m.indices).toEqual([7, 8, 9, 10, 11]) // "theme" in "Change theme"
  })

  it('falls back to keywords with no highlight, ranked below a label match', () => {
    const kwOnly = matchCommand({ label: 'Toggle sidebar', keywords: 'hide nav' }, 'nav')
    expect(kwOnly.indices).toEqual([]) // matched via keywords, so nothing to highlight
    const labelMatch = matchCommand({ label: 'Navigation' }, 'nav')
    expect(labelMatch.score).toBeGreaterThan(kwOnly.score)
  })

  it('returns null when neither label nor keywords match', () => {
    expect(matchCommand({ label: 'Toggle sidebar', keywords: 'hide nav' }, 'zzz')).toBeNull()
  })
})

describe('rankCommands', () => {
  const items = [
    { id: 'a', label: 'Toggle sidebar', keywords: 'hide show' },
    { id: 'b', label: 'Change theme', keywords: 'appearance' },
    { id: 'c', label: 'Create document', keywords: 'new' },
  ]

  it('keeps only matches and sorts by descending score', () => {
    const out = rankCommands(items, 'the')
    expect(out.map((r) => r.item.id)).toEqual(['b']) // only "Change theme" contains t-h-e
  })

  it('passes everything through, order preserved, for an empty query', () => {
    const out = rankCommands(items, '')
    expect(out.map((r) => r.item.id)).toEqual(['a', 'b', 'c'])
    expect(out.every((r) => r.score === 0)).toBe(true)
  })

  it('attaches label highlight indices to each result', () => {
    const out = rankCommands(items, 'cd')
    expect(out[0].item.id).toBe('c') // "Create document" -> C(0), d(7)
    expect(out[0].indices.length).toBe(2)
  })
})
