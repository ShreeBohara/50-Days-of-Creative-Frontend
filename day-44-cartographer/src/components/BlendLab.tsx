import { useMemo, useState } from 'react'
import { GitMerge } from 'lucide-react'
import { blendWorlds } from '../domain/blend'
import type { WorldParams } from '../domain/world'
import { useStudioStore } from '../store/useStudioStore'
import RangeControl from './RangeControl'
import SelectControl from './SelectControl'
import WorldThumb from './WorldThumb'

interface Source {
  id: string
  name: string
  params: WorldParams
}

export default function BlendLab() {
  const params = useStudioStore((s) => s.params)
  const collection = useStudioStore((s) => s.collection)
  const loadParams = useStudioStore((s) => s.loadParams)

  const sources: Source[] = useMemo(
    () => [
      { id: 'current', name: 'Current world', params },
      ...collection.map((w) => ({ id: w.id, name: w.name, params: w.params })),
    ],
    [params, collection],
  )

  const [aId, setAId] = useState('current')
  const [bId, setBId] = useState('current')
  const [t, setT] = useState(0.5)

  const A = sources.find((s) => s.id === aId) ?? sources[0]
  const B = sources.find((s) => s.id === bId) ?? sources[0]
  const child = useMemo(() => blendWorlds(A.params, B.params, t), [A, B, t])

  const options = sources.map((s) => ({ value: s.id, label: s.name }))

  return (
    <div className="blend">
      {collection.length === 0 && (
        <p className="blend__hint">
          Save a few worlds first, then crossbreed any two — including the current one.
        </p>
      )}

      <div className="blend__parents">
        <SelectControl label="Parent A" value={aId} options={options} onChange={setAId} />
        <SelectControl label="Parent B" value={bId} options={options} onChange={setBId} />
      </div>

      <div className="blend__triad">
        <div className="blend__cell">
          <WorldThumb params={A.params} size={74} />
          <span className="blend__cell-label">A</span>
        </div>
        <div className="blend__cell blend__cell--child">
          <WorldThumb params={child} size={74} />
          <span className="blend__cell-label">Child</span>
        </div>
        <div className="blend__cell">
          <WorldThumb params={B.params} size={74} />
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

      <button type="button" className="btn-wide" onClick={() => loadParams(child)}>
        <GitMerge size={16} strokeWidth={1.8} aria-hidden="true" />
        <span>Chart the child world</span>
      </button>
    </div>
  )
}
