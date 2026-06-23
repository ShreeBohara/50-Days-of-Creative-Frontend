// Decorative "instrument bed": fine graph grid, concentric guide rings and a
// crosshair, drawn in SVG user-space so it scales with the figure.

const RINGS = [120, 240, 360, 460]
const GRID_STEP = 50

export default function GridBackdrop() {
  const lines = []
  for (let p = GRID_STEP; p < 1000; p += GRID_STEP) {
    if (p === 500) continue
    lines.push(p)
  }

  return (
    <svg
      className="backdrop"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g className="backdrop__grid">
        {lines.map((p) => (
          <line key={`v${p}`} x1={p} y1="0" x2={p} y2="1000" />
        ))}
        {lines.map((p) => (
          <line key={`h${p}`} x1="0" y1={p} x2="1000" y2={p} />
        ))}
      </g>

      <g className="backdrop__axes">
        <line x1="500" y1="40" x2="500" y2="960" />
        <line x1="40" y1="500" x2="960" y2="500" />
      </g>

      <g className="backdrop__rings">
        {RINGS.map((r) => (
          <circle key={r} cx="500" cy="500" r={r} />
        ))}
      </g>

      <g className="backdrop__ticks">
        <circle cx="500" cy="500" r="3" />
      </g>
    </svg>
  )
}
