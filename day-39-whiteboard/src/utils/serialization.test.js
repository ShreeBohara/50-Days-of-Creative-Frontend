import { describe, expect, it } from 'vitest'
import { DEFAULT_STYLE } from '../data/whiteboardConfig'
import { createShapeElement } from './elements'
import { parseProject, serializeProject } from './serialization'

describe('project serialization', () => {
  it('serializes and parses version 1 whiteboard files', () => {
    const element = createShapeElement('rectangle', { x: 0, y: 0 }, { x: 10, y: 20 }, DEFAULT_STYLE, 1)
    const viewport = { x: 10, y: 20, scale: 1.5 }
    const parsed = parseProject(serializeProject({ elements: [element], viewport }))

    expect(parsed.elements).toHaveLength(1)
    expect(parsed.viewport).toEqual(viewport)
  })

  it('rejects invalid JSON and unsupported versions', () => {
    expect(() => parseProject('{nope')).toThrow('valid JSON')
    expect(() => parseProject(JSON.stringify({ version: 99, elements: [] }))).toThrow('not supported')
  })
})
