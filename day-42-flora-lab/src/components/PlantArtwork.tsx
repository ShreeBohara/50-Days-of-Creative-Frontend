import { forwardRef, memo, useMemo, type CSSProperties } from 'react'
import type { BloomForm, LeafShape, PlantGenomeV1 } from '../domain/genome'
import { generatePlantScene } from '../domain/growth'
import { PLANT_PALETTES } from '../domain/palettes'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface PlantArtworkProps {
  genome: PlantGenomeV1
  className?: string
  titleId?: string
}

interface AnimationStyle extends CSSProperties {
  '--order': number
}

const LEAF_PATHS: Record<LeafShape, string> = {
  oval: 'M 0 0 C 11 -28 38 -38 58 -28 C 47 -2 21 8 0 0 Z',
  lance: 'M 0 0 C 17 -19 42 -25 68 -13 C 44 3 21 8 0 0 Z',
  fan: 'M 0 0 C 1 -29 26 -48 52 -42 C 68 -18 44 4 0 0 Z',
}

function Bloom({ form, color, center }: { form: BloomForm; color: string; center: string }) {
  if (form === 'none') return null

  if (form === 'bell') {
    return (
      <>
        <path d="M -15 -3 Q 0 -25 15 -3 L 10 17 Q 0 23 -10 17 Z" fill={color} />
        <path d="M 0 -16 L 0 17" stroke={center} strokeWidth="2" />
      </>
    )
  }

  const petals = form === 'star' ? 5 : 8
  const petalPath = form === 'star'
    ? 'M 0 0 L -5 -24 L 0 -34 L 5 -24 Z'
    : 'M 0 0 C -9 -12 -8 -30 0 -36 C 8 -30 9 -12 0 0 Z'

  return (
    <>
      {Array.from({ length: petals }, (_, index) => (
        <path key={index} d={petalPath} fill={color} transform={`rotate(${index * (360 / petals)})`} />
      ))}
      <circle r={form === 'star' ? 7 : 8.5} fill={center} />
      <circle r="3" fill="#6f4f22" opacity="0.72" />
    </>
  )
}

export const PlantArtwork = memo(forwardRef<SVGSVGElement, PlantArtworkProps>(function PlantArtwork(
  { genome, className, titleId = 'plant-artwork-title' },
  ref,
) {
  const scene = useMemo(() => generatePlantScene(genome), [genome])
  const palette = PLANT_PALETTES[genome.palette]
  const reducedMotion = useReducedMotion()

  return (
    <svg
      ref={ref}
      className={className}
      viewBox="0 0 800 1000"
      role="img"
      aria-labelledby={`${titleId} ${titleId}-description`}
      xmlns="http://www.w3.org/2000/svg"
      data-seed={genome.seed}
      data-dna-version={genome.version}
    >
      <title id={titleId}>Generated botanical specimen {genome.seed}</title>
      <desc id={`${titleId}-description`}>
        A deterministic plant with {scene.branches.length} branches, {scene.leaves.length} leaves,
        and {scene.blooms.length} blooms.
      </desc>
      <defs>
        <filter id={`${titleId}-soft-ink`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.35" result="blur" />
          <feFlood floodColor={palette.stemDark} floodOpacity="0.28" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g className={reducedMotion ? 'plant plant--still' : 'plant'} filter={`url(#${titleId}-soft-ink)`}>
        <g className="plant-branches" fill="none" strokeLinecap="round">
          {scene.branches.map((branch, index) => (
            <path
              key={branch.id}
              className="plant-branch"
              d={branch.path}
              pathLength="1"
              stroke={branch.depth === 0 ? palette.stemDark : palette.stem}
              strokeWidth={branch.width}
              vectorEffect="non-scaling-stroke"
              style={{ '--order': index } as AnimationStyle}
            />
          ))}
        </g>

        <g className="plant-leaves">
          {scene.leaves.map((leaf, index) => (
            <g key={leaf.id} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle})`}>
              <g transform={`scale(${leaf.scale * leaf.side} ${leaf.scale})`}>
                <path
                  className="plant-leaf"
                  d={LEAF_PATHS[genome.foliage.shape]}
                  fill={index % 3 === 0 ? palette.leafLight : palette.leaf}
                  stroke={palette.stemDark}
                  strokeWidth="1.4"
                  vectorEffect="non-scaling-stroke"
                  style={{ '--order': scene.branches.length + index } as AnimationStyle}
                />
                <path
                  d="M 3 -1 C 20 -9 39 -16 55 -25"
                  fill="none"
                  stroke={palette.stemDark}
                  strokeWidth="1"
                  opacity="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            </g>
          ))}
        </g>

        <g className="plant-blooms">
          {scene.blooms.map((bloom, index) => (
            <g key={bloom.id} transform={`translate(${bloom.x} ${bloom.y}) rotate(${bloom.angle}) scale(${bloom.scale})`}>
              <g
                className="plant-bloom"
                style={{ '--order': scene.branches.length + scene.leaves.length + index } as AnimationStyle}
              >
                <Bloom form={genome.bloom.form} color={palette.bloom} center={palette.bloomCenter} />
              </g>
            </g>
          ))}
        </g>
      </g>
    </svg>
  )
}))
