import { CELL, cellIndex, cellKey } from '../data/grid'

export const ALGORITHMS = [
  { id: 'astar-manhattan', label: 'A* Manhattan', optimal: true },
  { id: 'astar-euclidean', label: 'A* Euclidean', optimal: true },
  { id: 'dijkstra', label: 'Dijkstra', optimal: true },
  { id: 'bfs', label: 'Breadth-First Search', optimal: true },
  { id: 'dfs', label: 'Depth-First Search', optimal: false },
  { id: 'greedy', label: 'Greedy Best-First', optimal: false },
]

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]

function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now()
}

function heuristic(point, end, type) {
  const deltaX = Math.abs(point.x - end.x)
  const deltaY = Math.abs(point.y - end.y)
  return type === 'euclidean'
    ? Math.sqrt((deltaX * deltaX) + (deltaY * deltaY))
    : deltaX + deltaY
}

function getNeighbors(terrain, point) {
  const neighbors = []
  for (const [deltaX, deltaY] of DIRECTIONS) {
    const x = point.x + deltaX
    const y = point.y + deltaY
    if (x < 0 || y < 0 || x >= terrain.cols || y >= terrain.rows) continue
    if (terrain.cells[cellIndex(x, y, terrain.cols)] === CELL.WALL) continue
    neighbors.push({ x, y })
  }
  return neighbors
}

function movementCost(terrain, point) {
  return terrain.cells[cellIndex(point.x, point.y, terrain.cols)] === CELL.WEIGHT ? 5 : 1
}

function reconstructPath(cameFrom, end) {
  const path = [end]
  let currentKey = cellKey(end.x, end.y)
  while (cameFrom.has(currentKey)) {
    const previous = cameFrom.get(currentKey)
    path.unshift(previous)
    currentKey = cellKey(previous.x, previous.y)
  }
  return path
}

function calculatePathCost(terrain, path) {
  return path.slice(1).reduce((total, point) => total + movementCost(terrain, point), 0)
}

function finishResult(terrain, visited, cameFrom, found, startedAt) {
  const path = found ? reconstructPath(cameFrom, terrain.end) : []
  return {
    found,
    visited,
    path,
    pathLength: Math.max(0, path.length - 1),
    cost: calculatePathCost(terrain, path),
    computationMs: Math.max(0, now() - startedAt),
  }
}

function runUnweighted(terrain, mode) {
  const startedAt = now()
  const frontier = [terrain.start]
  const seen = new Set([cellKey(terrain.start.x, terrain.start.y)])
  const cameFrom = new Map()
  const visited = []

  while (frontier.length) {
    const current = mode === 'dfs' ? frontier.pop() : frontier.shift()
    visited.push(current)
    if (current.x === terrain.end.x && current.y === terrain.end.y) {
      return finishResult(terrain, visited, cameFrom, true, startedAt)
    }

    const neighbors = getNeighbors(terrain, current)
    if (mode === 'dfs') neighbors.reverse()
    for (const neighbor of neighbors) {
      const key = cellKey(neighbor.x, neighbor.y)
      if (seen.has(key)) continue
      seen.add(key)
      cameFrom.set(key, current)
      frontier.push(neighbor)
    }
  }

  return finishResult(terrain, visited, cameFrom, false, startedAt)
}

function popLowest(frontier) {
  let lowestIndex = 0
  for (let index = 1; index < frontier.length; index += 1) {
    if (frontier[index].priority < frontier[lowestIndex].priority) {
      lowestIndex = index
    }
  }
  return frontier.splice(lowestIndex, 1)[0].point
}

function runPrioritySearch(terrain, algorithm) {
  const startedAt = now()
  const frontier = [{ point: terrain.start, priority: 0 }]
  const cameFrom = new Map()
  const bestCost = new Map([[cellKey(terrain.start.x, terrain.start.y), 0]])
  const closed = new Set()
  const visited = []

  while (frontier.length) {
    const current = popLowest(frontier)
    const currentKey = cellKey(current.x, current.y)
    if (closed.has(currentKey)) continue
    closed.add(currentKey)
    visited.push(current)

    if (current.x === terrain.end.x && current.y === terrain.end.y) {
      return finishResult(terrain, visited, cameFrom, true, startedAt)
    }

    for (const neighbor of getNeighbors(terrain, current)) {
      const key = cellKey(neighbor.x, neighbor.y)
      if (closed.has(key)) continue
      const nextCost = (bestCost.get(currentKey) ?? 0) + movementCost(terrain, neighbor)
      const previousCost = bestCost.get(key)
      if (previousCost !== undefined && nextCost >= previousCost) continue
      bestCost.set(key, nextCost)
      cameFrom.set(key, current)

      let priority = nextCost
      if (algorithm === 'astar-manhattan') {
        priority += heuristic(neighbor, terrain.end, 'manhattan')
      } else if (algorithm === 'astar-euclidean') {
        priority += heuristic(neighbor, terrain.end, 'euclidean')
      } else if (algorithm === 'greedy') {
        priority = heuristic(neighbor, terrain.end, 'manhattan')
      }
      frontier.push({ point: neighbor, priority })
    }
  }

  return finishResult(terrain, visited, cameFrom, false, startedAt)
}

export function runAlgorithm(terrain, algorithm) {
  if (algorithm === 'bfs' || algorithm === 'dfs') {
    return runUnweighted(terrain, algorithm)
  }
  return runPrioritySearch(terrain, algorithm)
}

