export const DEFAULT_PLANET_SETTINGS = {
  seed: 34.18,
  oceanLevel: 0.48,
  mountainHeight: 0.22,
  cloudDensity: 0.54,
  atmosphereThickness: 0.28,
  rotationSpeed: 0.18,
  sunAzimuth: 42,
  sunElevation: 28,
}

export const PLANET_CONTROLS = [
  { key: 'oceanLevel', label: 'Ocean level', min: 0.28, max: 0.68, step: 0.01, format: 'percent' },
  { key: 'mountainHeight', label: 'Mountain height', min: 0.08, max: 0.42, step: 0.01, format: 'percent' },
  { key: 'cloudDensity', label: 'Cloud density', min: 0.1, max: 0.88, step: 0.01, format: 'percent' },
  {
    key: 'atmosphereThickness',
    label: 'Atmosphere',
    min: 0.05,
    max: 0.6,
    step: 0.01,
    format: 'percent',
  },
  { key: 'rotationSpeed', label: 'Rotation speed', min: 0, max: 0.75, step: 0.01, format: 'speed' },
  { key: 'sunAzimuth', label: 'Sun azimuth', min: 0, max: 360, step: 1, format: 'degrees' },
  { key: 'sunElevation', label: 'Sun elevation', min: -45, max: 72, step: 1, format: 'degrees' },
]

export function sunVectorFromAngles(azimuth, elevation) {
  const azimuthRad = (azimuth * Math.PI) / 180
  const elevationRad = (elevation * Math.PI) / 180
  const radius = Math.cos(elevationRad)

  return [
    Math.sin(azimuthRad) * radius,
    Math.sin(elevationRad),
    Math.cos(azimuthRad) * radius,
  ]
}

export function randomPlanetSettings() {
  const rangeValue = (min, max, decimals = 2) => Number((min + Math.random() * (max - min)).toFixed(decimals))

  return {
    seed: Number(rangeValue(1, 999, 2)),
    oceanLevel: rangeValue(0.34, 0.62),
    mountainHeight: rangeValue(0.12, 0.36),
    cloudDensity: rangeValue(0.22, 0.78),
    atmosphereThickness: rangeValue(0.12, 0.48),
    rotationSpeed: rangeValue(0.08, 0.42),
    sunAzimuth: Math.round(rangeValue(0, 360, 0)),
    sunElevation: Math.round(rangeValue(-18, 62, 0)),
  }
}
