export const CELL = {
  EMPTY: 0,
  WALL: 1,
  WEIGHT: 2,
}

export const GRID_PRESETS = [
  { label: 'Compact 30 × 15', cols: 30, rows: 15 },
  { label: 'Standard 50 × 25', cols: 50, rows: 25 },
  { label: 'Dense 70 × 35', cols: 70, rows: 35 },
]

export function cellKey(x, y) {
  return `${x}:${y}`
}

export function cellIndex(x, y, cols) {
  return (y * cols) + x
}

export function createTerrain(cols = 50, rows = 25) {
  return {
    cols,
    rows,
    cells: Array(cols * rows).fill(CELL.EMPTY),
    start: { x: Math.max(2, Math.floor(cols * 0.18)), y: Math.floor(rows / 2) },
    end: { x: Math.min(cols - 3, Math.floor(cols * 0.82)), y: Math.floor(rows / 2) },
  }
}

export function isEndpoint(terrain, x, y) {
  return (
    (terrain.start.x === x && terrain.start.y === y) ||
    (terrain.end.x === x && terrain.end.y === y)
  )
}

export function applyTool(terrain, x, y, tool) {
  if (x < 0 || y < 0 || x >= terrain.cols || y >= terrain.rows) {
    return terrain
  }

  if (tool === 'start' || tool === 'end') {
    const other = tool === 'start' ? terrain.end : terrain.start
    if (other.x === x && other.y === y) {
      return terrain
    }
    const cells = [...terrain.cells]
    cells[cellIndex(x, y, terrain.cols)] = CELL.EMPTY
    return { ...terrain, cells, [tool]: { x, y } }
  }

  if (isEndpoint(terrain, x, y)) {
    return terrain
  }

  const nextType = tool === 'wall'
    ? CELL.WALL
    : tool === 'weight'
      ? CELL.WEIGHT
      : CELL.EMPTY
  const index = cellIndex(x, y, terrain.cols)
  if (terrain.cells[index] === nextType) {
    return terrain
  }
  const cells = [...terrain.cells]
  cells[index] = nextType
  return { ...terrain, cells }
}

export function interpolateCells(from, to) {
  const cells = []
  let x = from.x
  let y = from.y
  const deltaX = Math.abs(to.x - from.x)
  const deltaY = Math.abs(to.y - from.y)
  const stepX = from.x < to.x ? 1 : -1
  const stepY = from.y < to.y ? 1 : -1
  let error = deltaX - deltaY

  while (true) {
    cells.push({ x, y })
    if (x === to.x && y === to.y) break
    const doubled = error * 2
    if (doubled > -deltaY) {
      error -= deltaY
      x += stepX
    }
    if (doubled < deltaX) {
      error += deltaX
      y += stepY
    }
  }
  return cells
}
