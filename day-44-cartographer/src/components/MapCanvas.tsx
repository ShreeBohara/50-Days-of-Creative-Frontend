import { useMemo } from 'react'
import { polylineToPath, traceContours, type Polyline } from '../domain/coastline'
import type { WorldMap } from '../domain/compose'
import type { Label } from '../domain/names'
import type { Palette } from '../domain/palettes'
import { renderBiomeRaster } from '../utils/raster'

export interface ViewOptions {
  contours: boolean
  rivers: boolean
  labels: boolean
  graticule: boolean
}

interface MapCanvasProps {
  map: WorldMap
  palette: Palette
  view: ViewOptions
  reducedMotion: boolean
  drawKey: number
}

const SIZE = 1000

/** Smooth a grid-space polyline into a quadratic SVG path (for rivers). */
function smoothPath(line: Polyline, scale: number): string {
  if (line.length < 2) return ''
  const px = (n: number) => +(n * scale).toFixed(1)
  let d = `M${px(line[0].x)} ${px(line[0].y)}`
  for (let i = 1; i < line.length - 1; i++) {
    const cx = px(line[i].x)
    const cy = px(line[i].y)
    const mx = +((px(line[i].x) + px(line[i + 1].x)) / 2).toFixed(1)
    const my = +((px(line[i].y) + px(line[i + 1].y)) / 2).toFixed(1)
    d += `Q${cx} ${cy} ${mx} ${my}`
  }
  const last = line[line.length - 1]
  d += `L${px(last.x)} ${px(last.y)}`
  return d
}

function joinPaths(lines: Polyline[], scale: number, close = false): string {
  return lines.map((l) => polylineToPath(l, scale, close)).join('')
}

export default function MapCanvas({ map, palette, view, reducedMotion, drawKey }: MapCanvasProps) {
  const scale = SIZE / map.size

  const raster = useMemo(() => renderBiomeRaster(map, palette), [map, palette])

  const coastD = useMemo(() => joinPaths(map.coastline, scale, true), [map.coastline, scale])

  const bathyD = useMemo(() => {
    const sl = map.params.seaLevel
    return [sl * 0.86, sl * 0.66]
      .map((t) => joinPaths(traceContours(map.field.data, map.size, t), scale))
      .join('')
  }, [map, scale])

  const contourD = useMemo(
    () => map.contours.map((c) => joinPaths(c.polylines, scale)).join('|'),
    [map.contours, scale],
  ).split('|')

  const riverPaths = useMemo(
    () => map.rivers.map((r) => smoothPath(r, scale)),
    [map.rivers, scale],
  )

  const grat = []
  for (let i = 1; i < 8; i++) grat.push((i / 8) * SIZE)

  return (
    <svg
      id="meridian-chart"
      className="map-svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Chart of ${map.title}`}
    >
      <defs>
        <radialGradient id="plate-vignette" cx="50%" cy="42%" r="72%">
          <stop offset="60%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#3a2c1a" stopOpacity="0.22" />
        </radialGradient>
        <pattern id="paper-grain" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" stroke="#3a2c1a" strokeWidth="0.5" strokeOpacity="0.05" />
        </pattern>
      </defs>

      {/* painted hypsometric base */}
      <rect width={SIZE} height={SIZE} fill={palette.ocean} />
      {raster && (
        <image href={raster} x="0" y="0" width={SIZE} height={SIZE} preserveAspectRatio="none" />
      )}
      <rect width={SIZE} height={SIZE} fill="url(#paper-grain)" />

      {/* bathymetric soundings around the coast */}
      <path d={bathyD} fill="none" stroke={palette.river} strokeWidth="0.8" strokeOpacity="0.3" />

      {/* graticule */}
      {view.graticule && (
        <g stroke={palette.graticule} strokeWidth="0.8">
          {grat.map((p) => (
            <line key={`v${p}`} x1={p} y1="0" x2={p} y2={SIZE} />
          ))}
          {grat.map((p) => (
            <line key={`h${p}`} x1="0" y1={p} x2={SIZE} y2={p} />
          ))}
        </g>
      )}

      {/* elevation contour lines */}
      {view.contours && (
        <g fill="none" stroke={palette.contour} strokeWidth="0.85" strokeOpacity="0.7">
          {contourD.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}

      {/* coastline — soft halo then crisp ink, with a draw-in animation */}
      <g key={drawKey}>
        <path d={coastD} fill="none" stroke={palette.ink} strokeOpacity="0.18" strokeWidth="5" />
        <path
          className={reducedMotion ? undefined : 'coast-draw'}
          d={coastD}
          fill="none"
          stroke={palette.ink}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>

      {/* rivers */}
      {view.rivers && (
        <g fill="none" stroke={palette.river} strokeLinecap="round" strokeLinejoin="round">
          {riverPaths.map((d, i) => (
            <path key={i} d={d} strokeWidth="1.7" strokeOpacity="0.85" />
          ))}
        </g>
      )}

      {view.labels && <Labels labels={map.labels} scale={scale} palette={palette} />}

      <Graticule />
      <ScaleBar palette={palette} />
      <CompassRose palette={palette} />
      <Cartouche map={map} palette={palette} />

      {/* frame + aging */}
      <rect width={SIZE} height={SIZE} fill="url(#plate-vignette)" pointerEvents="none" />
      <rect x="6" y="6" width={SIZE - 12} height={SIZE - 12} fill="none" stroke={palette.ink} strokeWidth="2.5" />
      <rect x="14" y="14" width={SIZE - 28} height={SIZE - 28} fill="none" stroke={palette.ink} strokeWidth="0.8" />
    </svg>
  )
}

function Labels({ labels, scale, palette }: { labels: Label[]; scale: number; palette: Palette }) {
  return (
    <g style={{ paintOrder: 'stroke' }} stroke="#f4eeda" strokeWidth="2.4" strokeLinejoin="round">
      {labels.map((l, i) => {
        const x = l.gx * scale
        const y = l.gy * scale
        const water = l.kind === 'bay'
        const isPeak = l.kind === 'peak'
        const isTown = l.kind === 'town'
        const anchor = x > SIZE * 0.82 ? 'end' : x < SIZE * 0.18 ? 'start' : 'middle'
        const dx = anchor === 'end' ? -8 : anchor === 'start' ? 8 : 0
        return (
          <g key={i}>
            {isTown && <circle cx={x} cy={y} r="3.1" fill={palette.ink} stroke="#f4eeda" strokeWidth="1.4" />}
            {isPeak && (
              <path d={`M${x - 5} ${y + 4}L${x} ${y - 5}L${x + 5} ${y + 4}Z`} fill={palette.ink} stroke="#f4eeda" strokeWidth="1.2" />
            )}
            <text
              x={x + dx}
              y={isPeak || isTown ? y - 9 : y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={palette.ink}
              fontFamily={isPeak ? "'Cormorant Garamond', serif" : "'Libre Baskerville', serif"}
              fontStyle={water || l.kind === 'cape' ? 'italic' : 'normal'}
              fontSize={isPeak ? 21 : 14}
              fontWeight={isPeak ? 600 : 400}
              letterSpacing={isPeak ? '0.06em' : '0.01em'}
            >
              {l.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function Graticule() {
  // small corner tick numbers for an antique surveyed feel
  const ticks = [2, 4, 6]
  return (
    <g fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill="#3a2c1a" fillOpacity="0.5">
      {ticks.map((t) => (
        <text key={`t${t}`} x={(t / 8) * SIZE + 3} y="26" textAnchor="middle">
          {t * 15}°
        </text>
      ))}
    </g>
  )
}

function ScaleBar({ palette }: { palette: Palette }) {
  const x = 40
  const y = SIZE - 46
  const w = 150
  return (
    <g>
      <rect x={x} y={y} width={w / 2} height="7" fill={palette.ink} />
      <rect x={x + w / 2} y={y} width={w / 2} height="7" fill="none" stroke={palette.ink} strokeWidth="1" />
      <rect x={x} y={y} width={w} height="7" fill="none" stroke={palette.ink} strokeWidth="1" />
      <text x={x} y={y + 22} fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill={palette.ink}>
        0
      </text>
      <text x={x + w} y={y + 22} fontFamily="'IBM Plex Mono', monospace" fontSize="11" fill={palette.ink} textAnchor="end">
        100 lœ
      </text>
    </g>
  )
}

function CompassRose({ palette }: { palette: Palette }) {
  const cx = SIZE - 116
  const cy = SIZE - 116
  const R = 60
  const r = 16
  const pt = (ang: number, rad: number) => {
    const a = (ang - 90) * (Math.PI / 180)
    return `${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`
  }
  return (
    <g stroke={palette.ink} fill="none" strokeWidth="1">
      <circle cx={cx} cy={cy} r={R} />
      <circle cx={cx} cy={cy} r={R * 0.7} strokeWidth="0.6" />
      {/* cardinal long points */}
      {[0, 90, 180, 270].map((a) => (
        <path
          key={`c${a}`}
          d={`M${pt(a, R)}L${pt(a + 12, r)}L${pt(a, r * 0.4)}L${pt(a - 12, r)}Z`}
          fill={a === 0 ? palette.contour : '#f4eeda'}
        />
      ))}
      {/* intercardinal short points */}
      {[45, 135, 225, 315].map((a) => (
        <path key={`i${a}`} d={`M${pt(a, R * 0.62)}L${pt(a + 10, r * 0.8)}L${pt(a - 10, r * 0.8)}Z`} fill={palette.ink} />
      ))}
      <text
        x={cx}
        y={cy - R - 7}
        textAnchor="middle"
        stroke="none"
        fill={palette.ink}
        fontFamily="'Cormorant Garamond', serif"
        fontSize="22"
        fontWeight="600"
      >
        N
      </text>
    </g>
  )
}

function Cartouche({ map, palette }: { map: WorldMap; palette: Palette }) {
  const w = 380
  const h = 92
  return (
    <g transform="translate(40 40)">
      <rect width={w} height={h} fill="#f4eeda" fillOpacity="0.82" stroke={palette.ink} strokeWidth="1.4" />
      <rect x="5" y="5" width={w - 10} height={h - 10} fill="none" stroke={palette.ink} strokeWidth="0.6" />
      <text
        x="22"
        y="44"
        fill={palette.ink}
        fontFamily="'Cormorant Garamond', serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="0.01em"
      >
        {map.title}
      </text>
      <text
        x="22"
        y="70"
        fill={palette.ink}
        fillOpacity="0.78"
        fontFamily="'IBM Plex Mono', monospace"
        fontSize="11.5"
        letterSpacing="0.08em"
      >
        SURVEYED BY MERIDIAN · {map.params.seed.toUpperCase()}
      </text>
    </g>
  )
}
