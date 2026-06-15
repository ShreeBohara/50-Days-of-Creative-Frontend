import { CELL, cellIndex, cellKey, isEndpoint } from './grid'

export const MAZE_TYPES = [
  { id: 'random', label: 'Random walls' },
  { id: 'division', label: 'Recursive division' },
  { id: 'backtracker', label: 'Recursive backtracker' },
  { id: 'spiral', label: 'Spiral pattern' },
]

function withCells(terrain, fill = CELL.EMPTY) {
  return { ...terrain, cells: Array(terrain.cols * terrain.rows).fill(fill) }
}

function setCell(terrain, x, y, type) {
  if (x < 0 || y < 0 || x >= terrain.cols || y >= terrain.rows) return
  if (isEndpoint(terrain, x, y) && type !== CELL.EMPTY) return
  terrain.cells[cellIndex(x, y, terrain.cols)] = type
}

function neighbors(terrain, point) {
  return [[1, 0], [0, 1], [-1, 0], [0, -1]]
    .map(([deltaX, deltaY]) => ({ x: point.x + deltaX, y: point.y + deltaY }))
    .filter(({ x, y }) => x >= 0 && y >= 0 && x < terrain.cols && y < terrain.rows)
}

function isReachable(terrain) {
  const queue = [terrain.start]
  const seen = new Set([cellKey(terrain.start.x, terrain.start.y)])
  while (queue.length) {
    const current = queue.shift()
    if (current.x === terrain.end.x && current.y === terrain.end.y) return true
    for (const neighbor of neighbors(terrain, current)) {
      const key = cellKey(neighbor.x, neighbor.y)
      if (seen.has(key) || terrain.cells[cellIndex(neighbor.x, neighbor.y, terrain.cols)] === CELL.WALL) continue
      seen.add(key)
      queue.push(neighbor)
    }
  }
  return false
}

function carveDirectRoute(terrain) {
  let { x, y } = terrain.start
  while (x !== terrain.end.x) {
    x += Math.sign(terrain.end.x - x)
    setCell(terrain, x, y, CELL.EMPTY)
  }
  while (y !== terrain.end.y) {
    y += Math.sign(terrain.end.y - y)
    setCell(terrain, x, y, CELL.EMPTY)
  }
}

function protectEndpoints(terrain) {
  for (const endpoint of [terrain.start, terrain.end]) {
    setCell(terrain, endpoint.x, endpoint.y, CELL.EMPTY)
    neighbors(terrain, endpoint).forEach(({ x, y }) => setCell(terrain, x, y, CELL.EMPTY))
  }
  if (!isReachable(terrain)) carveDirectRoute(terrain)
  return terrain
}

function randomWalls(source, random) {
  const terrain = withCells(source)
  for (let y = 0; y < terrain.rows; y += 1) {
    for (let x = 0; x < terrain.cols; x += 1) {
      if (random() < 0.3) setCell(terrain, x, y, CELL.WALL)
    }
  }
  return protectEndpoints(terrain)
}

function recursiveDivision(source, random) {
  const terrain = withCells(source)

  const divide = (left, top, right, bottom, horizontal) => {
    const width = right - left
    const height = bottom - top
    if (width < 3 || height < 3) return

    if (horizontal) {
      const possibleWalls = []
      for (let y = top + 1; y < bottom; y += 2) possibleWalls.push(y)
      if (!possibleWalls.length) return
      const wallY = possibleWalls[Math.floor(random() * possibleWalls.length)]
      const gapX = left + Math.floor(random() * (width + 1))
      for (let x = left; x <= right; x += 1) {
        if (x !== gapX) setCell(terrain, x, wallY, CELL.WALL)
      }
      divide(left, top, right, wallY - 1, false)
      divide(left, wallY + 1, right, bottom, false)
    } else {
      const possibleWalls = []
      for (let x = left + 1; x < right; x += 2) possibleWalls.push(x)
      if (!possibleWalls.length) return
      const wallX = possibleWalls[Math.floor(random() * possibleWalls.length)]
      const gapY = top + Math.floor(random() * (height + 1))
      for (let y = top; y <= bottom; y += 1) {
        if (y !== gapY) setCell(terrain, wallX, y, CELL.WALL)
      }
      divide(left, top, wallX - 1, bottom, true)
      divide(wallX + 1, top, right, bottom, true)
    }
  }

  divide(0, 0, terrain.cols - 1, terrain.rows - 1, terrain.cols < terrain.rows)
  return protectEndpoints(terrain)
}

function recursiveBacktracker(source, random) {
  const terrain = withCells(source, CELL.WALL)
  const start = { x: 1, y: 1 }
  const stack = [start]
  setCell(terrain, start.x, start.y, CELL.EMPTY)

  while (stack.length) {
    const current = stack.at(-1)
    const candidates = [[2, 0], [0, 2], [-2, 0], [0, -2]]
      .map(([deltaX, deltaY]) => ({ x: current.x + deltaX, y: current.y + deltaY }))
      .filter(({ x, y }) => (
        x > 0 && y > 0 && x < terrain.cols - 1 && y < terrain.rows - 1 &&
        terrain.cells[cellIndex(x, y, terrain.cols)] === CELL.WALL
      ))

    if (!candidates.length) {
      stack.pop()
      continue
    }

    const next = candidates[Math.floor(random() * candidates.length)]
    setCell(terrain, current.x + ((next.x - current.x) / 2), current.y + ((next.y - current.y) / 2), CELL.EMPTY)
    setCell(terrain, next.x, next.y, CELL.EMPTY)
    stack.push(next)
  }
  return protectEndpoints(terrain)
}

function spiral(source) {
  const terrain = withCells(source)
  let left = 1
  let top = 1
  let right = terrain.cols - 2
  let bottom = terrain.rows - 2

  while (left < right && top < bottom) {
    for (let x = left; x <= right; x += 1) setCell(terrain, x, top, CELL.WALL)
    for (let y = top; y <= bottom; y += 1) setCell(terrain, right, y, CELL.WALL)
    for (let x = right; x >= left; x -= 1) setCell(terrain, x, bottom, CELL.WALL)
    for (let y = bottom; y > top + 1; y -= 1) setCell(terrain, left, y, CELL.WALL)
    setCell(terrain, left, top + 2, CELL.EMPTY)
    left += 3
    top += 2
    right -= 2
    bottom -= 2
  }
  return protectEndpoints(terrain)
}

export function generateMaze(terrain, type, random = Math.random) {
  if (type === 'division') return recursiveDivision(terrain, random)
  if (type === 'backtracker') return recursiveBacktracker(terrain, random)
  if (type === 'spiral') return spiral(terrain)
  return randomWalls(terrain, random)
}
