import { useId, type CSSProperties } from 'react'
import type { WindowSpec } from '../domain/compose'
import { hslString } from '../domain/palettes'

interface StageViewProps {
  spec: WindowSpec
  reducedMotion: boolean
  /** bump to replay the illumination reveal */
  drawKey: number
}

const LEAD = '#171221'
const LEAD_FRAME = '#0e0a17'

// The window itself. Panes carry their own reveal delay as a CSS custom
// property; remounting the <g> via drawKey replays the whole illumination.
export default function StageView({ spec, reducedMotion, drawKey }: StageViewProps) {
  const uid = useId()
  const lightId = `${uid}-light`
  const { frame, palette } = spec
  const halo = hslString({ ...palette.feature, l: Math.min(70, palette.feature.l + 10) })

  return (
    <div className="stage" data-testid="stage">
      <div className="stage__halo" style={{ background: `radial-gradient(50% 42% at 50% 44%, ${halo}, transparent 70%)` }} aria-hidden="true" />
      <svg
        className="stage__svg"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={`${spec.title} — a generated ${spec.genome.archetype} stained-glass window in the ${palette.name} palette`}
      >
        <defs>
          <radialGradient id={lightId} cx="50%" cy="38%" r="70%">
            <stop offset="0%" stopColor="rgba(255, 243, 209, 0.5)" />
            <stop offset="42%" stopColor="rgba(255, 243, 209, 0.14)" />
            <stop offset="100%" stopColor="rgba(255, 243, 209, 0)" />
          </radialGradient>
        </defs>

        {/* recess shadow behind the glass */}
        <path d={frame.outline} fill="#060409" />

        <g key={drawKey} className={reducedMotion ? undefined : 'stage__reveal'}>
          {spec.panes.map((pane) => (
            <path
              key={pane.id}
              className="stage__pane"
              d={pane.path}
              fill={pane.fill}
              fillOpacity={0.72 + 0.28 * pane.glow}
              stroke={LEAD}
              strokeWidth={spec.leadWidth}
              strokeLinejoin="round"
              style={{ '--reveal': pane.reveal } as CSSProperties}
            />
          ))}
        </g>

        {/* structural lead: heavier came on the frame lines */}
        {spec.leadPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={LEAD_FRAME}
            strokeWidth={spec.leadWidth * 2.2}
            strokeLinejoin="round"
          />
        ))}

        {/* sunlight passing through, clipped to the glass */}
        <path
          d={frame.outline}
          className={reducedMotion ? 'stage__sun' : 'stage__sun stage__sun--breathing'}
          fill={`url(#${lightId})`}
        />
      </svg>

      <div className="stage__plaque">
        <span className="stage__plaque-title">{spec.title}</span>
        <span className="stage__plaque-sub">
          {palette.name} glass · {spec.panes.length} panes · seed “{spec.genome.seed}”
        </span>
      </div>
    </div>
  )
}
