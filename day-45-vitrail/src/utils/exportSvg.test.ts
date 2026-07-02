import { describe, expect, it } from 'vitest'
import { composeWindow } from '../domain/compose'
import { clampGenome, defaultGenome } from '../domain/genome'
import { buildSvgMarkup, exportFilename } from './exportSvg'

describe('exportSvg', () => {
  it('emits a standalone document with every pane', () => {
    const spec = composeWindow(defaultGenome())
    const svg = buildSvgMarkup(spec)
    expect(svg.startsWith('<svg xmlns=')).toBe(true)
    expect(svg).toContain(`viewBox="0 0 ${spec.frame.width} ${spec.frame.height}"`)
    // panes + lead paths + backdrop outline
    const pathCount = (svg.match(/<path /g) ?? []).length
    expect(pathCount).toBe(spec.panes.length + spec.leadPaths.length + 1)
    expect(svg).toContain(spec.title)
  })

  it('escapes XML-hostile seeds in the title', () => {
    const spec = composeWindow(clampGenome({ ...defaultGenome(), seed: 'a<b>&"c' }))
    const svg = buildSvgMarkup(spec)
    expect(svg).toContain('a&lt;b&gt;&amp;&quot;c')
    expect(svg).not.toContain('seed “a<b>')
  })

  it('builds safe filenames from seeds', () => {
    const spec = composeWindow(clampGenome({ ...defaultGenome(), seed: 'Rose / Noon!!' }))
    expect(exportFilename(spec, 'svg')).toBe('vitrail-rose-noon.svg')
    expect(exportFilename(composeWindow(clampGenome({ ...defaultGenome(), seed: '!!!' })), 'png')).toBe(
      'vitrail-window.png',
    )
  })
})
