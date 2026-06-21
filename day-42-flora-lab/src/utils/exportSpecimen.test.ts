import { describe, expect, it } from 'vitest'
import { decodeGenome } from '../domain/genome'
import { DEFAULT_GENOME } from '../domain/genome'
import { buildShareUrl, serializeArtwork } from './exportSpecimen'

describe('specimen exports', () => {
  it('serializes a self-contained SVG with DNA metadata and paper background', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 800 1000')
    svg.innerHTML = '<path d="M 0 0 L 10 10" stroke="#000" />'
    const markup = serializeArtwork(svg, DEFAULT_GENOME)

    expect(markup).toContain('<metadata>')
    expect(markup).toContain('FLORA LAB / Day 42')
    expect(markup).toContain('fill="#fbf7ef"')
    expect(markup).toContain('width="800"')
    expect(markup).toContain('height="1000"')
  })

  it('builds a reproducible share URL without retaining old query data', () => {
    const share = new URL(buildShareUrl(DEFAULT_GENOME, 'https://example.com/lab/?old=value#section'))
    expect(share.searchParams.has('old')).toBe(false)
    expect(share.hash).toBe('')
    expect(decodeGenome(share.searchParams.get('dna')!)).toEqual(DEFAULT_GENOME)
  })
})
