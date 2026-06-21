import { Dices, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { FLORA_PRESETS } from '../data/presets'
import { normalizeGenome } from '../domain/genome'
import { useFloraStore } from '../store/useFloraStore'

export function CultivationTools() {
  const genome = useFloraStore((state) => state.genome)
  const setGenome = useFloraStore((state) => state.setGenome)
  const randomize = useFloraStore((state) => state.randomize)
  const mutate = useFloraStore((state) => state.mutate)
  const [seed, setSeed] = useState(genome.seed)

  const plantSeed = (event: FormEvent) => {
    event.preventDefault()
    const next = normalizeGenome({ ...genome, seed })
    setSeed(next.seed)
    setGenome(next, `Seed ${next.seed} planted.`)
  }

  const applyPreset = (presetId: string) => {
    const preset = FLORA_PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    setSeed(preset.genome.seed)
    setGenome(preset.genome, `${preset.name} loaded.`)
  }

  return (
    <div className="cultivation-tools">
      <form className="seed-form" onSubmit={plantSeed}>
        <label htmlFor="seed-sequence">Seed sequence</label>
        <div>
          <input id="seed-sequence" value={seed} maxLength={40} onChange={(event) => setSeed(event.target.value)} />
          <button type="submit">Plant</button>
        </div>
      </form>

      <label className="select-control" htmlFor="species-preset">
        <span>Species study</span>
        <select id="species-preset" defaultValue="" onChange={(event) => applyPreset(event.target.value)}>
          <option value="" disabled>Choose a field study</option>
          {FLORA_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>{preset.name}</option>
          ))}
        </select>
      </label>

      <div className="cultivation-actions">
        <button type="button" className="action-button action-button--primary" onClick={() => { randomize(); setSeed(useFloraStore.getState().genome.seed) }}>
          <Dices aria-hidden="true" /> New seed
        </button>
        <button type="button" className="action-button" onClick={() => { mutate(); setSeed(useFloraStore.getState().genome.seed) }}>
          <Sparkles aria-hidden="true" /> Mutate
        </button>
      </div>
    </div>
  )
}
