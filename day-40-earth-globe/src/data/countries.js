export const countryMetrics = [
  { iso: 'USA', name: 'United States', centroid: { lat: 39.8, lng: -98.6 }, score: 94, gdpIndex: 98, populationIndex: 68 },
  { iso: 'CAN', name: 'Canada', centroid: { lat: 56.1, lng: -106.3 }, score: 71, gdpIndex: 78, populationIndex: 38 },
  { iso: 'BRA', name: 'Brazil', centroid: { lat: -10.8, lng: -52.9 }, score: 69, gdpIndex: 64, populationIndex: 74 },
  { iso: 'GBR', name: 'United Kingdom', centroid: { lat: 55.3, lng: -3.4 }, score: 88, gdpIndex: 89, populationIndex: 52 },
  { iso: 'FRA', name: 'France', centroid: { lat: 46.2, lng: 2.2 }, score: 82, gdpIndex: 84, populationIndex: 51 },
  { iso: 'DEU', name: 'Germany', centroid: { lat: 51.2, lng: 10.4 }, score: 86, gdpIndex: 91, populationIndex: 55 },
  { iso: 'NGA', name: 'Nigeria', centroid: { lat: 9.1, lng: 8.7 }, score: 52, gdpIndex: 43, populationIndex: 77 },
  { iso: 'ZAF', name: 'South Africa', centroid: { lat: -30.6, lng: 22.9 }, score: 57, gdpIndex: 55, populationIndex: 45 },
  { iso: 'ARE', name: 'United Arab Emirates', centroid: { lat: 23.4, lng: 53.8 }, score: 83, gdpIndex: 82, populationIndex: 29 },
  { iso: 'IND', name: 'India', centroid: { lat: 20.6, lng: 78.9 }, score: 78, gdpIndex: 77, populationIndex: 99 },
  { iso: 'CHN', name: 'China', centroid: { lat: 35.9, lng: 104.2 }, score: 87, gdpIndex: 97, populationIndex: 98 },
  { iso: 'JPN', name: 'Japan', centroid: { lat: 36.2, lng: 138.3 }, score: 92, gdpIndex: 93, populationIndex: 61 },
  { iso: 'KOR', name: 'South Korea', centroid: { lat: 36.4, lng: 127.8 }, score: 89, gdpIndex: 84, populationIndex: 47 },
  { iso: 'AUS', name: 'Australia', centroid: { lat: -25.3, lng: 133.8 }, score: 76, gdpIndex: 78, populationIndex: 34 },
  { iso: 'SGP', name: 'Singapore', centroid: { lat: 1.35, lng: 103.8 }, score: 96, gdpIndex: 92, populationIndex: 22 },
]

export const countryByIso = new Map(countryMetrics.map((country) => [country.iso, country]))
