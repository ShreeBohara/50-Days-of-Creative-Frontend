export const PROJECT_VERSION = 1

export function serializeProject({ elements, viewport }) {
  return JSON.stringify({
    version: PROJECT_VERSION,
    elements,
    viewport,
    exportedAt: new Date().toISOString(),
  }, null, 2)
}

export function parseProject(text) {
  let payload

  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }

  if (payload?.version !== PROJECT_VERSION) {
    throw new Error('This whiteboard file version is not supported.')
  }

  if (!Array.isArray(payload.elements)) {
    throw new Error('Whiteboard file is missing an elements array.')
  }

  const viewport = payload.viewport ?? { x: 0, y: 0, scale: 1 }

  if (
    typeof viewport.x !== 'number'
    || typeof viewport.y !== 'number'
    || typeof viewport.scale !== 'number'
  ) {
    throw new Error('Whiteboard file has an invalid viewport.')
  }

  return {
    elements: payload.elements,
    viewport,
  }
}

export function downloadTextFile(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
