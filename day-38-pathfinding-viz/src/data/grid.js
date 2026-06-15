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

