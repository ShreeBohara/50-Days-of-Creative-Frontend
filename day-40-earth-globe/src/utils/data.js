import { cities, cityById } from '../data/cities'
import { datasetKeys, routeDatasets } from '../data/routes'

export function findCityMatches(query, limit = 6) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []

  return cities
    .filter((city) => {
      const haystack = `${city.name} ${city.country} ${city.region}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
    .slice(0, limit)
}

export function getCityById(id) {
  return cityById.get(id) ?? cities[0]
}

export function getDatasetRoutes(datasetKey) {
  if (!datasetKeys.includes(datasetKey)) return routeDatasets.flightRoutes

  return routeDatasets[datasetKey].filter((route) => cityById.has(route.from) && cityById.has(route.to))
}

export function getCityRoutes(cityId, datasetKey) {
  return getDatasetRoutes(datasetKey).filter((route) => route.from === cityId || route.to === cityId)
}

export function summarizeDataset(datasetKey) {
  const routes = getDatasetRoutes(datasetKey)
  const totalVolume = routes.reduce((sum, route) => sum + route.volume, 0)
  const avgIntensity = routes.reduce((sum, route) => sum + route.intensity, 0) / routes.length

  return {
    routeCount: routes.length,
    totalVolume,
    avgIntensity,
  }
}
