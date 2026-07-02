import { useEffect, useState } from 'react'
import { BookMarked, Church, Dices, FlaskConical, Gem, KeyRound, LibraryBig } from 'lucide-react'
import { ARCHETYPES, MEDALLIONS, SYMMETRY_OPTIONS, TRACERY_STYLES } from '../domain/genome'
import { PALETTE_LIST } from '../domain/palettes'
import { useStudioStore } from '../store/useStudioStore'
import BlendLab from './BlendLab'
import CollectionPanel from './CollectionPanel'
import IconButton from './IconButton'
import Panel from './Panel'
import PresetGallery from './PresetGallery'
import RangeControl from './RangeControl'
import SelectControl from './SelectControl'

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function SeedField() {
  const seed = useStudioStore((s) => s.genome.seed)
  const setSeed = useStudioStore((s) => s.setSeed)
  const reseed = useStudioStore((s) => s.reseed)
  const [draft, setDraft] = useState(seed)

  useEffect(() => setDraft(seed), [seed])

  return (
    <div className="seed">
      <label className="field__label" htmlFor="seed-input">
        Seed
      </label>
      <div className="seed__row">
        <input
          id="seed-input"
          className="seed__input"
          type="text"
          value={draft}
          maxLength={48}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setSeed(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setSeed(draft)
          }}
        />
        <IconButton label="Cast a new seed" onClick={reseed}>
          <Dices size={16} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}

export default function ControlRail() {
  const genome = useStudioStore((s) => s.genome)
  const setGene = useStudioStore((s) => s.setGene)
  const setChoice = useStudioStore((s) => s.setChoice)

  return (
    <aside className="rail" aria-label="Window controls">
      <Panel title="Architecture" icon={<Church size={15} strokeWidth={1.8} aria-hidden="true" />}>
        <SelectControl
          label="Archetype"
          value={genome.archetype}
          options={ARCHETYPES.map((a) => ({ value: a, label: label(a) }))}
          onChange={(v) => setChoice({ archetype: v as (typeof ARCHETYPES)[number] })}
        />
        <SelectControl
          label="Symmetry"
          value={String(genome.symmetry)}
          options={SYMMETRY_OPTIONS.map((s) => ({ value: String(s), label: `${s}-fold` }))}
          onChange={(v) => setChoice({ symmetry: Number(v) })}
        />
        <RangeControl
          label="Rings"
          value={genome.rings}
          min={2}
          max={6}
          step={1}
          format={(v) => String(v)}
          onChange={(v) => setGene('rings', v, 'rings')}
        />
        <RangeControl
          label="Density"
          value={genome.density}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setGene('density', v, 'density')}
        />
        <SelectControl
          label="Medallion"
          value={genome.medallion}
          options={MEDALLIONS.map((m) => ({ value: m, label: label(m) }))}
          onChange={(v) => setChoice({ medallion: v as (typeof MEDALLIONS)[number] })}
        />
      </Panel>

      <Panel title="Glasswork" icon={<Gem size={15} strokeWidth={1.8} aria-hidden="true" />}>
        <SelectControl
          label="Palette"
          value={genome.paletteId}
          options={PALETTE_LIST.map((p) => ({ value: p.id, label: p.name }))}
          onChange={(v) => setChoice({ paletteId: v as (typeof PALETTE_LIST)[number]['id'] })}
        />
        <SelectControl
          label="Tracery"
          value={genome.traceryStyle}
          options={TRACERY_STYLES.map((t) => ({ value: t, label: label(t) }))}
          onChange={(v) => setChoice({ traceryStyle: v as (typeof TRACERY_STYLES)[number] })}
        />
        <RangeControl
          label="Lead came"
          value={genome.leadWidth}
          min={1}
          max={6}
          step={0.5}
          format={(v) => v.toFixed(1)}
          onChange={(v) => setGene('leadWidth', v, 'lead')}
        />
        <RangeControl
          label="Glass jitter"
          value={genome.jitter}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => setGene('jitter', v, 'jitter')}
        />
      </Panel>

      <Panel title="Provenance" icon={<KeyRound size={15} strokeWidth={1.8} aria-hidden="true" />}>
        <SeedField />
      </Panel>

      <Panel title="The Canon" icon={<LibraryBig size={15} strokeWidth={1.8} aria-hidden="true" />}>
        <PresetGallery />
      </Panel>

      <Panel title="Blend Lab" icon={<FlaskConical size={15} strokeWidth={1.8} aria-hidden="true" />} defaultOpen={false}>
        <BlendLab />
      </Panel>

      <Panel title="Reliquary" icon={<BookMarked size={15} strokeWidth={1.8} aria-hidden="true" />} defaultOpen={false}>
        <CollectionPanel />
      </Panel>
    </aside>
  )
}
