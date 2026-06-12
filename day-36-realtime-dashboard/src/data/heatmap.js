export const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function createHeatmapData() {
  return HEATMAP_DAYS.flatMap((day, dayIndex) =>
    Array.from({ length: 24 }, (_, hour) => {
      const workdayFactor = dayIndex < 5 ? 16 : -10
      const morningRamp = Math.max(0, 24 - Math.abs(hour - 10) * 5)
      const eveningRamp = Math.max(0, 30 - Math.abs(hour - 19) * 4)
      const overnightDip = hour < 6 ? -18 : 0
      const deterministicNoise = ((dayIndex * 17 + hour * 11) % 19) - 9

      return {
        id: `${day}-${hour}`,
        day,
        dayIndex,
        hour,
        value: Math.round(
          clamp(35 + workdayFactor + morningRamp + eveningRamp + overnightDip + deterministicNoise, 4, 98),
        ),
      }
    }),
  )
}
