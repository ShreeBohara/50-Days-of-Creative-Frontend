import { useMemo, useState } from 'react'
import { GitMerge } from 'lucide-react'
import { blendParams } from '../domain/blend'
import type { HarmonographParams } from '../domain/harmonograph'
import { useStudioStore } from '../store/useStudioStore'
import FigureThumb from './FigureThumb'
import RangeControl from './RangeControl'
import SelectControl from './SelectControl'

interface Source {
  id: string
  name: string
  params: HarmonographParams
  paletteId: string
}

export default function BlendLab() {
  const params = useStudioStore((s) => s.params)
  const paletteId = useStudioStore((s) => s.paletteId)
  const collection = useStudioStore((s) => s.collection)
  const loadParams = useStudioStore((s) => s.loadParams)
  const setPaletteId = useStudioStore((s) => s.setPaletteId)

  const sources: Source[] = useMemo(
    () => [
      { id: 'current', name: 'Current figure', params, paletteId },
      ...collection.map((f) => ({ id: f.id, name: f.name, params: f.params, paletteId: f.paletteId })),
    ],
    [params, paletteId, collection],
  )

  const [aId, setAId] = useState('current')
  const [bId, setBId] = useState('current')
  const [t, setT] = useState(0.5)

  const A = sources.find((s) => s.id === aId) ?? sources[0]
  const B = sources.find((s) => s.id === bId) ?? sources[0]
  const offspring = useMemo(() => blendParams(A.params, B.params, t), [A, B, t])
  const offspringPalette = t < 0.5 ? A.paletteId : B.paletteId

  const options = sources.map((s) => ({ value: s.id, label: s.name }))

  const send = () => {
    setPaletteId(offspringPalette)
    loadParams(offspring)
  }

  return (
    <div className="blend">
      {collection.length === 0 && (
        <p className="blend__hint">
          Tip: save a few figures first, then crossbreed any two — including the current one.
        </p>
      )}

      <div className="blend__parents">
        <SelectControl label="Parent A" value={aId} options={options} onChange={setAId} />
        <SelectControl label="Parent B" value={bId} options={options} onChange={setBId} />
      </div>

      <div className="blend__triad">
        <div className="blend__cell">
          <FigureThumb params={A.params} paletteId={A.paletteId} />
          <span className="blend__cell-label">A</span>
        </div>
        <div className="blend__cell blend__cell--child">
          <FigureThumb params={offspring} paletteId={offspringPalette} />
          <span className="blend__cell-label">Mix</span>
        </div>
        <div className="blend__cell">
          <FigureThumb params={B.params} paletteId={B.paletteId} />
          <span className="blend__cell-label">B</span>
        </div>
      </div>

      <RangeControl
        label="Mix"
        value={t}
        min={0}
        max={1}
        step={0.01}
        onChange={setT}
        format={(v) => `${Math.round((1 - v) * 100)} / ${Math.round(v * 100)}`}
      />

      <button type="button" className="gen-btn blend__send" onClick={send}>
        <GitMerge size={15} strokeWidth={1.8} />
        Send mix to stage
      </button>
    </div>
  )
}
