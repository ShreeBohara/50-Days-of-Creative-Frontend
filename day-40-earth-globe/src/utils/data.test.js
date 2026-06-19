import { describe, expect, it } from 'vitest'
import { findCityMatches, getDatasetRoutes, summarizeDataset } from './data'

describe('data helpers', () => {
  it('finds cities by name, country, or region', () => {
    expect(findCityMatches('tokyo')[0].id).toBe('tokyo')
    expect(findCityMatches('canada')[0].id).toBe('toronto')
    expect(findCityMatches('oceania').map((city) => city.id)).toContain('sydney')
  })

  it('returns route sets and falls back to flight routes', () => {
    expect(getDatasetRoutes('internetTraffic')).toHaveLength(15)
    expect(getDatasetRoutes('missing-key')).toEqual(getDatasetRoutes('flightRoutes'))
  })

  it('summarizes dataset telemetry', () => {
    const summary = summarizeDataset('tradeVolume')
    expect(summary.routeCount).toBe(15)
    expect(summary.totalVolume).toBeGreaterThan(7000)
    expect(summary.avgIntensity).toBeGreaterThan(0.6)
  })
})
