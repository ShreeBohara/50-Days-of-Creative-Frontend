import { describe, expect, it } from 'vitest'
import { runAlgorithm } from './pathfinding'
import { applyTool, createTerrain } from '../data/grid'

const algorithmIds = [
  'astar-manhattan',
  'astar-euclidean',
  'dijkstra',
  'bfs',
  'dfs',
  'greedy',
]

describe('pathfinding algorithms', () => {
  it.each(algorithmIds)('%s reaches the target on an empty grid', (algorithm) => {
    const result = runAlgorithm(createTerrain(10, 7), algorithm)
    expect(result.found).toBe(true)
    expect(result.path[0]).toEqual({ x: 2, y: 3 })
    expect(result.path.at(-1)).toEqual({ x: 7, y: 3 })
  })

  it.each(algorithmIds)('%s reports an unreachable target', (algorithm) => {
    let terrain = createTerrain(10, 7)
    for (let y = 0; y < terrain.rows; y += 1) {
      terrain = applyTool(terrain, 5, y, 'wall')
    }
    expect(runAlgorithm(terrain, algorithm).found).toBe(false)
  })

  it('weighted algorithms choose a cheaper route around expensive cells', () => {
    let terrain = createTerrain(10, 7)
    for (let x = 3; x < 7; x += 1) {
      terrain = applyTool(terrain, x, 3, 'weight')
    }
    expect(runAlgorithm(terrain, 'dijkstra').cost).toBeLessThan(runAlgorithm(terrain, 'bfs').cost)
    expect(runAlgorithm(terrain, 'astar-manhattan').cost).toBe(runAlgorithm(terrain, 'dijkstra').cost)
  })

  it('handles start equal to end', () => {
    const terrain = createTerrain(10, 7)
    terrain.end = { ...terrain.start }
    const result = runAlgorithm(terrain, 'astar-manhattan')
    expect(result.found).toBe(true)
    expect(result.pathLength).toBe(0)
    expect(result.cost).toBe(0)
  })
})

