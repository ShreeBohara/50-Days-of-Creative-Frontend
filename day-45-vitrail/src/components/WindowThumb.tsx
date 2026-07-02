import { useMemo } from 'react'
import { composeWindow } from '../domain/compose'
import type { WindowGenome } from '../domain/genome'

interface Props {
  genome: WindowGenome
}

// Miniature static render — same compose pipeline as the stage, no
// animation, thinner lead so the tessellation stays legible at 70px.
export default function WindowThumb({ genome }: Props) {
  const spec = useMemo(() => composeWindow(genome), [genome])
  const { frame } = spec

  return (
    <svg className="thumb" viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden="true" focusable="false">
      <path d={frame.outline} fill="#060409" />
      {spec.panes.map((pane) => (
        <path key={pane.id} d={pane.path} fill={pane.fill} stroke="#171221" strokeWidth={spec.leadWidth * 0.8} />
      ))}
    </svg>
  )
}
