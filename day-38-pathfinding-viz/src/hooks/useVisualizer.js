import { useCallback, useEffect, useRef, useState } from 'react'
import { cellKey } from '../data/grid'
import { runAlgorithm } from '../algorithms/pathfinding'

function createState() {
  return {
    status: 'ready',
    visited: new Map(),
    path: new Map(),
    result: null,
    stats: {
      visited: 0,
      pathLength: 0,
      cost: 0,
      computationMs: 0,
    },
  }
}

function wait(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay))
}

export function useVisualizer(terrain, algorithm, speed) {
  const [state, setState] = useState(createState)
  const tokenRef = useRef(0)
  const isRunning = state.status === 'exploring' || state.status === 'tracing'

  const reset = useCallback(() => {
    tokenRef.current += 1
    setState(createState())
  }, [])

  const cancel = useCallback(() => {
    tokenRef.current += 1
    setState((current) => isRunning
      ? { ...current, status: 'cancelled' }
      : current)
  }, [isRunning])

  const start = useCallback(async () => {
    tokenRef.current += 1
    const token = tokenRef.current
    const result = runAlgorithm(terrain, algorithm)
    const computationMs = result.computationMs

    setState({
      ...createState(),
      status: 'exploring',
      result,
      stats: { visited: 0, pathLength: 0, cost: 0, computationMs },
    })

    if (speed === 0) {
      const visited = new Map(result.visited.map((point, index) => [cellKey(point.x, point.y), index]))
      setState((current) => ({
        ...current,
        status: 'tracing',
        visited,
        stats: { ...current.stats, visited: result.visited.length },
      }))
    } else {
      const visited = new Map()
      for (let index = 0; index < result.visited.length; index += 1) {
        if (tokenRef.current !== token) return
        const point = result.visited[index]
        visited.set(cellKey(point.x, point.y), index)
        setState((current) => ({
          ...current,
          visited: new Map(visited),
          stats: { ...current.stats, visited: index + 1 },
        }))
        await wait(speed)
      }
      if (tokenRef.current !== token) return
      setState((current) => ({ ...current, status: 'tracing' }))
    }

    if (tokenRef.current !== token) return
    if (!result.found) {
      setState((current) => ({
        ...current,
        status: 'no-path',
        stats: { ...current.stats, visited: result.visited.length },
      }))
      return
    }

    const path = new Map()
    const traceDelay = speed === 0 ? 0 : Math.max(10, Math.round(speed * 1.4))
    for (let index = 0; index < result.path.length; index += 1) {
      if (tokenRef.current !== token) return
      const point = result.path[index]
      path.set(cellKey(point.x, point.y), index)
      setState((current) => ({
        ...current,
        path: new Map(path),
        stats: {
          ...current.stats,
          pathLength: Math.min(index, result.pathLength),
          cost: index === result.path.length - 1 ? result.cost : current.stats.cost,
        },
      }))
      if (traceDelay) await wait(traceDelay)
    }

    if (tokenRef.current !== token) return
    setState((current) => ({
      ...current,
      status: 'complete',
      stats: {
        visited: result.visited.length,
        pathLength: result.pathLength,
        cost: result.cost,
        computationMs,
      },
    }))
  }, [algorithm, speed, terrain])

  useEffect(() => () => {
    tokenRef.current += 1
  }, [])

  return {
    ...state,
    isRunning,
    cancel,
    reset,
    start,
  }
}
