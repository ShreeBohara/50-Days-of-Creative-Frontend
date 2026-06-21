import { Dices, Sparkles } from 'lucide-react'
import type { FormEvent } from 'react'
import { FLORA_PRESETS } from '../data/presets'
import { normalizeGenome } from '../domain/genome'
import { useFloraStore } from '../store/useFloraStore'

export function CultivationTools() {
  const genome = useFloraStore((state) => state.genome)
  const setGenome = useFloraStore((state) => state.setGenome)
  const randomize = useFloraStore((state) => state.randomize)
  const mutate = useFloraStore((state) => state.mutate)

  const plantSeed = (event: FormEvent) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const next = normalizeGenome({ ...genome, seed: new FormData(form).get('seed-sequence') })
    setGenome(next, `Seed ${next.seed} planted.`)
  }

  const applyPreset = (presetId: string) => {
    const preset = FLORA_PRESETS.find((candidate) => candidate.id === presetId)
    if (!preset) return
    setGenome(preset.genome, `${preset.name} loaded.`)
  }

  return (
    <div className="cultivation-tools">
      <form className="seed-form" onSubmit={plantSeed}>
        <label htmlFor="seed-sequence">Seed sequence</label>
        <div>
          <input key={genome.seed} id="seed-sequence" name="seed-sequence" defaultValue={genome.seed} maxLength={40} />
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
        <button type="button" className="action-button action-button--primary" aria-keyshortcuts="R" onClick={randomize}>
          <Dices aria-hidden="true" /> New seed
        </button>
        <button type="button" className="action-button" aria-keyshortcuts="M" onClick={mutate}>
          <Sparkles aria-hidden="true" /> Mutate
        </button>
      </div>
    </div>
  )
}
