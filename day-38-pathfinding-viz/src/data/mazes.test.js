import { describe, expect, it } from 'vitest'
import { runAlgorithm } from '../algorithms/pathfinding'
import { CELL, cellIndex, createTerrain } from './grid'
import { generateMaze, MAZE_TYPES } from './mazes'

describe('maze generators', () => {
  it.each(MAZE_TYPES)('$label preserves dimensions, endpoints, and connectivity', ({ id }) => {
    const source = createTerrain(30, 15)
    const maze = generateMaze(source, id, () => 0.42)
    expect(maze.cols).toBe(30)
    expect(maze.rows).toBe(15)
    expect(maze.cells).toHaveLength(450)
    expect(maze.cells[cellIndex(maze.start.x, maze.start.y, maze.cols)]).toBe(CELL.EMPTY)
    expect(maze.cells[cellIndex(maze.end.x, maze.end.y, maze.cols)]).toBe(CELL.EMPTY)
    expect(maze.cells.every((cell) => Object.values(CELL).includes(cell))).toBe(true)
    expect(runAlgorithm(maze, 'bfs').found).toBe(true)
  })
})

