import { useMemo, useRef } from 'react'
import type { PlantGenomeV1 } from '../domain/genome'
import { generatePlantScene } from '../domain/growth'
import { PLANT_PALETTES } from '../domain/palettes'
import { PlantArtwork } from './PlantArtwork'
import { ExportToolbar } from './ExportToolbar'

interface SpecimenStageProps {
  genome: PlantGenomeV1
}

function specimenName(seed: string) {
  const name = seed.replace(/^flora-/, '').split('-').filter(Boolean).slice(0, 2).join(' ')
  return `Flora ${name || 'incognita'}`
}

export function SpecimenStage({ genome }: SpecimenStageProps) {
  const scene = useMemo(() => generatePlantScene(genome), [genome])
  const palette = PLANT_PALETTES[genome.palette]
  const artworkRef = useRef<SVGSVGElement>(null)

  return (
    <section className="stage-column" id="specimen-stage" tabIndex={-1}>
      <div className="stage-meta" aria-label="Specimen details">
        <span>Specimen no. {genome.seed.slice(-4).toUpperCase().padStart(4, '0')}</span>
        <span>Living draft</span>
      </div>
      <div className="specimen-frame">
        <div className="registration-mark registration-mark--tl" />
        <div className="registration-mark registration-mark--tr" />
        <div className="registration-mark registration-mark--bl" />
        <div className="registration-mark registration-mark--br" />
        <PlantArtwork ref={artworkRef} key={JSON.stringify(genome)} genome={genome} className="specimen-artwork" />
        <div className="taxonomy-label" aria-hidden="true">
          <span>F.42</span>
          <i />
          <span>{scene.branches.length + scene.leaves.length + scene.blooms.length} genes expressed</span>
        </div>
        <div className="specimen-caption">
          <span className="specimen-name"><i>{specimenName(genome.seed)}</i> / synthetic study</span>
          <span>{palette.label} · SVG</span>
        </div>
      </div>
      <ExportToolbar genome={genome} artworkRef={artworkRef} />
    </section>
  )
}
