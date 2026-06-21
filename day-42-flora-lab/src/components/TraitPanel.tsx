import { ChevronDown } from 'lucide-react'
import {
  BLOOM_FORMS,
  LEAF_ARRANGEMENTS,
  LEAF_SHAPES,
  PALETTES,
  SYMMETRIES,
} from '../domain/genome'
import { PLANT_PALETTES } from '../domain/palettes'
import { useFloraStore } from '../store/useFloraStore'
import { RangeControl } from './RangeControl'
import { SelectControl } from './SelectControl'

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const options = <Value extends string>(values: readonly Value[]) =>
  values.map((value) => ({ value, label: titleCase(value) }))

export function TraitPanel() {
  const genome = useFloraStore((state) => state.genome)
  const setArchitecture = useFloraStore((state) => state.setArchitecture)
  const setFoliage = useFloraStore((state) => state.setFoliage)
  const setBloom = useFloraStore((state) => state.setBloom)
  const setPalette = useFloraStore((state) => state.setPalette)

  return (
    <div className="trait-sections">
      <details className="trait-section" open>
        <summary><span>Architecture</span><ChevronDown aria-hidden="true" /></summary>
        <div className="trait-section-body">
          <RangeControl id="branch-depth" label="Branch depth" value={genome.architecture.branchDepth} min={2} max={5} step={1} onChange={(value) => setArchitecture('branchDepth', value)} />
          <RangeControl id="branch-spread" label="Divergence" value={genome.architecture.spread} min={14} max={62} step={1} valueLabel={`${genome.architecture.spread.toFixed(0)}°`} onChange={(value) => setArchitecture('spread', value)} />
          <RangeControl id="curvature" label="Curvature" value={genome.architecture.curvature} min={-0.42} max={0.42} step={0.01} onChange={(value) => setArchitecture('curvature', value)} />
          <RangeControl id="taper" label="Taper" value={genome.architecture.taper} min={0.56} max={0.82} step={0.01} onChange={(value) => setArchitecture('taper', value)} />
          <SelectControl id="symmetry" label="Growth pattern" value={genome.architecture.symmetry} options={options(SYMMETRIES)} onChange={(value) => setArchitecture('symmetry', value)} />
        </div>
      </details>

      <details className="trait-section" open>
        <summary><span>Foliage</span><ChevronDown aria-hidden="true" /></summary>
        <div className="trait-section-body">
          <RangeControl id="leaf-size" label="Leaf scale" value={genome.foliage.size} min={0.45} max={1.5} step={0.01} onChange={(value) => setFoliage('size', value)} />
          <RangeControl id="leaf-density" label="Leaf density" value={genome.foliage.density} min={0.18} max={1} step={0.01} valueLabel={`${Math.round(genome.foliage.density * 100)}%`} onChange={(value) => setFoliage('density', value)} />
          <SelectControl id="leaf-shape" label="Leaf shape" value={genome.foliage.shape} options={options(LEAF_SHAPES)} onChange={(value) => setFoliage('shape', value)} />
          <SelectControl id="leaf-arrangement" label="Arrangement" value={genome.foliage.arrangement} options={options(LEAF_ARRANGEMENTS)} onChange={(value) => setFoliage('arrangement', value)} />
        </div>
      </details>

      <details className="trait-section" open>
        <summary><span>Bloom & pigment</span><ChevronDown aria-hidden="true" /></summary>
        <div className="trait-section-body">
          <RangeControl id="bloom-density" label="Bloom density" value={genome.bloom.density} min={0} max={0.72} step={0.01} valueLabel={`${Math.round(genome.bloom.density * 100)}%`} onChange={(value) => setBloom('density', value)} />
          <RangeControl id="bloom-scale" label="Bloom scale" value={genome.bloom.scale} min={0.5} max={1.45} step={0.01} onChange={(value) => setBloom('scale', value)} />
          <SelectControl id="bloom-form" label="Bloom form" value={genome.bloom.form} options={options(BLOOM_FORMS)} onChange={(value) => setBloom('form', value)} />
          <SelectControl
            id="palette"
            label="Pigment study"
            value={genome.palette}
            options={PALETTES.map((value) => ({ value, label: PLANT_PALETTES[value].label }))}
            onChange={setPalette}
          />
        </div>
      </details>
      <p className="shortcut-note"><kbd>R</kbd> new seed · <kbd>M</kbd> mutate · <kbd>⌘Z</kbd> undo</p>
    </div>
  )
}
