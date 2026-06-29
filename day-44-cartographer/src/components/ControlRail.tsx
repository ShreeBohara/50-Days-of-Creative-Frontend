import { useState } from 'react'
import { Anchor, Compass, GitMerge, Grid3x3, Map, Mountain, RefreshCw, Sparkles, Tag, Waves } from 'lucide-react'
import { LANGUAGES } from '../data/languages'
import { PALETTES } from '../domain/palettes'
import { PARAM_RANGES } from '../domain/world'
import { useStudioStore } from '../store/useStudioStore'
import BlendLab from './BlendLab'
import CollectionPanel from './CollectionPanel'
import IconButton from './IconButton'
import Panel from './Panel'
import PresetGallery from './PresetGallery'
import RangeControl from './RangeControl'
import SelectControl from './SelectControl'

function SeedField() {
  const seed = useStudioStore((s) => s.params.seed)
  const setSeed = useStudioStore((s) => s.setSeed)
  const reseed = useStudioStore((s) => s.reseed)
  const [draft, setDraft] = useState(seed)
  const [prevSeed, setPrevSeed] = useState(seed)

  // Sync the draft when the seed changes elsewhere (reseed / randomize / undo).
  if (seed !== prevSeed) {
    setPrevSeed(seed)
    setDraft(seed)
  }

  const commit = () => {
    const v = draft.trim()
    if (v && v !== seed) setSeed(v)
    else setDraft(seed)
  }

  return (
    <div className="seed-field">
      <label className="field__label" htmlFor="seed-input">
        Seed
      </label>
      <div className="seed-field__row">
        <input
          id="seed-input"
          className="seed-input mono-num"
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        <IconButton label="Roll a new seed" variant="solid" onClick={reseed}>
          <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  )
}

function ViewToggles() {
  const view = useStudioStore((s) => s.view)
  const setView = useStudioStore((s) => s.setView)
  const items = [
    { key: 'contours', label: 'Contours', icon: <Mountain size={16} strokeWidth={1.7} /> },
    { key: 'rivers', label: 'Rivers', icon: <Waves size={16} strokeWidth={1.7} /> },
    { key: 'labels', label: 'Labels', icon: <Tag size={16} strokeWidth={1.7} /> },
    { key: 'graticule', label: 'Grid', icon: <Grid3x3 size={16} strokeWidth={1.7} /> },
  ] as const

  return (
    <div className="toggles">
      {items.map((it) => (
        <IconButton
          key={it.key}
          label={`${view[it.key] ? 'Hide' : 'Show'} ${it.label.toLowerCase()}`}
          active={view[it.key]}
          onClick={() => setView({ [it.key]: !view[it.key] })}
        >
          {it.icon}
        </IconButton>
      ))}
    </div>
  )
}

function PaletteSwatches() {
  const current = useStudioStore((s) => s.params.biomePaletteId)
  const setCategory = useStudioStore((s) => s.setCategory)
  return (
    <div className="swatches">
      {PALETTES.map((p) => (
        <button
          key={p.id}
          type="button"
          className={`swatch ${current === p.id ? 'is-active' : ''}`}
          aria-label={p.name}
          aria-pressed={current === p.id}
          title={p.name}
          onClick={() => setCategory({ biomePaletteId: p.id })}
        >
          <span className="swatch__strip">
            {[1, 3, 5, 7, 8].map((i) => (
              <span key={i} style={{ background: p.biomes[i] }} />
            ))}
          </span>
          <span className="swatch__name">{p.name}</span>
        </button>
      ))}
    </div>
  )
}

export default function ControlRail() {
  const params = useStudioStore((s) => s.params)
  const setGene = useStudioStore((s) => s.setGene)
  const setCategory = useStudioStore((s) => s.setCategory)
  const mutateCurrent = useStudioStore((s) => s.mutateCurrent)

  return (
    <aside className="rail" aria-label="World controls">
      <SeedField />

      <Panel title="Atlases" icon={<Map size={16} strokeWidth={1.7} />}>
        <PresetGallery />
      </Panel>

      <Panel title="Terrain" icon={<Mountain size={16} strokeWidth={1.7} />}>
        <RangeControl
          label="Sea level"
          value={params.seaLevel}
          {...PARAM_RANGES.seaLevel}
          onChange={(v) => setGene('seaLevel', v, 'seaLevel')}
        />
        <RangeControl
          label="Coast relief"
          value={params.relief}
          {...PARAM_RANGES.relief}
          onChange={(v) => setGene('relief', v, 'relief')}
        />
        <RangeControl
          label="Island bias"
          value={params.islandBias}
          {...PARAM_RANGES.islandBias}
          onChange={(v) => setGene('islandBias', v, 'islandBias')}
        />
        <RangeControl
          label="Mountains"
          value={params.mountainBias}
          {...PARAM_RANGES.mountainBias}
          onChange={(v) => setGene('mountainBias', v, 'mountainBias')}
        />
        <RangeControl
          label="Detail"
          value={params.octaves}
          {...PARAM_RANGES.octaves}
          format={(v) => `${v.toFixed(0)} oct`}
          onChange={(v) => setGene('octaves', v, 'octaves')}
        />
        <RangeControl
          label="Roughness"
          value={params.persistence}
          {...PARAM_RANGES.persistence}
          onChange={(v) => setGene('persistence', v, 'persistence')}
        />
      </Panel>

      <Panel title="Features" icon={<Waves size={16} strokeWidth={1.7} />}>
        <RangeControl
          label="Rivers"
          value={params.rivers}
          {...PARAM_RANGES.rivers}
          format={(v) => v.toFixed(0)}
          onChange={(v) => setGene('rivers', v, 'rivers')}
        />
        <RangeControl
          label="Place names"
          value={params.labelDensity}
          {...PARAM_RANGES.labelDensity}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => setGene('labelDensity', v, 'labelDensity')}
        />
        <SelectControl
          label="Naming language"
          value={params.languageId}
          options={LANGUAGES.map((l) => ({ value: l.id, label: l.name }))}
          onChange={(v) => setCategory({ languageId: v })}
        />
        <div className="field">
          <span className="field__label">Layers</span>
          <ViewToggles />
        </div>
      </Panel>

      <Panel title="Palette" icon={<Compass size={16} strokeWidth={1.7} />}>
        <PaletteSwatches />
        <button type="button" className="btn-wide" onClick={() => mutateCurrent()}>
          <Sparkles size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>Mutate this world</span>
        </button>
      </Panel>

      <Panel title="Blend lab" icon={<GitMerge size={16} strokeWidth={1.7} />} defaultOpen={false}>
        <BlendLab />
      </Panel>

      <Panel title="Collection" icon={<Anchor size={16} strokeWidth={1.7} />}>
        <CollectionPanel />
      </Panel>
    </aside>
  )
}
