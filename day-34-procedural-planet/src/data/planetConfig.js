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
